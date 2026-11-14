import pytest
from sqlalchemy import select

from app.models import SurveyAnswer, SurveyPodium

DEVICE = "0b8f2c1e-5a4d-4f6b-9c3a-7d2e1f0a9b8c"
OTHER_DEVICE = "9e7d5c3b-1a2f-4e6d-8b0c-2f4a6c8e0b1d"


# Ankietę wypełniają osoby bez żadnego hasła.
@pytest.fixture
def client(client):
    client.headers["Authorization"] = ""
    return client


def answer(**changes):
    body = {
        "device_id": DEVICE,
        "looks": 8,
        "expensive": 4,
        "buying": 3,
        "comment": "Ładna, ale za dużo tekstu.",
        "scrolled": 62,
        "seconds": 95,
        "device": "telefon",
        "details": {
            "user_agent": "Mozilla/5.0 (Linux; Android 14)",
            "model": "SM-A546B",
            "system": "Android 14",
            "screen": "390x844@3",
            "viewport": "390x760",
            "language": "pl-PL",
            "touch": True,
            "order": 1,
            "opened_by": "koniec-strony",
            "tried_task": True,
            "blocked_clicks": 2,
        },
    }
    return body | changes


def test_saves_answer_without_password(client, session):
    response = client.put("/api/survey/answers/a", json=answer())

    assert response.status_code == 204
    saved = session.scalars(select(SurveyAnswer)).one()
    assert (saved.device_id, saved.page, saved.looks, saved.scrolled) == (DEVICE, "a", 8, 62)
    assert saved.details["model"] == "SM-A546B"


def test_second_answer_from_device_replaces_first(client, session):
    client.put("/api/survey/answers/a", json=answer())
    client.put("/api/survey/answers/a", json=answer(looks=3, comment="  "))

    saved = session.scalars(select(SurveyAnswer)).one()
    assert saved.looks == 3
    assert saved.comment is None


def test_device_rates_each_page_separately(client, session):
    client.put("/api/survey/answers/a", json=answer())
    client.put("/api/survey/answers/b", json=answer(looks=5))
    client.put("/api/survey/answers/a", json=answer(device_id=OTHER_DEVICE))

    rows = session.scalars(select(SurveyAnswer)).all()
    assert sorted((row.device_id, row.page) for row in rows) == sorted(
        [(DEVICE, "a"), (DEVICE, "b"), (OTHER_DEVICE, "a")]
    )


@pytest.mark.parametrize(
    "changes",
    [{"looks": 11}, {"looks": 0}, {"expensive": 6}, {"buying": 0}, {"scrolled": 101}, {"device": "lodowka"}],
)
def test_rejects_values_out_of_range(client, changes):
    assert client.put("/api/survey/answers/a", json=answer(**changes)).status_code == 422


def test_rejects_unknown_page(client):
    assert client.put("/api/survey/answers/z", json=answer()).status_code == 422


def test_saves_and_replaces_podium(client, session):
    client.put("/api/survey/podium", json={"device_id": DEVICE, "pages": ["c", "a", "j"]})
    response = client.put("/api/survey/podium", json={"device_id": DEVICE, "pages": ["b"]})

    assert response.status_code == 204
    assert session.scalars(select(SurveyPodium)).one().pages == ["b"]


def test_rejects_podium_with_repeated_page(client):
    response = client.put("/api/survey/podium", json={"device_id": DEVICE, "pages": ["a", "a"]})

    assert response.status_code == 422


def test_results_need_panel_password(client):
    assert client.get("/api/panel/survey").status_code == 401


def test_results_list_answers_and_podiums(client):
    client.put("/api/survey/answers/a", json=answer())
    client.put("/api/survey/podium", json={"device_id": DEVICE, "pages": ["a", "d"]})

    response = client.get("/api/panel/survey", headers={"Authorization": "Bearer haslo-panelu"})

    results = response.json()
    assert [(row["page"], row["looks"], row["device"]) for row in results["answers"]] == [
        ("a", 8, "telefon")
    ]
    assert results["podiums"] == [{"device_id": DEVICE, "pages": ["a", "d"]}]
