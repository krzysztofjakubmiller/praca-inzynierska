from app.models import TaskTemplate
from tests.test_task import make_task
from tests.test_variants import POWERS, powers_template


def test_task_without_template_gives_null(client, session):
    task = make_task(session, **POWERS)

    response = client.get(f"/api/panel/tasks/{task.id}/template")

    assert response.status_code == 200
    assert response.json() is None


def test_template_requires_panel_password(client, session):
    task = make_task(session, **POWERS)
    client.headers["Authorization"] = "Bearer haslo-testowe"

    assert client.get(f"/api/panel/tasks/{task.id}/template").status_code == 401


def test_saved_template_is_checked_and_previewed(client, session):
    task = make_task(session, **POWERS)

    details = client.put(f"/api/panel/tasks/{task.id}/template", json={"body": powers_template()}).json()

    assert details["review_status"] == "do-sprawdzenia"
    assert details["read_method"] == "recznie"
    assert details["check_result"]["passed"] is True
    original, *variants = details["preview"]
    assert original["variant"] is None
    assert original["content"] == "Liczba $2^{3} \\cdot 2^{4}$ jest równa"
    assert original["answer"] == "A"
    assert 1 <= len(variants) <= 3
    assert all(set(variant["variant"]) == {"a", "b", "c"} for variant in variants)


def test_fix_in_panel_keeps_the_ai_copy(client, session):
    task = make_task(session, **POWERS)
    session.add(
        TaskTemplate(
            task_id=task.id,
            body={"od": "ai"},
            ai_body={"od": "ai"},
            read_method="gemini",
            read_model="gemini-2.5-pro",
            review_status="sprawdzone",
            check_result={"passed": False},
        )
    )
    session.flush()

    details = client.put(f"/api/panel/tasks/{task.id}/template", json={"body": powers_template()}).json()

    assert details["ai_body"] == {"od": "ai"}
    assert (details["read_method"], details["read_model"]) == ("gemini", "gemini-2.5-pro")
    assert details["review_status"] == "do-sprawdzenia"


def test_accept_marks_template_as_checked(client, session):
    task = make_task(session, **POWERS)
    client.put(f"/api/panel/tasks/{task.id}/template", json={"body": powers_template()})

    response = client.post(f"/api/panel/tasks/{task.id}/template/accept")

    assert response.status_code == 200
    assert response.json()["review_status"] == "sprawdzone"
    assert session.get(TaskTemplate, task.id).reviewed_at is not None


def test_failing_template_cannot_be_accepted(client, session):
    task = make_task(session, **POWERS)
    client.put(f"/api/panel/tasks/{task.id}/template", json={"body": powers_template(answer="B")})

    response = client.post(f"/api/panel/tasks/{task.id}/template/accept")

    assert response.status_code == 422
    assert response.json()["detail"] == ["klucz B zamiast A"]
    assert session.get(TaskTemplate, task.id).review_status == "do-sprawdzenia"


def test_template_can_be_deleted(client, session):
    task = make_task(session, **POWERS)
    client.put(f"/api/panel/tasks/{task.id}/template", json={"body": powers_template()})

    assert client.delete(f"/api/panel/tasks/{task.id}/template").status_code == 204
    assert session.get(TaskTemplate, task.id) is None
    assert client.delete(f"/api/panel/tasks/{task.id}/template").status_code == 404
