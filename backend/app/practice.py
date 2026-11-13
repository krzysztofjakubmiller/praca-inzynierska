import base64
import binascii
import json
import os
import random
from collections.abc import Iterator
from datetime import UTC, datetime
from itertools import chain
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import Session

from app.access import require_password
from app.accounts import current_account
from app.db import get_session
from app.equivalence import KINDS, equivalent, read_latex
from app.grading import (
    DYSCALCULIA_GENERAL_RULES,
    GENERAL_NOTES,
    PROMPT_VERSION,
    GradingUnavailable,
    Reply,
    StreamBroken,
    UnreadableSolution,
    answer_question,
    describe_task,
    grade,
    judge_difficulty,
    show_solution,
)
from app.models import (
    AiRequest,
    Account,
    Exam,
    Profile,
    ReviewCard,
    Solution,
    SourceKind,
    Task,
    Topic,
)
from app.reviews import daily_limit, day_start, exam_start, tomorrow, update_card

router = APIRouter(prefix="/api/practice", dependencies=[Depends(require_password)])

CLOSED_FORMATS = ("wielokrotny-wybor", "prawda-falsz", "dobieranie")

# Zadanie gotowe dla ucznia: sprawdzone w panelu, a otwarte także z zasadami oceniania, bez
# których nie da się go ocenić. Ten sam warunek we wszystkich zapytaniach ucznia i w postępie.
READY_FOR_STUDENT = and_(
    Task.review_status == "sprawdzone",
    or_(Task.answer_format != "otwarte", Task.scoring.is_not(None)),
)


class SolutionIn(BaseModel):
    mode: Literal["cwiczenie", "losowe", "powtorka"]
    # Zadanie zamknięte: zaznaczona odpowiedź.
    answer: str | None = None
    # Zadanie otwarte: wpisane wyniki końcowe, w kolejności wyników z zasad oceniania.
    answers: list[str] | None = None


class GradeIn(BaseModel):
    mode: Literal["cwiczenie", "losowe", "powtorka"]
    answers: list[str] | None = None
    # Złe rozwiązanie, które już jest: kolejna ocena do niego, a liczy się najlepsza.
    solution_id: int | None = None
    # Zdjęcie albo obraz tablicy w base64, bez zapisu na dysku; albo opis rozwiązania tekstem.
    image: str | None = None
    image_type: Literal["image/jpeg", "image/png"] | None = None
    text: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class QuestionIn(BaseModel):
    # Cała rozmowa, bo serwer jej nie przechowuje; ostatnia wiadomość to nowe pytanie ucznia.
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    # Przed sprawdzeniem odpowiedzi AI tylko podpowiada, bez zdradzania wyniku.
    checked: bool
    # Zdjęcie albo obraz tablicy przy ostatniej wiadomości, tylko jako kontekst, bez oceny.
    image: str | None = None
    image_type: Literal["image/jpeg", "image/png"] | None = None
    # Uczeń kliknął, że odczyt obrazu się nie zgadza: od tej chwili rozmowa idzie do
    # mocniejszego modelu. Domyślnie tańszy, bo większość pytań to drobne dopytania.
    strong: bool = False


class FeedbackIn(BaseModel):
    feedback: Literal["zgadzam-sie", "nie-zgadzam-sie", "pomoglo", "nie-pomoglo"]
    comment: str | None = Field(default=None, max_length=2000)


class ReadIn(BaseModel):
    kind: str
    text: str


class DemoAnswer(BaseModel):
    answer: str


class RatingIn(BaseModel):
    rating: Literal["latwy", "sredni", "trudny", "bardzo-trudny"]


def load_task(session: Session, task_id: int) -> Task:
    task = session.scalar(select(Task).where(Task.id == task_id, READY_FOR_STUDENT))
    if task is None:
        raise HTTPException(status_code=404, detail=["Nie ma takiego zadania."])
    return task


# Klucz do tego, co uczeń widział. Przy wariancie z generatora litery mogą się różnić od
# oryginału, więc sprawdzanie zawsze idzie przez tę funkcję, a nie wprost przez task.answer.
def answer_key(task: Task) -> str:
    return task.answer


