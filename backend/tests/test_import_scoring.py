import pytest

from app.import_scoring import import_scoring
from app.import_tasks import ImportRejected
from app.models import Task
from tests.test_task import make_task


@pytest.fixture
def open_task(session):
    return make_task(
        session, answer_format="otwarte", choices=None, answer="$3$", max_points=2
    )


def scoring_file(*tasks):
    return {"exam": "matura-podstawowa", "read_method": "gemini", "tasks": list(tasks)}


def entry(**changes):
    fields = {
        "source": "maj",
        "year": 2024,
        "month": 5,
        "number": 5,
        "max_points": 2,
        "results": [{"expected": "$3$", "kind": "liczba"}],
        "rules": "2 pkt – obliczenie $3$.",
        "notes": "Błąd rachunkowy: 1 pkt.",
    }
    fields.update(changes)
    return fields


def rejected(session, data):
    with pytest.raises(ImportRejected) as error:
        import_scoring(session, data)
    return error.value.problems


def test_scoring_goes_to_the_task_with_the_same_source(session, open_task):
    assert import_scoring(session, scoring_file(entry())) == [open_task.id]

    assert session.get(Task, open_task.id).scoring == {
        "results": [{"expected": "$3$", "kind": "liczba"}],
        "rules": "2 pkt – obliczenie $3$.",
        "notes": "Błąd rachunkowy: 1 pkt.",
    }


def test_points_must_match_the_task(session, open_task):
    problems = rejected(session, scoring_file(entry(max_points=3)))

    assert problems == ["zadanie 1 (maj 2024, nr 5): w bazie zadanie ma 2 pkt, a w pliku 3"]


def test_closed_task_gets_no_scoring(session):
    make_task(session, max_points=2)

    problems = rejected(session, scoring_file(entry()))

    assert problems == [
        "zadanie 1 (maj 2024, nr 5): zasady oceniania (scoring) są tylko przy zadaniu otwartym"
    ]


def test_whole_file_or_nothing(session, open_task):
    problems = rejected(session, scoring_file(entry(), entry(), entry(number=9)))

    assert problems == [
        "zadanie 2 (maj 2024, nr 5): powtórzone w pliku",
        "zadanie 3 (maj 2024, nr 9): nie ma takiego zadania w bazie",
    ]
    assert session.get(Task, open_task.id).scoring is None


def test_unknown_source_is_named(session, open_task):
    problems = rejected(session, scoring_file(entry(source="grudzien")))

    assert problems[0].startswith("zadanie 1 (grudzien 2024, nr 5): nieznane źródło")
