import json
import sys

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Exam, Task, TaskTemplate, Topic

FIELDS = ("content", "answer_format", "choices", "connector", "figures", "answer", "scoring")


# Zadania tematu do zamiany w szablony przez AI: z id, bo plik szablonów wskazuje zadanie po id,
# i bez zadań, które mają już sprawdzony szablon.
def tasks_for_templates(session, exam: str, topic: str) -> list[dict]:
    checked = select(TaskTemplate.task_id).where(TaskTemplate.review_status == "sprawdzone")
    tasks = session.scalars(
        select(Task)
        .join(Topic, Topic.id == Task.topic_id)
        .join(Exam, Exam.id == Task.exam_id)
        .where(Exam.code == exam, Topic.code == topic, Task.review_status == "sprawdzone")
        .where(Task.id.not_in(checked))
        .order_by(Task.id)
    )
    return [
        {"task": task.id}
        | {field: getattr(task, field) for field in FIELDS if getattr(task, field) is not None}
        for task in tasks
    ]


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit("Użycie: python -m app.export_for_templates matura-podstawowa potegi")
    with SessionLocal() as session:
        tasks = tasks_for_templates(session, sys.argv[1], sys.argv[2])
    print(json.dumps({"tasks": tasks}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
