import json

from sqlalchemy import select

from app.models import Task

EDITABLE = [
    "topic",
    "source",
    "year",
    "month",
    "number",
    "subnumber",
    "max_points",
    "content",
    "has_figure",
    "answer_format",
    "choices",
    "answer",
    "review_status",
]


def import_tasks(client, *numbers):
    data = {
        "exam": "matura-podstawowa",
        "topic": "logarytmy",
        "read_method": "gemini",
        "read_model": "gemini-2.5-pro",
        "tasks": [
            {
                "source": "maj",
                "year": 2024,
                "month": 5,
                "number": number,
                "max_points": 1,
                "content": f"Zadanie {number}: oblicz $\\log_2 8$",
                "answer_format": "otwarte",
                "answer": "$3$",
            }
            for number in numbers
        ],
    }
    response = client.post("/api/panel/import", json={"text": json.dumps(data)})
    assert response.status_code == 200
    return response.json()["ids"]


def edit(client, task_id, **changes):
    task = client.get(f"/api/panel/tasks/{task_id}").json()
    body = {key: task[key] for key in EDITABLE} | changes
    return client.put(f"/api/panel/tasks/{task_id}", json=body)


def test_options_list_topics_and_sources_of_each_exam(client):
    exams = {exam["code"]: exam for exam in client.get("/api/panel/options").json()}

    assert len(exams["matura-podstawowa"]["topics"]) == 23
    assert [source["name"] for source in exams["matura-podstawowa"]["sources"]] == [
        "Maj",
        "Czerwiec",
        "Sierpień",
        "Próbny",
    ]
    assert exams["e8"]["topics"] == []


def test_imported_tasks_are_listed_for_review(client):
    ids = import_tasks(client, 1, 2)

    listed = client.get("/api/panel/tasks", params={"status": "do-sprawdzenia"}).json()

    assert [task["id"] for task in listed] == ids
    assert listed[0]["topic"] == "Logarytmy"
    assert listed[0]["source"] == "Maj"


def test_import_problems_are_returned(client):
    response = client.post("/api/panel/import", json={"text": "{"})

    assert response.status_code == 422
    assert response.json()["detail"][0].startswith("niepoprawny JSON")


def test_task_details_use_codes(client):
    [task_id] = import_tasks(client, 1)

    task = client.get(f"/api/panel/tasks/{task_id}").json()

    assert (task["exam"], task["topic"], task["source"]) == ("matura-podstawowa", "logarytmy", "maj")
    assert task["ai_content"] == task["content"]


def test_marking_as_reviewed_sets_the_date(client, session):
    [task_id] = import_tasks(client, 1)

    response = edit(client, task_id, content="Poprawiona treść", review_status="sprawdzone")

    assert response.status_code == 200
    assert response.json()["review_status"] == "sprawdzone"
    task = session.get(Task, task_id)
    assert task.content == "Poprawiona treść"
    assert task.ai_content != task.content
    assert task.reviewed_at is not None

    edit(client, task_id, review_status="do-sprawdzenia")
    session.refresh(task)
    assert task.reviewed_at is None


def test_edit_uses_import_rules(client):
    [task_id] = import_tasks(client, 1)

    response = edit(client, task_id, content="Oblicz $x", answer=None, review_status="sprawdzone")

    assert response.status_code == 422
    assert response.json()["detail"] == [
        "nieparzysta liczba znaków $",
        "sprawdzone zadanie musi mieć odpowiedź",
    ]


def test_edit_cannot_create_duplicate(client):
    first, second = import_tasks(client, 1, 2)

    response = edit(client, second, number=1)

    assert response.status_code == 422
    assert "już jest w bazie" in response.json()["detail"][0]


def test_deleted_task_is_gone(client, session):
    [task_id] = import_tasks(client, 1)

    assert client.delete(f"/api/panel/tasks/{task_id}").status_code == 204
    assert client.get(f"/api/panel/tasks/{task_id}").status_code == 404
    assert session.scalar(select(Task.id)) is None


def test_next_task_skips_reviewed_and_wraps_around(client):
    first, second, third = import_tasks(client, 1, 2, 3)
    edit(client, first, review_status="sprawdzone")

    assert client.get("/api/panel/next", params={"after": first}).json() == {"id": second}
    assert client.get("/api/panel/next", params={"after": third}).json() == {"id": second}
