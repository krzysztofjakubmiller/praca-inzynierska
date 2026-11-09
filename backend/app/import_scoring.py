import sys
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.import_tasks import (
    Dyscalculia,
    ImportRejected,
    Scoring,
    SolutionMethod,
    cke_sections_problems,
    describe,
    dyscalculia_json,
    parse_json,
    scoring_json,
    scoring_problems,
    solutions_json,
)
from app.models import Exam, SourceKind, Task


class TaskNumber(BaseModel):
    number: int = Field(ge=1)
    subnumber: int | None = Field(default=None, ge=1)


# Cztery sekcje jednego zadania z pliku od Gemini. max_points służy tylko do sprawdzenia,
# czy to na pewno to zadanie.
class TaskSections(TaskNumber):
    model_config = ConfigDict(extra="forbid")

    max_points: int = Field(ge=1)
    scoring: Scoring
    solutions: list[SolutionMethod] | None = None
    specific_difficulties: str | None = None
    dyscalculia: Dyscalculia | None = None


# Jeden plik to jeden dokument CKE, więc źródło jest w nagłówku.
class SectionsFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    exam: str
    source: str
    year: int
    month: int = Field(ge=1, le=12)
    tasks: list[dict] = Field(min_length=1)


def task_number(item: TaskNumber) -> str:
    return f"{item.number}.{item.subnumber}" if item.subnumber else str(item.number)


# Dopisuje sekcje z dokumentu CKE do zadań, które są w bazie, i zastępuje poprzednie; status
# zadań się nie zmienia. Zadania spoza bazy są pomijane, bo baza nie ma tych usuniętych
# z podstawy programowej, a dokument CKE je ma. Błąd w zadaniu z bazy odrzuca cały plik.
# Zwraca id zapisanych zadań i numery pominiętych.
def import_scoring(session: Session, data) -> tuple[list[int], list[str]]:
    try:
        file = SectionsFile.model_validate(data)
    except ValidationError as error:
        raise ImportRejected([describe(problem, "plik") for problem in error.errors()]) from None

    exam = session.scalar(select(Exam).where(Exam.code == file.exam))
    if exam is None:
        raise ImportRejected([f"nieznany egzamin {file.exam}"])
    kinds = {
        kind.code: kind.id
        for kind in session.scalars(select(SourceKind).where(SourceKind.exam_id == exam.id))
    }
    if file.source not in kinds:
        raise ImportRejected([f"nieznane źródło {file.source}, dostępne: {', '.join(kinds)}"])

    problems = []
    found = {}
    skipped = []
    for index, raw in enumerate(file.tasks, start=1):
        try:
            key = TaskNumber.model_validate(raw)
        except ValidationError as error:
            problems += [describe(problem, f"zadanie {index}") for problem in error.errors()]
            continue
        task = session.scalar(
            select(Task).where(
                Task.source_kind_id == kinds[file.source],
                Task.year == file.year,
                Task.month == file.month,
                Task.number == key.number,
                Task.subnumber.is_not_distinct_from(key.subnumber),
            )
        )
        if task is None:
            skipped.append(task_number(key))
            continue
        label = f"zadanie {index} (nr {task_number(key)})"
        try:
            item = TaskSections.model_validate(raw)
        except ValidationError as error:
            problems += [describe(problem, label) for problem in error.errors()]
            continue
        if task.id in found:
            problems.append(f"{label}: powtórzone w pliku")
        if item.max_points != task.max_points:
            problems.append(
                f"{label}: w bazie zadanie ma {task.max_points} pkt, a w pliku {item.max_points}"
            )
        sections = scoring_problems(item.scoring, task.answer_format, task.max_points)
        sections += cke_sections_problems(
            item.solutions, item.specific_difficulties, item.dyscalculia, task.answer_format
        )
        problems += [f"{label}: {problem}" for problem in sections]
        found[task.id] = (task, item)

    if problems:
        raise ImportRejected(problems)
    for task, item in found.values():
        task.scoring = scoring_json(item.scoring)
        task.solutions = solutions_json(item.solutions)
        task.specific_difficulties = item.specific_difficulties
        task.dyscalculia = dyscalculia_json(item.dyscalculia)
    session.flush()
    return list(found), skipped


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Użycie: python -m app.import_scoring plik.json")
    text = Path(sys.argv[1]).read_text(encoding="utf-8")

    with SessionLocal() as session:
        try:
            ids, skipped = import_scoring(session, parse_json(text))
        except ImportRejected as rejected:
            print("Plik odrzucony, nic nie zapisano:")
            for problem in rejected.problems:
                print(f"- {problem}")
            sys.exit(1)
        session.commit()
    print(f"Zapisano zasady oceniania zadań: {len(ids)}")
    if skipped:
        print(f"Pominięte, bo nie ma ich w bazie: {', '.join(skipped)}")


if __name__ == "__main__":
    main()
