import csv
import json

import pytest
from sqlalchemy import select

from app import compare_models
from app.compare_models import compare
from app.export_ai import export
from app.grading import Grade, Reply
from app.models import Account, AiRequest
from tests.test_task import make_task


@pytest.fixture
def ai_grade(session):
    account = Account(email="ola@example.com", password_hash="skrot")
    session.add(account)
    task = make_task(
        session,
        number=22,
        answer_format="otwarte",
        choices=None,
        answer="Szkic dowodu.",
        max_points=2,
        review_status="sprawdzone",
        scoring={"results": [], "rules": "2 pkt – pełny dowód."},
    )
    session.flush()
    request = AiRequest(
        account_id=account.id,
        task_id=task.id,
        kind="ocena",
        image=b"zdjecie",
        image_type="image/jpeg",
        reply=json.dumps(
            {"reading": "2(...)", "readable": True, "points": 1, "explanation": "Brakuje wniosku."}
        ),
        model="anthropic/claude-haiku-5.5",
        failed_models=[],
        prompt_version=2,
        input_tokens=1200,
        output_tokens=300,
        cost=0.0005,
        seconds=3.2,
    )
    session.add(request)
    session.flush()
    return request


def test_panel_lists_ai_grades_and_saves_tutor_points(client, ai_grade, session):
    grades = client.get("/api/panel/ai/grades").json()
    image = client.get(f"/api/panel/ai/grades/{ai_grade.id}/image")
    too_many = client.put(f"/api/panel/ai/grades/{ai_grade.id}/tutor-points", json={"points": 3})
    saved = client.put(f"/api/panel/ai/grades/{ai_grade.id}/tutor-points", json={"points": 2})

    assert (grades[0]["ai_points"], grades[0]["has_image"]) == (1, True)
    assert image.content == b"zdjecie"
    assert too_many.status_code == 422
    assert saved.status_code == 204
    assert ai_grade.tutor_points == 2


def test_export_moves_photos_to_disk_and_writes_all_requests(ai_grade, session, tmp_path):
    moved = export(session, tmp_path)

    assert moved == 1
    assert (tmp_path / f"{ai_grade.id}.jpg").read_bytes() == b"zdjecie"
    assert (ai_grade.image, ai_grade.image_file) == (None, f"{ai_grade.id}.jpg")
    with open(tmp_path / "zapytania.csv", encoding="utf-8-sig") as file:
        rows = list(csv.DictReader(file, delimiter=";"))
    assert rows[0]["image_file"] == f"{ai_grade.id}.jpg"
    assert rows[0]["model"] == "anthropic/claude-haiku-5.5"


def test_compare_grades_exported_photos_with_each_model(ai_grade, session, tmp_path, monkeypatch):
    export(session, tmp_path)
    graded_with = []

    def fake_grade(content, scoring, answer, max_points, image, image_type, text, models):
        graded_with.append((image, image_type, models))
        reply = Reply("{}", models[0], [], 100, 50, 0.0001, 1.0, {"explanation": "OK", "reading": "2(...)"})
        return Grade(points=2, explanation="OK", reading="2(...)", model=models[0], reply=reply)

    monkeypatch.setattr(compare_models, "grade", fake_grade)
    count = compare(session, tmp_path, ["model-a", "model-b"])

    assert count == 1
    assert graded_with == [
        (b"zdjecie", "image/jpeg", ["model-a"]),
        (b"zdjecie", "image/jpeg", ["model-b"]),
    ]
    with open(tmp_path / "porownanie.csv", encoding="utf-8-sig") as file:
        rows = list(csv.DictReader(file, delimiter=";"))
    assert [(row["model"], row["punkty"], row["punkty_w_aplikacji"]) for row in rows] == [
        ("model-a", "2", "1"),
        ("model-b", "2", "1"),
    ]
    assert session.scalar(select(AiRequest.image)) is None
