import sys
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.import_tasks import ImportRejected, describe, parse_json
from app.models import Task, TaskTemplate
from app.variants import check_template


class TemplateEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task: int
    template: dict | None = None
    # Zadanie, którego nie da się sensownie zamienić w szablon, np. dowód; liczone osobno.
    skip: str | None = None

    @model_validator(mode="after")
    def template_or_skip(self):
        if (self.template is None) == (self.skip is None):
            raise ValueError("podaj template albo skip")
        return self


class TemplateFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    read_method: Literal["recznie", "gemini", "inne-ai"]
    read_model: str | None = None
    templates: list[TemplateEntry] = Field(min_length=1)


# Inaczej niż import zadań: każdy szablon dostaje swój wynik, także zły, bo do pracy liczy się,
# ile szablonów od AI przechodzi sprawdzanie. Zatwierdzenie transakcji należy do wywołującego.
def import_templates(session: Session, data) -> list[dict]:
    try:
        file = TemplateFile.model_validate(data)
    except ValidationError as error:
        raise ImportRejected([describe(problem, "plik") for problem in error.errors()]) from None

    results = []
    for entry in file.templates:
        if entry.skip is not None:
            results.append({"task": entry.task, "skip": entry.skip})
            continue
        task = session.get(Task, entry.task)
        if task is None:
            problem = "nie ma takiego zadania"
            results.append({"task": entry.task, "passed": False, "problems": [problem]})
            continue
        row = session.get(TaskTemplate, task.id)
        if row is not None and row.review_status == "sprawdzone":
            problem = "zadanie ma już sprawdzony szablon, nie nadpisuję"
            results.append({"task": task.id, "passed": False, "problems": [problem]})
            continue
        check = check_template(task, entry.template)
        if row is None:
            row = TaskTemplate(task_id=task.id, read_method=file.read_method)
            session.add(row)
        # Ręczna poprawka szablonu od AI zostawia kopię od AI i jej model, bo z porównania
        # kopii z poprawionym szablonem wychodzi, ile trzeba było poprawiać.
        if file.read_method != "recznie":
            row.ai_body = entry.template
            row.read_method = file.read_method
            row.read_model = file.read_model
        row.body = entry.template
        row.check_result = check
        results.append({"task": task.id, **check})
    session.flush()
    return results


def summary(results: list[dict]) -> list[str]:
    lines = []
    for result in results:
        if "skip" in result:
            lines.append(f"zadanie {result['task']}: pominięte ({result['skip']})")
            continue
        state = "przeszedł" if result["passed"] else "nie przeszedł"
        line = f"zadanie {result['task']}: {state}"
        if "draws" in result:
            line += f", losowania: {result['successful']}/{result['draws']}"
            line += f", warianty: {result['distinct']}"
        lines.append(line)
        lines += [f"  - {problem}" for problem in result["problems"]]
    checked = [result for result in results if "skip" not in result]
    passed = sum(result["passed"] for result in checked)
    skipped = len(results) - len(checked)
    lines.append(f"Przeszło {passed} z {len(checked)} szablonów, pominięte: {skipped}.")
    return lines


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Użycie: python -m app.import_templates plik.json")
    text = Path(sys.argv[1]).read_text(encoding="utf-8")

    with SessionLocal() as session:
        try:
            results = import_templates(session, parse_json(text))
        except ImportRejected as rejected:
            print("Plik odrzucony, nic nie zapisano:")
            for problem in rejected.problems:
                print(f"- {problem}")
            sys.exit(1)
        session.commit()
    print("\n".join(summary(results)))


if __name__ == "__main__":
    main()
