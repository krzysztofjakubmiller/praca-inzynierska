import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models import Exam, SourceKind, Task, Topic


def exam_id(session, exam):
    return session.scalar(select(Exam.id).where(Exam.code == exam))


def row_id(session, model, exam, code):
    return session.scalar(
        select(model.id).join(Exam).where(Exam.code == exam, model.code == code)
    )


def make_task(session, **changes):
    fields = dict(
        exam_id=exam_id(session, "matura-podstawowa"),
        topic_id=row_id(session, Topic, "matura-podstawowa", "logarytmy"),
        source_kind_id=row_id(session, SourceKind, "matura-podstawowa", "maj"),
        year=2024,
        month=5,
        number=5,
        content="Liczba $\\log_2 8$ jest równa",
        answer_format="wielokrotny-wybor",
        choices={"A": "$1$", "B": "$2$", "C": "$3$", "D": "$4$"},
        answer="C",
        max_points=1,
        read_method="recznie",
    )
    fields.update(changes)
    task = Task(**fields)
    session.add(task)
    session.flush()
    return task


def test_task_is_saved_with_defaults(session):
    task = make_task(session)

    assert task.id is not None
    assert task.review_status == "do-sprawdzenia"
    assert task.has_figure is False
    assert task.created_at is not None


def test_same_task_cannot_be_saved_twice(session):
    # Oba zadania mają pusty podpunkt, więc to sprawdza też NULLS NOT DISTINCT.
    make_task(session)

    with pytest.raises(IntegrityError, match="task_source_unique"):
        make_task(session)


def test_subtasks_are_separate_tasks(session):
    make_task(session, number=9, subnumber=1)
    make_task(session, number=9, subnumber=2)


def test_topic_must_belong_to_task_exam(session):
    with pytest.raises(IntegrityError, match="task_topic_same_exam"):
        make_task(
            session,
            exam_id=exam_id(session, "matura-rozszerzona"),
            source_kind_id=row_id(session, SourceKind, "matura-rozszerzona", "maj"),
        )


def test_source_kind_must_belong_to_task_exam(session):
    with pytest.raises(IntegrityError, match="task_source_kind_same_exam"):
        make_task(
            session,
            source_kind_id=row_id(session, SourceKind, "matura-rozszerzona", "maj"),
        )


def test_reviewed_task_needs_answer(session):
    make_task(session, answer=None)

    with pytest.raises(IntegrityError, match="task_reviewed_has_answer"):
        make_task(session, number=6, answer=None, review_status="sprawdzone")


@pytest.mark.parametrize(
    ("changes", "rule"),
    [
        ({"answer_format": "abcd"}, "task_answer_format_valid"),
        ({"review_status": "gotowe"}, "task_review_status_valid"),
        ({"read_method": "chatgpt"}, "task_read_method_valid"),
        ({"month": 13}, "task_month_valid"),
        ({"month": None}, '"month"'),
        ({"max_points": 0}, "task_max_points_positive"),
    ],
)
def test_wrong_values_are_rejected(session, changes, rule):
    with pytest.raises(IntegrityError, match=rule):
        make_task(session, **changes)
