import random
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.access import require_password
from app.accounts import current_account
from app.db import get_session
from app.models import Account, Exam, ReviewCard, Solution, SourceKind, Task, Topic
from app.reviews import daily_limit, day_start, exam_start, tomorrow, update_card

router = APIRouter(prefix="/api/practice", dependencies=[Depends(require_password)])

CLOSED_FORMATS = ("wielokrotny-wybor", "prawda-falsz", "dobieranie")


class SolutionIn(BaseModel):
    mode: Literal["cwiczenie", "losowe", "powtorka"]
    # Zadanie zamknięte: zaznaczona odpowiedź. Otwarte: punkty z samooceny.
    answer: str | None = None
    points: int | None = None


class DemoAnswer(BaseModel):
    answer: str


class RatingIn(BaseModel):
    rating: Literal["latwy", "sredni", "trudny", "bardzo-trudny"]


# Uczeń widzi tylko zadania sprawdzone w panelu.
def load_task(session: Session, task_id: int) -> Task:
    task = session.get(Task, task_id)
    if task is None or task.review_status != "sprawdzone":
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
    # Przy samoocenie uczeń porównuje swoje rozwiązanie z kluczem, zanim poda punkty.
    if task.answer_format == "otwarte":
        shown["model_answer"] = answer_key(task)
    return shown


def scored_points(task: Task, body: SolutionIn) -> int:
    if task.answer_format in CLOSED_FORMATS:
        if not body.answer:
            raise HTTPException(status_code=422, detail=["Zaznacz odpowiedź."])
        # Jak w arkuszu CKE: punkt tylko za całą odpowiedź, także w prawda-fałsz.
        return task.max_points if body.answer == answer_key(task) else 0
    if body.points is None or not 0 <= body.points <= task.max_points:
        raise HTTPException(
            status_code=422, detail=[f"Podaj liczbę punktów od 0 do {task.max_points}."]
        )
    return body.points


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
    )
    session.add(solution)
    session.commit()
    return {
        "id": solution.id,
        "points": solution.points,
        "max_points": task.max_points,
        "answer": answer_key(task),
    }


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
    checked = select(Task.id).where(Task.topic_id == topic_id, Task.review_status == "sprawdzone")
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
            Task.review_status == "sprawdzone",
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
        .where(Exam.code == exam, Task.review_status == "sprawdzone")
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
            Task.review_status == "sprawdzone",
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
            Task.review_status == "sprawdzone",
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
            Task.review_status == "sprawdzone",
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
