import base64
import binascii
import random
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import Select, and_, func, or_, select
from sqlalchemy.orm import Session

from app.access import require_password
from app.accounts import current_account
from app.db import get_session
from app.equivalence import KINDS, equivalent, read_latex
from app.grading import (
    PROMPT_VERSION,
    GradingUnavailable,
    Reply,
    UnreadableSolution,
    answer_question,
    grade,
    show_solution,
)
from app.models import AiRequest, Account, Exam, ReviewCard, Solution, SourceKind, Task, Topic
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
    if not results:
        raise HTTPException(status_code=422, detail=["Dowód oceni AI na podstawie rozwiązania."])
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
            {"answers": body.answers, "checked": "program"}
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


# Ile zapytań do AI (oceny, rozwiązania i pytania razem) ma uczeń na dzień.
AI_DAILY_LIMIT = 30


def open_task_for_ai(session: Session, task_id: int, account: Account) -> Task:
    task = load_task(session, task_id)
    if task.answer_format != "otwarte":
        raise HTTPException(status_code=422, detail=["AI pomaga tylko przy zadaniach otwartych."])
    used = session.scalar(
        select(func.count())
        .select_from(AiRequest)
        .where(AiRequest.account_id == account.id, AiRequest.created_at >= day_start())
    )
    if used >= AI_DAILY_LIMIT:
        raise HTTPException(
            status_code=429, detail=["Dzisiejszy limit pytań do AI się skończył. Wróć jutro."]
        )
    return task


def scoring_text(task: Task) -> str:
    scoring = task.scoring["rules"]
    if task.scoring.get("notes"):
        scoring += "\n\nUwagi:\n" + task.scoring["notes"]
    return scoring


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
    task = open_task_for_ai(session, task_id, account)
    if (body.image is None) == (body.text is None):
        raise HTTPException(status_code=422, detail=["Wyślij zdjęcie albo opis rozwiązania."])
    try:
        image = base64.b64decode(body.image, validate=True) if body.image else None
    except binascii.Error:
        raise HTTPException(
            status_code=422, detail=["Nie udało się odczytać zdjęcia."]
        ) from None
    try:
        result = grade(
            task.content,
            scoring_text(task),
            task.answer,
            task.max_points,
            image=image,
            image_type=body.image_type,
            text=body.text,
        )
    except GradingUnavailable:
        raise HTTPException(status_code=503, detail=["Ocena chwilowo niedostępna."]) from None
    except UnreadableSolution as unreadable:
        save_ai_request(
            session, account, task, "ocena", unreadable.reply, image, body.image_type, body.text
        )
        session.commit()
        raise HTTPException(
            status_code=422,
            detail=["Nie da się odczytać rozwiązania. Wyślij wyraźniejsze zdjęcie."],
        ) from None
    solution = Solution(
        account_id=account.id,
        task_id=task.id,
        mode=body.mode,
        points=min(result.points, task.max_points),
        open_answer={
            "answers": body.answers or [],
            "checked": "ai",
            "model": result.model,
            "reading": result.reading,
        },
    )
    session.add(solution)
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


# Pełne rozwiązanie krok po kroku, gdy uczeń o nie poprosi.
@router.post("/tasks/{task_id}/ai-solution")
def ai_solution(
    task_id: int,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    task = open_task_for_ai(session, task_id, account)
    try:
        reply = show_solution(task.content, scoring_text(task), task.answer)
    except GradingUnavailable:
        raise HTTPException(
            status_code=503, detail=["Rozwiązanie chwilowo niedostępne."]
        ) from None
    request = save_ai_request(session, account, task, "rozwiazanie", reply)
    session.commit()
    return {"solution": reply.text, "request_id": request.id}


# „Dopytaj się”: pytanie ucznia o zadanie, z całą dotychczasową rozmową.
@router.post("/tasks/{task_id}/question")
def ask_about_task(
    task_id: int,
    body: QuestionIn,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    task = open_task_for_ai(session, task_id, account)
    if body.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail=["Wpisz pytanie."])
    messages = [message.model_dump() for message in body.messages]
    try:
        reply = answer_question(task.content, scoring_text(task), task.answer, messages)
    except GradingUnavailable:
        raise HTTPException(
            status_code=503, detail=["Odpowiedź chwilowo niedostępna."]
        ) from None
    request = save_ai_request(
        session, account, task, "pytanie", reply, text=body.messages[-1].content
    )
    session.commit()
    return {"answer": reply.text, "request_id": request.id}


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
    solution.rating = body.rating
    task = session.get(Task, solution.task_id)
    card = update_card(session, account.id, task.id, body.rating, datetime.now(UTC))
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
