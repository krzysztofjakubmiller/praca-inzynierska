import pytest
from sqlalchemy import func, select

from app.import_scoring import import_scoring
from app.import_tasks import ImportRejected
from app.models import Task
from tests.test_task import make_task


@pytest.fixture
def open_task(session):
    return make_task(session, answer_format="otwarte", choices=None, answer="$3$", max_points=2)


def sections_file(*tasks, **changes):
    return {
        "exam": "matura-podstawowa",
        "source": "maj",
        "year": 2024,
        "month": 5,
        "tasks": list(tasks),
    } | changes


def entry(**changes):
    fields = {
        "number": 5,
        "max_points": 2,
        "scoring": {
            "results": [{"expected": "$3$", "kind": "liczba"}],
            "rules": "2 pkt – obliczenie $3$.",
            "notes": "Błąd rachunkowy: 1 pkt.",
        },
        "solutions": [{"name": "Sposób I", "content": "Liczymy $1+2=3$."}],
        "specific_difficulties": "Zapis $3=x$ daje 2 pkt.",
        "dyscalculia": {"rules": "1 pkt – poprawna metoda.", "notes": "Nie stosuje się uwagi 1."},
    }
    return fields | changes


def rejected(session, data):
    with pytest.raises(ImportRejected) as error:
        import_scoring(session, data)
    return error.value.problems


def test_all_four_sections_go_to_the_task_with_the_same_source(session, open_task):
    assert import_scoring(session, sections_file(entry())) == ([open_task.id], [])

    task = session.get(Task, open_task.id)
    assert task.scoring == entry()["scoring"]
    assert task.solutions == entry()["solutions"]
    assert task.specific_difficulties == "Zapis $3=x$ daje 2 pkt."
    assert task.dyscalculia == entry()["dyscalculia"]


def test_only_scoring_is_required(session, open_task):
    minimal = {"number": 5, "max_points": 2, "scoring": entry()["scoring"]}

    import_scoring(session, sections_file(minimal))

    task = session.get(Task, open_task.id)
    assert task.solutions is None and task.specific_difficulties is None
    assert task.dyscalculia is None


def test_new_file_replaces_old_sections(session, open_task):
    import_scoring(session, sections_file(entry()))

    import_scoring(session, sections_file(entry(dyscalculia=None, solutions=None)))

    task = session.get(Task, open_task.id)
    assert task.dyscalculia is None and task.solutions is None


def test_status_does_not_change(session, open_task):
    open_task.review_status = "sprawdzone"
    session.flush()

    import_scoring(session, sections_file(entry()))

    assert session.get(Task, open_task.id).review_status == "sprawdzone"


def test_points_must_match_the_task(session, open_task):
    problems = rejected(session, sections_file(entry(max_points=3)))

    assert problems == ["zadanie 1 (nr 5): w bazie zadanie ma 2 pkt, a w pliku 3"]


def test_closed_task_gets_no_sections(session):
    make_task(session, max_points=2)

    problems = rejected(session, sections_file(entry()))

    assert problems == [
        "zadanie 1 (nr 5): zasady oceniania (scoring) są tylko przy zadaniu otwartym",
        "zadanie 1 (nr 5): rozwiązania, specyficzne trudności i dyskalkulia są tylko przy zadaniu otwartym",
    ]


def test_task_missing_from_the_database_is_skipped_and_saves_nothing(session, open_task):
    before = session.scalar(select(func.count()).select_from(Task))

    ids, skipped = import_scoring(
        session, sections_file(entry(number=9), entry(number=12, subnumber=1), entry())
    )

    assert ids == [open_task.id]
    assert skipped == ["9", "12.1"]
    assert session.scalar(select(func.count()).select_from(Task)) == before
    assert session.get(Task, open_task.id).scoring == entry()["scoring"]


def test_broken_entry_of_a_missing_task_does_not_stop_the_import(session, open_task):
    broken = {"number": 9, "max_points": "dwa", "scoring": {"rules": ""}, "nieznane": 1}

    assert import_scoring(session, sections_file(broken, entry())) == ([open_task.id], ["9"])


def test_problem_in_a_task_from_the_database_rejects_the_whole_file(session, open_task):
    other = make_task(
        session, number=6, answer_format="otwarte", choices=None, answer="$3$", max_points=2
    )

    problems = rejected(session, sections_file(entry(number=6, max_points=3), entry()))

    assert problems == ["zadanie 1 (nr 6): w bazie zadanie ma 2 pkt, a w pliku 3"]
    assert session.get(Task, open_task.id).scoring is None
    assert session.get(Task, other.id).scoring is None


def test_task_repeated_in_the_file_is_rejected(session, open_task):
    problems = rejected(session, sections_file(entry(), entry()))

    assert problems == ["zadanie 2 (nr 5): powtórzone w pliku"]


def test_unknown_source_is_named(session, open_task):
    problems = rejected(session, sections_file(entry(), source="grudzien"))

    assert problems[0].startswith("nieznane źródło grudzien")


def test_broken_latex_in_a_section_is_rejected(session, open_task):
    problems = rejected(session, sections_file(entry(specific_difficulties="Zapis $3=x daje 2 pkt.")))

    assert problems == ["zadanie 1 (nr 5): specyficzne trudności: nieparzysta liczba znaków $"]


def test_empty_dyscalculia_entry_is_rejected(session, open_task):
    problems = rejected(session, sections_file(entry(dyscalculia={})))

    assert problems == ["zadanie 1 (nr 5): dyskalkulia: pusty wpis, usuń pole dyscalculia"]