# Zadanie bez klucza, w postaci do pokazania uczniowi. Tu podstawia się wariant z generatora.
def task_for_student(session: Session, task: Task) -> dict:
    topic = session.get(Topic, task.topic_id)
    shown = {
        "id": task.id,
        "exam": session.get(Exam, task.exam_id).code,
        "topic": topic.code,
        "topic_name": topic.name,
        "source": session.get(SourceKind, task.source_kind_id).name,
        "year": task.year,
        "number": task.number,
        "subnumber": task.subnumber,
        "max_points": task.max_points,
        "content": task.content,
        "answer_format": task.answer_format,
        "choices": task.choices,
        "connector": task.connector,
        "figures": task.figures,
    }
    # Pola na wyniki końcowe, bez wyników z klucza; zasad oceniania uczeń nie widzi wcale.
    if task.answer_format == "otwarte":
        shown["results"] = [
            {key: value for key, value in result.items() if key != "expected"}
            for result in task.scoring["results"]
        ]
    return shown


def scored_points(task: Task, body: SolutionIn) -> int:
    if task.answer_format in CLOSED_FORMATS:
        if not body.answer:
            raise HTTPException(status_code=422, detail=["Zaznacz odpowiedź."])
        # Jak w arkuszu CKE: punkt tylko za całą odpowiedź, także w prawda-fałsz.
        return task.max_points if body.answer == answer_key(task) else 0
    results = task.scoring["results"]
    # Dowód bez oceny AI (uczeń pominął zdjęcie albo AI nie działa) nie dostaje punktów.
    if not results:
        return 0
    if body.answers is None or len(body.answers) != len(results):
        raise HTTPException(status_code=422, detail=["Wpisz wszystkie wyniki."])
    correct = [
        equivalent(given, result["expected"], result["kind"])
        for given, result in zip(body.answers, results)
    ]
    # Podgląd pod polem nie pozwala wysłać nieczytelnego wpisu, więc tu to tylko zabezpieczenie.
    if None in correct:
        raise HTTPException(
            status_code=422, detail=["Nie rozumiem zapisu wyniku. Wpisz go inaczej."]
        )
    # Części z własnymi punktami liczą się osobno; inaczej komplet tylko za wszystkie wyniki.
    if "part" in results[0]:
        return sum(result["points"] for result, ok in zip(results, correct) if ok)
    return task.max_points if all(correct) else 0


@router.get("/tasks/{task_id}", dependencies=[Depends(current_account)])
def get_task(task_id: int, session: Session = Depends(get_session)):
    return task_for_student(session, load_task(session, task_id))


