from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.access import require_panel_password
from app.db import get_session
from app.figures import figures_json
from app.import_scoring import import_scoring
from app.import_tasks import (
    ImportRejected,
    TaskIn,
    import_tasks,
    parse_json,
    scoring_json,
    task_problems,
)
from app.models import Exam, SourceKind, Task, Topic

router = APIRouter(prefix="/api/panel", dependencies=[Depends(require_panel_password)])


class TaskUpdate(TaskIn):
    topic: str
    review_status: Literal["do-sprawdzenia", "sprawdzone"]


class TaskIds(BaseModel):
    ids: list[int]


class TopicChange(TaskIds):
    topic: str


class ImportText(BaseModel):
    text: str


def rejected(problems: list[str]) -> HTTPException:
    return HTTPException(status_code=422, detail=problems)


def load_task(session: Session, task_id: int) -> Task:
    task = session.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail=["nie ma takiego zadania"])
    return task


def task_details(session: Session, task: Task) -> dict:
    return {
        "id": task.id,
        "exam": session.get(Exam, task.exam_id).code,
        "topic": session.get(Topic, task.topic_id).code,
        "source": session.get(SourceKind, task.source_kind_id).code,
        "year": task.year,
        "month": task.month,
        "number": task.number,
        "subnumber": task.subnumber,
        "max_points": task.max_points,
        "content": task.content,
        "has_figure": task.has_figure,
        "answer_format": task.answer_format,
        "choices": task.choices,
        "connector": task.connector,
        "figures": task.figures,
        "answer": task.answer,
        "scoring": task.scoring,
        "review_status": task.review_status,
        "read_method": task.read_method,
        "read_model": task.read_model,
        "ai_content": task.ai_content,
    }


# Hasło panelu sprawdza zależność routera, więc samo dojście tutaj znaczy, że jest dobre.
@router.get("/access", status_code=204)
def check_panel_access():
    pass


@router.get("/options")
def options(session: Session = Depends(get_session)):
    task_counts = dict(
        session.execute(select(Task.topic_id, func.count()).group_by(Task.topic_id)).all()
    )
    result = []
    for exam in session.scalars(select(Exam).order_by(Exam.id)):
        topics = session.scalars(select(Topic).where(Topic.exam_id == exam.id).order_by(Topic.id))
        sources = session.scalars(
            select(SourceKind).where(SourceKind.exam_id == exam.id).order_by(SourceKind.id)
        )
        result.append(
            {
                "code": exam.code,
                "name": exam.name,
                "topics": [
                    {"code": topic.code, "name": topic.name, "tasks": task_counts.get(topic.id, 0)}
                    for topic in topics
                ],
                "sources": [{"code": source.code, "name": source.name} for source in sources],
            }
        )
    return result


@router.get("/tasks")
def list_tasks(
    exam: str | None = None,
    topic: str | None = None,
    status: str | None = None,
    has_figure: bool | None = None,
    # Zadania otwarte, którym brakuje zasad oceniania, więc nie trafiają jeszcze do ucznia.
    without_scoring: bool = False,
    session: Session = Depends(get_session),
):
    query = (
        select(Task, Exam.code, Topic.name, SourceKind.name)
        .join(Exam, Task.exam_id == Exam.id)
        .join(Topic, Task.topic_id == Topic.id)
        .join(SourceKind, Task.source_kind_id == SourceKind.id)
        .order_by(Task.id)
    )
    if exam:
        query = query.where(Exam.code == exam)
    if topic:
        query = query.where(Topic.code == topic)
    if status:
        query = query.where(Task.review_status == status)
    if has_figure is not None:
        query = query.where(Task.has_figure == has_figure)
    if without_scoring:
        query = query.where(Task.answer_format == "otwarte", Task.scoring.is_(None))

    return [
        {
            "id": task.id,
            "exam": exam_code,
            "topic": topic_name,
            "source": source_name,
            "year": task.year,
            "number": task.number,
            "subnumber": task.subnumber,
            "content": task.content,
            "review_status": task.review_status,
        }
        for task, exam_code, topic_name, source_name in session.execute(query)
    ]


@router.get("/tasks/{task_id}")
def get_task(task_id: int, session: Session = Depends(get_session)):
    return task_details(session, load_task(session, task_id))


