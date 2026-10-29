import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.import_tasks import (
    ImportRejected,
    Scoring,
    describe,
    parse_json,
    scoring_json,
    scoring_problems,
)
from app.models import Exam, SourceKind, Task


# Zasady jednego zadania z pliku od Gemini. Zadanie wskazuje klucz źródła, jak w bazie,
# a max_points służy tylko do sprawdzenia, czy to na pewno to zadanie.
class TaskScoring(Scoring):
    source: str
    year: int
    month: int = Field(ge=1, le=12)
    number: int = Field(ge=1)
    subnumber: int | None = Field(default=None, ge=1)
    max_points: int = Field(ge=1)


class ScoringFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exam: str
    # Sposób odczytu i model idą do tabel dokładności Gemini, w bazie się ich nie zapisuje.
    read_method: Literal["recznie", "gemini", "inne-ai"]
    read_model: str | None = None
    tasks: list[dict] = Field(min_length=1)


def scoring_label(index: int, item: TaskScoring) -> str:
    number = f"{item.number}.{item.subnumber}" if item.subnumber else str(item.number)
    return f"zadanie {index} ({item.source} {item.year}, nr {number})"


# Dopisuje zasady oceniania do zadań, które już są w bazie. Cały plik albo nic, jak przy
# imporcie zadań; status zadań się nie zmienia. Zwraca id zadań z nowymi zasadami.
def import_scoring(session: Session, data) -> list[int]:
    try:
        file = ScoringFile.model_validate(data)
    except ValidationError as error:
        raise ImportRejected([describe(problem, "plik") for problem in error.errors()]) from None

    exam = session.scalar(select(Exam).where(Exam.code == file.exam))
    if exam is None:
        raise ImportRejected([f"nieznany egzamin {file.exam}"])
    kinds = {
        kind.code: kind.id
        for kind in session.scalars(select(SourceKind).where(SourceKind.exam_id == exam.id))
    }

    problems = []
    found = {}
    for index, raw in enumerate(file.tasks, start=1):
        try:
            item = TaskScoring.model_validate(raw)
        except ValidationError as error:
            problems += [describe(problem, f"zadanie {index}") for problem in error.errors()]
            continue
        label = scoring_label(index, item)
        if item.source not in kinds:
            problems.append(f"{label}: nieznane źródło, dostępne: {', '.join(kinds)}")
            continue
        task = session.scalar(
            select(Task).where(
                Task.source_kind_id == kinds[item.source],
                Task.year == item.year,
                Task.month == item.month,
                Task.number == item.number,
                Task.subnumber.is_not_distinct_from(item.subnumber),
            )
        )
        if task is None:
            problems.append(f"{label}: nie ma takiego zadania w bazie")
            continue
        if task.id in found:
            problems.append(f"{label}: powtórzone w pliku")
        if item.max_points != task.max_points:
            problems.append(
                f"{label}: w bazie zadanie ma {task.max_points} pkt, a w pliku {item.max_points}"
            )
        scoring = Scoring(results=item.results, rules=item.rules, notes=item.notes)
        problems += [
            f"{label}: {problem}"
            for problem in scoring_problems(scoring, task.answer_format, task.max_points)
        ]
        found[task.id] = (task, scoring)

    if problems:
        raise ImportRejected(problems)
    for task, scoring in found.values():
        task.scoring = scoring_json(scoring)
    session.flush()
    return list(found)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Użycie: python -m app.import_scoring plik.json")
    text = Path(sys.argv[1]).read_text(encoding="utf-8")

    with SessionLocal() as session:
        try:
            ids = import_scoring(session, parse_json(text))
        except ImportRejected as rejected:
            print("Plik odrzucony, nic nie zapisano:")
            for problem in rejected.problems:
                print(f"- {problem}")
            sys.exit(1)
        session.commit()
    print(f"Zapisano zasady oceniania zadań: {len(ids)}")


if __name__ == "__main__":
    main()