@router.post("/tasks/{task_id}/solution")
def save_solution(
    task_id: int,
    body: SolutionIn,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    task = load_task(session, task_id)
    solution = Solution(
        account_id=account.id,
        task_id=task.id,
        mode=body.mode,
        answer=body.answer if task.answer_format in CLOSED_FORMATS else None,
        points=scored_points(task, body),
        open_answer=(
            {
                "answers": body.answers or [],
                "checked": "program" if task.scoring["results"] else "bez-oceny",
            }
            if task.answer_format == "otwarte"
            else None
        ),
    )
    session.add(solution)
    session.commit()
    return {
        "id": solution.id,
        "points": solution.points,
        "max_points": task.max_points,
        "answer": answer_key(task),
    }


# Dzienny budżet ucznia na AI w dolarach, liczony z kosztu zapisanego przy każdym zapytaniu,
# także oceny trudności w tle, bo też kosztuje. Koszt znamy dopiero po odpowiedzi, więc ostatnie
# zapytanie może budżet trochę przekroczyć. Konta z AI_UNLIMITED_EMAILS (adresy po przecinku
# w zmiennej środowiskowej, bo repozytorium jest publiczne) nie mają limitu.
AI_DAILY_BUDGET = 0.10
AI_UNAVAILABLE = "Usługi AI chwilowo nie działają. Możesz przejść dalej i ocenić trudność zadania."
# Ile wersji tablicy dostaje Dyżurny, gdy przyszła nowa: obecną i poprzednie. W testach na
# rozmowach z poprawianą tablicą więcej wersji nie poprawiło odpowiedzi.
BOARD_VERSIONS = 2


def task_for_ai(session: Session, task_id: int, account: Account) -> Task:
    task = load_task(session, task_id)
    unlimited = os.environ.get("AI_UNLIMITED_EMAILS", "").lower().split(",")
    unlimited = [email.strip() for email in unlimited]
    if account.email.lower() in unlimited:
        return task
    spent = session.scalar(
        select(func.coalesce(func.sum(AiRequest.cost), 0)).where(
            AiRequest.account_id == account.id,
            AiRequest.created_at >= day_start(),
        )
    )
    if spent >= AI_DAILY_BUDGET:
        raise HTTPException(
            status_code=429, detail=["Dzisiejszy limit pytań do AI się skończył. Wróć jutro."]
        )
    return task


def scoring_text(task: Task) -> str:
    scoring = task.scoring["rules"]
    if task.scoring.get("notes"):
        scoring += "\n\nUwagi:\n" + task.scoring["notes"]
    return scoring


def solutions_text(task: Task) -> str:
    return "".join(
        f"\n\nPrzykładowe rozwiązanie CKE ({solution['name']}):\n{solution['content']}"
        for solution in task.solutions or []
    )


def learning_difficulties(session: Session, account: Account) -> str:
    profile = session.get(Profile, account.id)
    return profile.learning_difficulties if profile else "brak"


# Jedyne miejsce, z którego zasady dla specyficznych trudności i dyskalkulii trafiają do modelu.
# Model widzi tylko wysłany tekst, więc bez opinii ucznia nie dowie się, że te zasady istnieją.
def grading_text(task: Task, difficulties: str) -> str:
    special = []
    if difficulties == "dyskalkulia":
        special.append(
            "Ocena prac osób ze stwierdzoną dyskalkulią, zasady ogólne:\n"
            + DYSCALCULIA_GENERAL_RULES
        )
        if task.dyscalculia:
            entry = [task.dyscalculia.get("rules"), task.dyscalculia.get("notes")]
            special.append(
                "Ocena prac osób ze stwierdzoną dyskalkulią, to zadanie:\n"
                + "\n".join(part for part in entry if part)
            )
    if difficulties in ("specyficzne", "dyskalkulia") and task.specific_difficulties:
        special.append(
            "Kryteria uwzględniające specyficzne trudności w uczeniu się matematyki:\n"
            + task.specific_difficulties
        )
    standard = scoring_text(task) + "\n\nUwagi ogólne:\n" + GENERAL_NOTES
    if not special:
        return standard
    return "\n\n".join(
        [
            "Ten uczeń ma opinię o trudnościach w uczeniu się. Poniższe zasady mają pierwszeństwo "
            "przed zasadami standardowymi, które obowiązują we wszystkim, czego te zasady "
            "nie zmieniają.",
            *special,
            "Zasady standardowe:\n" + standard,
        ]
    )


# Zadanie z poprawną odpowiedzią jako tekst dla modelu: otwarte z zasadami oceniania CKE,
# zamknięte z odpowiedziami do wyboru (zasad oceniania nie mają).
def task_for_model(task: Task) -> str:
    if task.answer_format == "otwarte":
        return describe_task(task.content, scoring_text(task), task.answer, solutions_text(task))
    choices = "\n".join(f"{label}. {text}" for label, text in task.choices.items())
    text = f"Treść zadania:\n{task.content}\n\nOdpowiedzi do wyboru:\n{choices}"
    if task.connector:
        text += f"\n\nTekst między kolumnami do dobrania: {task.connector}"
    key = answer_key(task)
    if task.answer_format == "prawda-falsz":
        key += " (P albo F dla kolejnych zdań)"
    return text + f"\n\nPoprawna odpowiedź: {key}"


def save_ai_request(
    session: Session,
    account: Account,
    task: Task,
    kind: str,
    reply: Reply,
    image: bytes | None = None,
    image_type: str | None = None,
    text: str | None = None,
    solution: Solution | None = None,
) -> AiRequest:
    request = AiRequest(
        account_id=account.id,
        task_id=task.id,
        solution_id=solution.id if solution else None,
        kind=kind,
        image=image,
        image_type=image_type,
        text=text,
        reply=reply.text,
        model=reply.model,
        failed_models=reply.failed,
        prompt_version=PROMPT_VERSION,
        input_tokens=reply.input_tokens,
        output_tokens=reply.output_tokens,
        cost=reply.cost,
        seconds=reply.seconds,
    )
    session.add(request)
    session.flush()
    return request


# Zły wynik albo dowód: rozwiązanie ze zdjęcia, tablicy albo opisu ocenia AI według zasad CKE.
# Zdjęcie zostaje w ai_request do analizy w pracy, w rozwiązaniu jest tylko odczyt.
@router.post("/tasks/{task_id}/grade")
def grade_solution(
    task_id: int,
    body: GradeIn,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    task = task_for_ai(session, task_id, account)
    if task.answer_format != "otwarte":
        raise HTTPException(status_code=422, detail=["AI ocenia tylko zadania otwarte."])
    if (body.image is None) == (body.text is None):
        raise HTTPException(status_code=422, detail=["Wyślij zdjęcie albo opis rozwiązania."])
    image = decoded_image(body.image)
    solution = None
    if body.solution_id is not None:
        solution = session.get(Solution, body.solution_id)
        if solution is None or solution.account_id != account.id or solution.task_id != task.id:
            raise HTTPException(status_code=404, detail=["Nie ma takiego rozwiązania."])
    try:
        result = grade(
            task.content,
            grading_text(task, learning_difficulties(session, account)),
            task.answer,
            task.max_points,
            image=image,
            image_type=body.image_type,
            text=body.text,
            solutions=solutions_text(task),
        )
    except GradingUnavailable:
        raise HTTPException(status_code=503, detail=[AI_UNAVAILABLE]) from None
    except UnreadableSolution as unreadable:
        save_ai_request(
            session,
            account,
            task,
            "ocena",
            unreadable.reply,
            image,
            body.image_type,
            body.text,
            solution,
        )
        session.commit()
        raise HTTPException(
            status_code=422,
            detail=["Nie da się odczytać rozwiązania. Wyślij wyraźniejsze zdjęcie."],
        ) from None
    if solution is None:
        solution = Solution(
            account_id=account.id,
            task_id=task.id,
            mode=body.mode,
            points=result.points,
            open_answer={"answers": body.answers or []},
        )
        session.add(solution)
    # Uczeń może wytłumaczyć się i wysłać lepsze zdjęcie po złej ocenie tablicy, więc kolejna
    # ocena nie obniża punktów. W rozwiązaniu zostaje odczyt z najlepszej oceny.
    if result.points >= solution.points:
        solution.points = result.points
        solution.open_answer = solution.open_answer | {
            "checked": "ai",
            "model": result.model,
            "reading": result.reading,
        }
    session.flush()
    request = save_ai_request(
        session, account, task, "ocena", result.reply, image, body.image_type, body.text, solution
    )
    session.commit()
    return {
        "id": solution.id,
        "request_id": request.id,
        "points": solution.points,
        "max_points": task.max_points,
        "answer": answer_key(task),
        "explanation": result.explanation,
        "reading": result.reading,
    }


def decoded_image(image: str | None) -> bytes | None:
    try:
        return base64.b64decode(image, validate=True) if image else None
    except binascii.Error:
        raise HTTPException(status_code=422, detail=["Nie udało się odczytać zdjęcia."]) from None


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# Odpowiedź AI kawałkami jako Server-Sent Events: zdarzenia delta z tekstem, na końcu done
# z request_id albo error, gdy odpowiedź urwie się w trakcie. Pierwszy kawałek czeka się na
# niego przed startem strumienia, żeby przy braku działającego modelu uczeń dostał zwykły
# błąd HTTP, a nie strumień z samym błędem.
def streamed_answer(
    parts: Iterator[str | Reply],
    session: Session,
    account: Account,
    task: Task,
    kind: str,
    text: str | None = None,
    image: bytes | None = None,
    image_type: str | None = None,
) -> StreamingResponse:
    try:
        first = next(parts)
    except GradingUnavailable:
        raise HTTPException(status_code=503, detail=[AI_UNAVAILABLE]) from None

    def events():
        try:
            for part in chain([first], parts):
                if isinstance(part, Reply):
                    # Wpis powstaje dopiero z pełną odpowiedzią; urwana nie zostawia śladu.
                    request = save_ai_request(
                        session, account, task, kind, part, image, image_type, text
                    )
                    session.commit()
                    yield sse("done", {"request_id": request.id})
                else:
                    yield sse("delta", {"text": part})
        except StreamBroken:
            yield sse("error", {"message": "Odpowiedź urwała się w połowie. Spróbuj ponownie."})

    # Bez tych nagłówków pośrednik (np. na Renderze) mógłby zebrać całą odpowiedź przed wysłaniem.
    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# Odpowiedź ucznia, wynik sprawdzenia i ocena AI, jeśli była: bez tego Dyżurny nie wie, do
# czego uczeń się odnosi, gdy pyta o swój wynik.
def attempt_text(session: Session, task: Task, solution: Solution) -> str:
    if solution.answer is not None:
        given = f"Odpowiedź zaznaczona przez ucznia: {solution.answer}"
    elif solution.open_answer and solution.open_answer["answers"]:
        given = "Wyniki wpisane przez ucznia: " + "; ".join(solution.open_answer["answers"])
    else:
        given = "Uczeń nie wpisał wyniku końcowego."
    text = f"\n\n{given}\nPunkty po sprawdzeniu: {solution.points} z {task.max_points}"
    grades = session.scalars(
        select(AiRequest)
        .where(AiRequest.solution_id == solution.id, AiRequest.kind == "ocena")
        .order_by(AiRequest.id)
    )
    # Każda ocena, także słabsza od najlepszej: uczeń może pytać o którąkolwiek.
    for number, grade_request in enumerate(grades, 1):
        graded = json.loads(grade_request.reply)
        text += (
            f"\n\nOcena rozwiązania przez AI według zasad CKE nr {number}"
            f" ({graded['points']} pkt)."
            f"\nOdczyt rozwiązania: {graded['reading']}"
            f"\nWyjaśnienie oceny dla ucznia: {graded['explanation']}"
        )
    return text


# Pełne rozwiązanie krok po kroku, gdy uczeń o nie poprosi.
@router.post("/tasks/{task_id}/ai-solution")
def ai_solution(
    task_id: int,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    task = task_for_ai(session, task_id, account)
    parts = show_solution(task_for_model(task))
    return streamed_answer(parts, session, account, task, "rozwiazanie")


# „Dopytaj się”: pytanie ucznia o zadanie, z całą dotychczasową rozmową.
@router.post("/tasks/{task_id}/question")
def ask_about_task(
    task_id: int,
    body: QuestionIn,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    task = task_for_ai(session, task_id, account)
    if body.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail=["Wpisz pytanie."])
    messages = [message.model_dump() for message in body.messages]
    described = task_for_model(task)
    latest = session.scalar(
        select(Solution)
        .where(Solution.account_id == account.id, Solution.task_id == task.id)
        .order_by(Solution.id.desc())
        .limit(1)
    )
    if body.checked and latest:
        described += attempt_text(session, task, latest)
    attached = decoded_image(body.image)
    image, image_type, previous = attached, body.image_type, None
    earlier = recent_images(session, account, task, latest, BOARD_VERSIONS - 1)
    if attached is None and earlier:
        image, image_type = earlier[0].image, earlier[0].image_type
        last = messages[-1]
        last["content"] = "(Obraz dołączony wcześniej, bez zmian.)\n" + last["content"]
    elif earlier:
        previous = [(request.image, request.image_type) for request in reversed(earlier)]
    parts = answer_question(
        described, messages, body.checked, image, image_type, previous, body.strong
    )
    # Zapisuje się tylko obraz dołączony do tej wiadomości, a nie powtórzony.
    return streamed_answer(
        parts, session, account, task, "pytanie", body.messages[-1].content,
        attached, body.image_type,
    )


# Ostatnie obrazy tej próby zadania, z pytań i ocen, od najnowszego. Najnowszy idzie z każdym
# pytaniem, żeby Dyżurny mógł spojrzeć na tablicę zawsze, a nie tylko po zmianie. Przy nowej
# tablicy idą też poprzednie, żeby poprawkę ucznia odróżnił od swojej pomyłki. Próbę kończy
# ocena trudności, która przypisuje pytania do rozwiązania.
def recent_images(
    session: Session, account: Account, task: Task, solution: Solution | None, count: int
) -> list[AiRequest]:
    attempt = AiRequest.solution_id.is_(None)
    if solution is not None and solution.rating is None:
        attempt = attempt | (AiRequest.solution_id == solution.id)
    return session.scalars(
        select(AiRequest)
        .where(
            AiRequest.account_id == account.id,
            AiRequest.task_id == task.id,
            AiRequest.image.is_not(None),
            attempt,
        )
        .order_by(AiRequest.id.desc())
        .limit(count)
    ).all()


# Reakcja ucznia na ocenę, rozwiązanie albo odpowiedź AI, do analizy w pracy. Druga reakcja
# zastępuje pierwszą, bo komentarz dochodzi po kliknięciu.
@router.post("/ai-requests/{request_id}/feedback", status_code=204)
def give_feedback(
    request_id: int,
    body: FeedbackIn,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    request = session.get(AiRequest, request_id)
    if request is None or request.account_id != account.id:
        raise HTTPException(status_code=404, detail=["Nie ma takiego zapytania."])
    request.feedback = body.feedback
    request.feedback_comment = body.comment or None
    session.commit()


# Podgląd pod polem wyniku: jak serwer odczytał wpis, zanim uczeń go wyśle.
@router.post("/read")
def read_answer(body: ReadIn):
    if body.kind not in KINDS:
        raise HTTPException(status_code=422, detail=["Nieznany rodzaj wyniku."])
    return {"latex": read_latex(body.text, body.kind)}


# Ćwiczenie tematu daje zadania, których uczeń jeszcze nie robił, w losowej kolejności.
# Pominięte niedawno zadania (frontend pamięta ostatnie 3) wracają dopiero wtedy, gdy innych
# nierobionych już nie ma.
@router.get("/topic/{exam}/{topic}/next")
def next_in_topic(
    exam: str,
    topic: str,
    skipped: list[int] = Query(default=[]),
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    topic_id = session.scalar(
        select(Topic.id).join(Exam).where(Exam.code == exam, Topic.code == topic)
    )
    if topic_id is None:
        raise HTTPException(status_code=404, detail=["Nie ma takiego tematu."])
    checked = select(Task.id).where(Task.topic_id == topic_id, READY_FOR_STUDENT)
    total = session.scalar(select(func.count()).select_from(checked.subquery()))
    solved = select(Solution.task_id).where(Solution.account_id == account.id)
    unsolved = session.scalars(checked.where(Task.id.not_in(solved))).all()
    candidates = [task_id for task_id in unsolved if task_id not in skipped] or unsolved
    if not candidates:
        return {"task": None, "left": 0, "total": total}
    task = session.get(Task, random.choice(candidates))
    return {"task": task_for_student(session, task), "left": len(unsolved), "total": total}


RATING_ORDER = ["latwy", "sredni", "trudny", "bardzo-trudny"]


# Model może ocenę tylko utrudnić, więc z dwóch ocen wygrywa trudniejsza.
def harder(rating: str, other: str) -> str:
    return max(rating, other, key=RATING_ORDER.index)


# Pytania i pokazane rozwiązanie przy tej próbie zadania: te, których nie przypisano jeszcze
# do ocenionego rozwiązania. Pytać można przed sprawdzeniem i po nim, więc czas powstania
# rozwiązania nie wyznacza granicy.
def ai_help(session: Session, solution: Solution) -> list[AiRequest]:
    return session.scalars(
        select(AiRequest)
        .where(
            AiRequest.account_id == solution.account_id,
            AiRequest.task_id == solution.task_id,
            AiRequest.kind.in_(["pytanie", "rozwiazanie"]),
            AiRequest.solution_id.is_(None),
        )
        .order_by(AiRequest.id)
    ).all()


# Rozmowa odtworzona z zapisanych zapytań: przy pytaniu zapisuje się tylko ostatnia
# wiadomość ucznia, a przy rozwiązaniu sama prośba.
def conversation(requests: list[AiRequest]) -> list[dict]:
    messages = []
    for request in requests:
        question = request.text if request.kind == "pytanie" else "Pokaż rozwiązanie krok po kroku."
        # Obrazu nie wysyła się drugi raz, ale model ma wiedzieć, że był.
        if request.image or request.image_file:
            question += "\n[Do tej wiadomości uczeń dołączył obraz.]"
        messages.append({"role": "user", "content": question})
        messages.append({"role": "assistant", "content": request.reply})
    return messages


@router.post("/solutions/{solution_id}/rating")
def rate_solution(
    solution_id: int,
    body: RatingIn,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    solution = session.get(Solution, solution_id)
    if solution is None or solution.account_id != account.id:
        raise HTTPException(status_code=404, detail=["Nie ma takiego rozwiązania."])
    # Ocena przesuwa termin powtórki, więc drugi raz policzyłaby to samo rozwiązanie podwójnie.
    if solution.rating is not None:
        raise HTTPException(status_code=409, detail=["To rozwiązanie ma już ocenę."])
    if body.rating == "latwy" and solution.points < session.get(Task, solution.task_id).max_points:
        raise HTTPException(
            status_code=422, detail=["Po błędnej odpowiedzi zadanie nie może być łatwe."]
        )
    task = session.get(Task, solution.task_id)
    solution.student_rating = body.rating
    solution.rating = body.rating
    help_requests = ai_help(session, solution)
    for request in help_requests:
        request.solution_id = solution.id
    if any(request.kind == "rozwiazanie" for request in help_requests):
        solution.rating = harder(solution.rating, "trudny")
    if help_requests:
        try:
            reply = judge_difficulty(
                task_for_model(task) + attempt_text(session, task, solution),
                conversation(help_requests),
                body.rating,
                help_requests[-1].model,
            )
            save_ai_request(session, account, task, "ocena-trudnosci", reply, solution=solution)
            if reply.data["rating"] in RATING_ORDER:
                solution.rating = harder(solution.rating, reply.data["rating"])
        # Bez odpowiedzi modelu zostaje ocena ucznia, z minimum po pokazanym rozwiązaniu.
        except GradingUnavailable:
            pass
    card = update_card(session, account.id, task.id, solution.rating, datetime.now(UTC))
    session.commit()
    exam = session.get(Exam, task.exam_id).code
    return {
        "due": card.due.isoformat(),
        "after_exam": card.due >= exam_start(session, account.id, exam),
    }


# Karty ucznia z jednego egzaminu, tylko z zadań, które wciąż są sprawdzone.
def cards_of(account: Account, exam: str) -> Select:
    return (
        select(ReviewCard)
        .join(Task, Task.id == ReviewCard.task_id)
        .join(Exam, Exam.id == Task.exam_id)
        .where(
            ReviewCard.account_id == account.id,
            Exam.code == exam,
            READY_FOR_STUDENT,
        )
    )


def first_not_skipped(cards: list[ReviewCard], skipped: list[int]) -> ReviewCard | None:
    candidates = [card for card in cards if card.task_id not in skipped] or cards
    return candidates[0] if candidates else None


# Najpierw zadania na dziś, najdawniej zaległe pierwsze, najwyżej tyle, ile pozwala dzienny
# limit z profilu. Po nich („more”) zadania z najbliższym terminem, bez końca, z pominięciem
# tych, które i tak nie wrócą przed maturą.
@router.get("/reviews/{exam}/next")
def next_review(
    exam: str,
    more: bool = False,
    skipped: list[int] = Query(default=[]),
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    cards = cards_of(account, exam)
    total = session.scalar(select(func.count()).select_from(cards.subquery()))
    limit = daily_limit(session, account.id)
    done_today = session.scalar(
        select(func.count())
        .select_from(Solution)
        .join(Task, Task.id == Solution.task_id)
        .join(Exam, Exam.id == Task.exam_id)
        .where(
            Solution.account_id == account.id,
            Solution.mode == "powtorka",
            Solution.created_at >= day_start(),
            Exam.code == exam,
        )
    )
    due = session.scalars(cards.where(ReviewCard.due < tomorrow()).order_by(ReviewCard.due)).all()
    left_today = max(0, min(len(due), limit - done_today))
    if more:
        upcoming = cards.where(ReviewCard.due < exam_start(session, account.id, exam))
        pool = session.scalars(upcoming.order_by(ReviewCard.due).limit(len(skipped) + 1)).all()
    else:
        pool = due[:left_today]
    card = first_not_skipped(list(pool), skipped)
    return {
        "task": task_for_student(session, session.get(Task, card.task_id)) if card else None,
        "cards": total,
        "left_today": left_today,
        "limit": limit,
    }


# Losowe daje tylko zadania, które uczeń już robił, z wybranych tematów. Najpierw te, którym
# minął termin powtórki, a gdy takich nie ma, dowolne z jego kart.
@router.get("/random/{exam}")
def random_task(
    exam: str,
    topics: list[str] = Query(default=[]),
    skipped: list[int] = Query(default=[]),
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    cards = cards_of(account, exam)
    if topics:
        cards = cards.join(Topic, Topic.id == Task.topic_id).where(Topic.code.in_(topics))
    all_cards = session.scalars(cards).all()
    pool = [card for card in all_cards if card.due <= datetime.now(UTC)] or all_cards
    candidates = [card for card in pool if card.task_id not in skipped] or pool
    if not candidates:
        return {"task": None, "cards": 0}
    card = random.choice(candidates)
    return {"task": task_for_student(session, session.get(Task, card.task_id)), "cards": len(all_cards)}


# Ile ostatnich rozwiązań tematu liczy się do skuteczności na mapie.
RECENT_SOLUTIONS = 20


# Postęp ucznia w każdym temacie egzaminu, w tej samej postaci co postęp na mapie we frontendzie.
@router.get("/progress/{exam}")
def progress(
    exam: str,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    totals = session.execute(
        select(Topic.code, func.count(Task.id))
        .join(Task, Task.topic_id == Topic.id)
        .join(Exam, Exam.id == Topic.exam_id)
        .where(Exam.code == exam, READY_FOR_STUDENT)
        .group_by(Topic.code)
    ).all()
    topics = {
        code: {"total": total, "done": 0, "due": 0, "recent": {"attempts": 0, "correct": 0}}
        for code, total in totals
    }

    solutions = session.execute(
        select(Topic.code, Task.id, Solution.points, Task.max_points, Solution.created_at)
        .join(Task, Task.id == Solution.task_id)
        .join(Topic, Topic.id == Task.topic_id)
        .join(Exam, Exam.id == Task.exam_id)
        .where(
            Solution.account_id == account.id,
            Exam.code == exam,
            READY_FOR_STUDENT,
        )
        .order_by(Solution.created_at.desc())
    ).all()
    done: dict[str, set[int]] = {}
    for code, task_id, points, max_points, created_at in solutions:
        topic = topics[code]
        topic.setdefault("last_activity", created_at.isoformat())
        done.setdefault(code, set()).add(task_id)
        if topic["recent"]["attempts"] < RECENT_SOLUTIONS:
            topic["recent"]["attempts"] += 1
            topic["recent"]["correct"] += points == max_points
    for code, task_ids in done.items():
        topics[code]["done"] = len(task_ids)

    due = session.execute(
        select(Topic.code, func.count())
        .select_from(ReviewCard)
        .join(Task, Task.id == ReviewCard.task_id)
        .join(Topic, Topic.id == Task.topic_id)
        .join(Exam, Exam.id == Task.exam_id)
        .where(
            ReviewCard.account_id == account.id,
            ReviewCard.due < tomorrow(),
            Exam.code == exam,
            READY_FOR_STUDENT,
        )
        .group_by(Topic.code)
    ).all()
    for code, count in due:
        topics[code]["due"] = count
    return {"topics": topics, "last_station": solutions[0][0] if solutions else None}


# Zadanie na stronie demo, do zrobienia bez konta i bez zapisu. Wskazane źródłem, a nie id,
# bo id zadań w bazie lokalnej i na serwerze nie muszą być takie same.
DEMO_TASK = {"exam": "matura-podstawowa", "source": "maj", "year": 2026, "number": 4, "subnumber": None}


def demo_task(session: Session) -> Task:
    task = session.scalar(
        select(Task)
        .join(Exam, Exam.id == Task.exam_id)
        .join(SourceKind, SourceKind.id == Task.source_kind_id)
        .where(
            Exam.code == DEMO_TASK["exam"],
            SourceKind.code == DEMO_TASK["source"],
            Task.year == DEMO_TASK["year"],
            Task.number == DEMO_TASK["number"],
            Task.subnumber.is_not_distinct_from(DEMO_TASK["subnumber"]),
            READY_FOR_STUDENT,
        )
    )
    if task is None:
        raise HTTPException(status_code=404, detail=["Zadania demo jeszcze nie ma w bazie."])
    return task


@router.get("/demo")
def get_demo_task(session: Session = Depends(get_session)):
    return task_for_student(session, demo_task(session))


@router.post("/demo/check")
def check_demo_task(body: DemoAnswer, session: Session = Depends(get_session)):
    task = demo_task(session)
    return {
        "id": 0,
        "points": task.max_points if body.answer == answer_key(task) else 0,
        "max_points": task.max_points,
        "answer": answer_key(task),
    }
