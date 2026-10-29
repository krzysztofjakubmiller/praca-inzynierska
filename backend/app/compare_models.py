import csv
import json
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.grading import GradingUnavailable, UnreadableSolution, grade
from app.models import Task
from app.practice import scoring_text

# Ponowna ocena pobranych rozwiązań (folder z export_ai) wybranymi modelami, do porównania
# w pracy z oceną w aplikacji i z oceną korepetytora. Wynik w porownanie.csv w tym samym folderze.
# Użycie: python -m app.compare_models FOLDER model1,model2,...
COLUMNS = [
    "zapytanie",
    "zadanie",
    "model",
    "punkty",
    "punkty_w_aplikacji",
    "punkty_korepetytora",
    "sekundy",
    "koszt",
    "wyjasnienie",
    "odczyt",
]


def compare(session: Session, folder: Path, models: list[str]) -> int:
    with open(folder / "zapytania.csv", encoding="utf-8-sig") as file:
        grades = [row for row in csv.DictReader(file, delimiter=";") if row["kind"] == "ocena"]
    with open(folder / "porownanie.csv", "w", newline="", encoding="utf-8-sig") as file:
        writer = csv.writer(file, delimiter=";")
        writer.writerow(COLUMNS)
        for row in grades:
            task = session.get(Task, int(row["task_id"]))
            image_file = row["image_file"]
            image = (folder / image_file).read_bytes() if image_file else None
            image_type = "image/png" if image_file.endswith(".png") else "image/jpeg"
            if image is None:
                image_type = None
            in_app = json.loads(row["reply"])
            for model in models:
                try:
                    result = grade(
                        task.content,
                        scoring_text(task),
                        task.answer,
                        task.max_points,
                        image,
                        image_type,
                        row["text"] or None,
                        models=[model],
                    )
                    points, reply = result.points, result.reply
                except UnreadableSolution as unreadable:
                    points, reply = "nieczytelne", unreadable.reply
                except GradingUnavailable:
                    writer.writerow([row["id"], task.id, model, "blad"] + [""] * 6)
                    continue
                writer.writerow(
                    [
                        row["id"],
                        task.id,
                        model,
                        points,
                        in_app["points"] if in_app["readable"] else "nieczytelne",
                        row["tutor_points"],
                        reply.seconds,
                        reply.cost,
                        reply.data["explanation"],
                        reply.data["reading"],
                    ]
                )
    return len(grades)


if __name__ == "__main__":
    with SessionLocal() as session:
        count = compare(session, Path(sys.argv[1]), sys.argv[2].split(","))
    print(f"Ocenione rozwiązania: {count}. Wynik w porownanie.csv.")
