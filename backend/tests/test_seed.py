from sqlalchemy import func, select

from app.models import Exam, SourceKind, Topic
from app.seed import seed


def count(session, model):
    return session.scalar(select(func.count()).select_from(model))


def test_seed_runs_again_without_duplicates(session):
    # Pierwszy raz skrypt uruchomił conftest przy tworzeniu bazy testowej.
    seed(session)
    session.flush()

    assert count(session, Exam) == 3
    assert count(session, SourceKind) == 10
    assert count(session, Topic) == 23 + 16


def test_august_only_in_basic_matura(session):
    exams = session.scalars(
        select(Exam.code).join(SourceKind).where(SourceKind.code == "sierpien")
    ).all()

    assert exams == ["matura-podstawowa"]