@router.put("/tasks/{task_id}")
def update_task(task_id: int, update: TaskUpdate, session: Session = Depends(get_session)):
    task = load_task(session, task_id)

    problems = task_problems(update)
    topic = session.scalar(
        select(Topic).where(Topic.exam_id == task.exam_id, Topic.code == update.topic)
    )
    if topic is None:
        problems.append(f"nieznany temat {update.topic}")
    kind = session.scalar(
        select(SourceKind).where(
            SourceKind.exam_id == task.exam_id, SourceKind.code == update.source
        )
    )
    if kind is None:
        problems.append(f"nieznane źródło {update.source}")
    if update.review_status == "sprawdzone" and update.answer is None:
        problems.append("sprawdzone zadanie musi mieć odpowiedź")
    if problems:
        raise rejected(problems)

    task.topic_id = topic.id
    task.source_kind_id = kind.id
    task.year = update.year
    task.month = update.month
    task.number = update.number
    task.subnumber = update.subnumber
    task.max_points = update.max_points
    task.content = update.content
    task.has_figure = update.has_figure
    task.answer_format = update.answer_format
    task.choices = update.choices
    task.connector = update.connector
    task.figures = figures_json(update.figures)
    task.answer = update.answer
    task.scoring = scoring_json(update.scoring)
    if update.review_status == "sprawdzone" and task.review_status != "sprawdzone":
        task.reviewed_at = datetime.now(UTC)
    if update.review_status == "do-sprawdzenia":
        task.reviewed_at = None
    task.review_status = update.review_status

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise rejected(["zadanie z tym źródłem, rokiem, miesiącem i numerem już jest w bazie"])
    return task_details(session, task)


@router.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, session: Session = Depends(get_session)):
    session.delete(load_task(session, task_id))
    session.commit()


def load_tasks(session: Session, ids: list[int]) -> list[Task]:
    tasks = session.scalars(select(Task).where(Task.id.in_(ids))).all()
    if not tasks or len(tasks) != len(set(ids)):
        raise rejected(["części zaznaczonych zadań nie ma w bazie"])
    return tasks


# Zmienia temat wielu zadań naraz: wszystkie albo żadne.
@router.post("/tasks/topic")
def change_topic(body: TopicChange, session: Session = Depends(get_session)):
    tasks = load_tasks(session, body.ids)
    exam_ids = {task.exam_id for task in tasks}
    if len(exam_ids) > 1:
        raise rejected(["zaznaczone zadania są z różnych egzaminów"])
    topic = session.scalar(
        select(Topic).where(Topic.exam_id == exam_ids.pop(), Topic.code == body.topic)
    )
    if topic is None:
        raise rejected([f"nieznany temat {body.topic}"])

    for task in tasks:
        task.topic_id = topic.id
    session.commit()
    return {"changed": len(tasks)}


# Masowo można tylko cofnąć zadania do sprawdzenia; „sprawdzone” zostaje decyzją dla
# każdego zadania osobno.
@router.post("/tasks/reopen")
def reopen_tasks(body: TaskIds, session: Session = Depends(get_session)):
    tasks = load_tasks(session, body.ids)
    for task in tasks:
        task.review_status = "do-sprawdzenia"
        task.reviewed_at = None
    session.commit()
    return {"changed": len(tasks)}


# Następne zadanie do sprawdzenia po podanym id; po ostatnim wraca do początku listy.
@router.get("/next")
def next_task(after: int = 0, session: Session = Depends(get_session)):
    query = select(Task.id).where(Task.review_status == "do-sprawdzenia").order_by(Task.id)
    next_id = session.scalar(query.where(Task.id > after)) or session.scalar(query)
    return {"id": next_id}


def exported_task(session: Session, task: Task) -> dict:
    fields = {
        "source": session.get(SourceKind, task.source_kind_id).code,
        "year": task.year,
        "month": task.month,
        "number": task.number,
        "subnumber": task.subnumber,
        "max_points": task.max_points,
        "content": task.content,
        "has_figure": task.has_figure,
        "answer_format": task.answer_format,
        "choices": task.choices,
        "connector": task.connector,
        "figures": task.figures,
        "answer": task.answer,
        "scoring": task.scoring,
    }
    # Puste pola pomijane jak w plikach od Gemini, żeby plik dało się czytać.
    return {key: value for key, value in fields.items() if value is not None}


# Plik w formacie importu, więc zadania sprawdzone lokalnie można wczytać w bazie online.
# Format ma jeden egzamin, temat i sposób odczytu na cały plik.
@router.post("/export")
def export_tasks(body: TaskIds, session: Session = Depends(get_session)):
    tasks = sorted(load_tasks(session, body.ids), key=lambda task: task.id)
    if len({(task.topic_id, task.read_method, task.read_model) for task in tasks}) > 1:
        raise rejected(["zaznacz zadania z jednego tematu i z jednym sposobem odczytu"])
    first = tasks[0]
    return {
        "exam": session.get(Exam, first.exam_id).code,
        "topic": session.get(Topic, first.topic_id).code,
        "read_method": first.read_method,
        "read_model": first.read_model,
        "tasks": [exported_task(session, task) for task in tasks],
    }


@router.post("/import")
def import_text(body: ImportText, session: Session = Depends(get_session)):
    try:
        ids = import_tasks(session, parse_json(body.text))
    except ImportRejected as error:
        raise rejected(error.problems) from None
    session.commit()
    return {"ids": ids}


@router.post("/import-scoring")
def import_scoring_text(body: ImportText, session: Session = Depends(get_session)):
    try:
        ids = import_scoring(session, parse_json(body.text))
    except ImportRejected as error:
        raise rejected(error.problems) from None
    session.commit()
    return {"ids": ids}
