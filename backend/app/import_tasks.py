import json
import re
import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Exam, SourceKind, Task, Topic


class TaskIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source: str
    year: int
    month: int = Field(ge=1, le=12)
    number: int = Field(ge=1)
    subnumber: int | None = Field(default=None, ge=1)
    max_points: int = Field(ge=1)
    content: str
    has_figure: bool = False
    answer_format: Literal["wielokrotny-wybor", "prawda-falsz", "dobieranie", "otwarte"]
    choices: dict[str, str] | None = None
    answer: str | None = None


class TaskFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exam: str
    topic: str
    read_method: Literal["recznie", "gemini", "inne-ai"]
    read_model: str | None = None
    # Zadania sprawdza osobno TaskIn, żeby błąd w jednym nie ukrywał błędów w pozostałych.
    tasks: list[dict] = Field(min_length=1)


class ImportRejected(Exception):
    def __init__(self, problems: list[str]):
        super().__init__("\n".join(problems))
        self.problems = problems


PYDANTIC_MESSAGES = {
    "missing": "brak pola",
    "extra_forbidden": "nieznane pole",
    "literal_error": "niedozwolona wartość",
    "int_parsing": "to nie jest liczba całkowita",
    "bool_parsing": "to nie jest true ani false",
    "string_type": "to nie jest tekst",
    "greater_than_equal": "za mała wartość",
    "less_than_equal": "za duża wartość",
    "too_short": "pusta lista",
    "model_type": "to nie jest obiekt {...}",
    "dict_type": "to nie jest obiekt {...}",
}


def describe(error, place: str) -> str:
    field = ".".join(str(part) for part in error["loc"])
    if field:
        place += f", pole {field}"
    return f"{place}: {PYDANTIC_MESSAGES.get(error['type'], error['msg'])}"


DOLLAR = re.compile(r"(?<!\\)\$")
# \neq i \notin zapisane w JSON-ie z jednym ukośnikiem zamieniają się w nową linię i "eq", "otin".
LOST_NEWLINE_COMMAND = re.compile(r"\n(eq|otin)")


def text_problems(text: str) -> list[str]:
    problems = []
    # W JSON-ie \f, \t, \b i \r to znaki sterujące, więc \frac z jednym ukośnikiem
    # zamienia się po cichu w niewidoczny znak i "rac".
    if any(ord(char) < 32 and char != "\n" for char in text) or LOST_NEWLINE_COMMAND.search(text):
        problems.append("zepsuty LaTeX, pewnie pojedynczy ukośnik (w JSON-ie trzeba pisać \\\\frac)")
    if len(DOLLAR.findall(text)) % 2:
        problems.append("nieparzysta liczba znaków $")
    return problems


def task_problems(task: TaskIn) -> list[str]:
    problems = text_problems(task.content)
    for label, text in (task.choices or {}).items():
        problems += [f"wariant {label}: {problem}" for problem in text_problems(text)]
    if task.answer is not None:
        problems += [f"odpowiedź: {problem}" for problem in text_problems(task.answer)]

    closed = task.answer_format != "otwarte"
    if closed and not task.choices:
        problems.append("zadanie zamknięte bez wariantów")
    if not closed and task.choices:
        problems.append("zadanie otwarte nie może mieć wariantów")

    # Etykiety mają jeden znak (A-F, 1-3), więc każdy znak odpowiedzi to jedna etykieta.
    if closed and task.choices and task.answer is not None:
        if task.answer_format == "prawda-falsz":
            if len(task.answer) != len(task.choices) or set(task.answer) - {"P", "F"}:
                problems.append(f"odpowiedź {task.answer}: przy P/F po jednej literze P albo F na zdanie")
        elif set(task.answer) - set(task.choices):
            problems.append(f"odpowiedź {task.answer}: etykieta spoza wariantów")
    return problems


def task_label(index: int, task: TaskIn) -> str:
    number = f"{task.number}.{task.subnumber}" if task.subnumber else str(task.number)
    return f"zadanie {index} ({task.source} {task.year}, nr {number})"


# Zapisuje cały plik albo nic: przy jakimkolwiek błędzie rzuca ImportRejected ze wszystkimi
# problemami naraz. Zatwierdzenie transakcji należy do wywołującego.
def import_tasks(session: Session, data) -> int:
    try:
        file = TaskFile.model_validate(data)
    except ValidationError as error:
        raise ImportRejected([describe(problem, "plik") for problem in error.errors()]) from None

    exam = session.scalar(select(Exam).where(Exam.code == file.exam))
    if exam is None:
        raise ImportRejected([f"nieznany egzamin {file.exam}"])

    problems = []
    topic = session.scalar(
        select(Topic).where(Topic.exam_id == exam.id, Topic.code == file.topic)
    )
    if topic is None:
        problems.append(f"nieznany temat {file.topic} w egzaminie {file.exam}")
    kinds = {
        kind.code: kind
        for kind in session.scalars(
            select(SourceKind).where(SourceKind.exam_id == exam.id).order_by(SourceKind.id)
        )
    }

    seen = set()
    tasks = []
    for index, raw in enumerate(file.tasks, start=1):
        try:
            task = TaskIn.model_validate(raw)
        except ValidationError as error:
            problems += [describe(problem, f"zadanie {index}") for problem in error.errors()]
            continue
        tasks.append(task)

        label = task_label(index, task)
        problems += [f"{label}: {problem}" for problem in task_problems(task)]

        kind = kinds.get(task.source)
        if kind is None:
            problems.append(f"{label}: nieznane źródło, dostępne: {', '.join(kinds)}")
            continue
        key = (kind.id, task.year, task.month, task.number, task.subnumber)
        if key in seen:
            problems.append(f"{label}: powtórzone w pliku")
        seen.add(key)
        existing = session.scalar(
            select(Task.id).where(
                Task.source_kind_id == kind.id,
                Task.year == task.year,
                Task.month == task.month,
                Task.number == task.number,
                Task.subnumber.is_not_distinct_from(task.subnumber),
            )
        )
        if existing is not None:
            problems.append(f"{label}: już jest w bazie (id {existing})")

    if problems:
        raise ImportRejected(problems)

    for task in tasks:
        session.add(
            Task(
                exam_id=exam.id,
                topic_id=topic.id,
                source_kind_id=kinds[task.source].id,
                year=task.year,
                month=task.month,
                number=task.number,
                subnumber=task.subnumber,
                max_points=task.max_points,
                content=task.content,
                has_figure=task.has_figure,
                answer_format=task.answer_format,
                choices=task.choices,
                answer=task.answer,
                read_method=file.read_method,
                read_model=file.read_model,
                ai_content=task.content if file.read_method != "recznie" else None,
            )
        )
    session.flush()
    return len(tasks)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Użycie: python -m app.import_tasks plik.json")
    try:
        data = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        sys.exit(
            f"Niepoprawny JSON (wiersz {error.lineno}, kolumna {error.colno}): {error.msg}. "
            "Najczęstsza przyczyna to pojedynczy ukośnik w LaTeX-u."
        )

    with SessionLocal() as session:
        try:
            count = import_tasks(session, data)
        except ImportRejected as rejected:
            print("Plik odrzucony, nic nie zapisano:")
            for problem in rejected.problems:
                print(f"- {problem}")
            sys.exit(1)
        session.commit()
    print(f"Zapisano zadań: {count}")


if __name__ == "__main__":
    main()
