import csv
import json
import sys
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import AiRequest

# Dane do analizy w pracy: zdjęcia trafiają do folderu na dysku i znikają z bazy, a wszystkie
# zapytania razem z nazwami plików zdjęć do zapytania.csv (średnik, tak otwiera go polski Excel).
# Z bazy na serwerze: DATABASE_URL ustawiony na zewnętrzny adres bazy z Rendera.
# Użycie: python -m app.export_ai FOLDER
COLUMNS = [
    "id",
    "created_at",
    "account_id",
    "task_id",
    "solution_id",
    "kind",
    "model",
    "failed_models",
    "prompt_version",
    "text",
    "reply",
    "image_file",
    "input_tokens",
    "output_tokens",
    "cost",
    "seconds",
    "feedback",
    "feedback_comment",
    "tutor_points",
]


def export(session: Session, folder: Path) -> int:
    folder.mkdir(parents=True, exist_ok=True)
    requests = session.scalars(select(AiRequest).order_by(AiRequest.id)).all()
    moved = 0
    for request in requests:
        if request.image is None:
            continue
        name = f"{request.id}.{'png' if request.image_type == 'image/png' else 'jpg'}"
        (folder / name).write_bytes(request.image)
        request.image = None
        request.image_file = name
        moved += 1
    with open(folder / "zapytania.csv", "w", newline="", encoding="utf-8-sig") as file:
        writer = csv.writer(file, delimiter=";")
        writer.writerow(COLUMNS)
        for request in requests:
            writer.writerow(
                [
                    json.dumps(request.failed_models)
                    if column == "failed_models"
                    else getattr(request, column)
                    for column in COLUMNS
                ]
            )
    # Zdjęcia znikają z bazy dopiero po zapisaniu wszystkich plików.
    session.commit()
    return moved


if __name__ == "__main__":
    with SessionLocal() as session:
        moved = export(session, Path(sys.argv[1]))
    print(f"Pobrane zdjęcia: {moved}. Wszystkie zapytania są w zapytania.csv.")
