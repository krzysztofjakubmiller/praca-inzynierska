import json

import pytest
from sqlalchemy import func, select

from app.import_tasks import ImportRejected, import_tasks, parse_json
from app.models import Task


def task(**changes):
    fields = {
        "source": "maj",
        "year": 2024,
        "month": 5,
        "number": 3,
        "max_points": 1,
        "content": "Liczba $\\log_2 8$ jest równa",
        "answer_format": "wielokrotny-wybor",
        "choices": {"A": "$1$", "B": "$2$", "C": "$3$", "D": "$4$"},
        "answer": "C",
    }
    fields.update(changes)
    return fields


def task_file(*tasks, **changes):
    data = {
        "exam": "matura-podstawowa",
        "topic": "logarytmy",
        "read_method": "gemini",
        "read_model": "gemini-2.5-pro",
        "tasks": list(tasks) or [task()],
    }
    data.update(changes)
    return data


def rejected(session, data):
    with pytest.raises(ImportRejected) as error:
        import_tasks(session, data)
    return error.value.problems


def task_count(session):
    return session.scalar(select(func.count()).select_from(Task))


def test_tasks_are_saved_for_review(session):
    ids = import_tasks(session, task_file(task(), task(number=4, answer=None)))

    saved = session.scalars(select(Task).order_by(Task.number)).all()
    assert ids == [task.id for task in saved]
    assert [task.review_status for task in saved] == ["do-sprawdzenia", "do-sprawdzenia"]
    assert saved[0].choices == {"A": "$1$", "B": "$2$", "C": "$3$", "D": "$4$"}
    assert saved[0].ai_content == saved[0].content
    assert saved[0].read_model == "gemini-2.5-pro"


def test_manual_reading_has_no_ai_copy(session):
    import_tasks(session, task_file(read_method="recznie", read_model=None))

    assert session.scalar(select(Task.ai_content)) is None


def test_all_answer_formats_are_accepted(session):
    ids = import_tasks(
        session,
        task_file(
            task(),
            task(
                number=4,
                answer_format="prawda-falsz",
                choices={"1": "Zdanie pierwsze.", "2": "Zdanie drugie."},
                answer="PF",
            ),
            task(
                number=5,
                answer_format="dobieranie",
                choices={"A": "tak", "B": "nie", "1": "bo", "2": "ponieważ", "3": "gdyż"},
                answer="A2",
            ),
            task(number=6, subnumber=1, answer_format="otwarte", choices=None, answer="$x=3$"),
            task(number=6, subnumber=2, answer_format="otwarte", choices=None, answer=None),
        ),
    )

    assert len(ids) == 5


def test_structure_problems_are_listed_together(session):
    broken = task(number=4)
    del broken["max_points"]

    problems = rejected(session, task_file(task(), broken, task(number=5, anwser="C")))

    assert problems == [
        "zadanie 2, pole max_points: brak pola",
        "zadanie 3, pole anwser: nieznane pole",
    ]
    assert task_count(session) == 0


def test_problems_from_different_tasks_are_listed_together(session):
    broken = task(number=4)
    del broken["max_points"]

    problems = rejected(session, task_file(task(content="Oblicz $x"), broken))

    assert problems == [
        "zadanie 1 (maj 2024, nr 3): nieparzysta liczba znaków $",
        "zadanie 2, pole max_points: brak pola",
    ]


def test_one_bad_task_rejects_whole_file(session):
    problems = rejected(session, task_file(task(), task(number=4, content="Oblicz $x")))

    assert problems == ["zadanie 2 (maj 2024, nr 4): nieparzysta liczba znaków $"]
    assert task_count(session) == 0


@pytest.mark.parametrize("latex", [r"\frac{1}{2}", r"2 \times 3", r"x \neq 2"])
def test_single_backslash_from_json_is_caught(session, latex):
    # Tak trafiłby do programu LaTeX zapisany przez Gemini w pliku z jednym ukośnikiem.
    content = json.loads('"Oblicz $' + latex + '$"')

    problems = rejected(session, task_file(task(content=content)))

    assert "zepsuty LaTeX" in problems[0]


@pytest.mark.parametrize(
    ("changes", "problem"),
    [
        ({"answer": "E"}, "etykieta spoza wariantów"),
        ({"choices": None}, "zadanie zamknięte bez wariantów"),
        ({"answer_format": "otwarte"}, "zadanie otwarte nie może mieć wariantów"),
        (
            {"answer_format": "prawda-falsz", "choices": {"1": "a", "2": "b"}, "answer": "PFP"},
            "przy P/F po jednej literze",
        ),
    ],
)
def test_answer_must_match_choices(session, changes, problem):
    problems = rejected(session, task_file(task(**changes)))

    assert problem in problems[0]


def test_unknown_exam_topic_and_source(session):
    assert rejected(session, task_file(exam="matura")) == ["nieznany egzamin matura"]

    problems = rejected(session, task_file(task(source="glowny"), topic="geometria-sferyczna"))

    assert problems == [
        "nieznany temat geometria-sferyczna w egzaminie matura-podstawowa",
        "zadanie 1 (glowny 2024, nr 3): nieznane źródło, dostępne: maj, czerwiec, sierpien, probny",
    ]


def test_task_already_in_database_is_rejected(session):
    import_tasks(session, task_file())

    problems = rejected(session, task_file())

    assert problems[0].startswith("zadanie 1 (maj 2024, nr 3): już jest w bazie")


def test_task_repeated_in_file_is_rejected(session):
    problems = rejected(session, task_file(task(), task()))

    assert problems == ["zadanie 2 (maj 2024, nr 3): powtórzone w pliku"]


def test_not_a_task_file(session):
    assert rejected(session, []) == ["plik: to nie jest obiekt {...}"]


def test_json_in_code_block_is_accepted():
    assert parse_json('```json\n{"exam": "e8"}\n```') == {"exam": "e8"}


def test_broken_json_gets_a_hint():
    # W JSON-ie \s nie jest poprawną sekwencją, więc tekst w ogóle się nie wczyta.
    with pytest.raises(ImportRejected) as error:
        parse_json(r'{"content": "$\sqrt{2}$"}')

    assert "pojedynczy ukośnik" in error.value.problems[0]
