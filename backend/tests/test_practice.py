from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.accounts import token_hash
from app.models import Account, LoginSession, ReviewCard, Solution
from tests.test_task import make_task

KEY = "klucz-sesji-testowej"
COOKIE = {"Cookie": f"session={KEY}"}


@pytest.fixture
def client(client):
    client.headers["Authorization"] = "Bearer haslo-testowe"
    return client


@pytest.fixture
def account(session):
    account = Account(email="ola@example.com", password_hash="skrot")
    session.add(account)
    session.flush()
    session.add(
        LoginSession(
            token_hash=token_hash(KEY),
            account_id=account.id,
            expires_at=datetime.now(UTC) + timedelta(days=14),
        )
    )
    session.flush()
    return account


@pytest.fixture
def task(session):
    return make_task(session, review_status="sprawdzone")


@pytest.fixture
def open_task(session):
    return make_task(
        session,
        number=20,
        answer_format="otwarte",
        choices=None,
        answer="$x = 3$",
        max_points=2,
        review_status="sprawdzone",
    )


def solve(client, task_id, **body):
    return client.post(
        f"/api/practice/tasks/{task_id}/solution", json={"mode": "cwiczenie"} | body, headers=COOKIE
    )


def rate(client, solution_id, rating):
    return client.post(
        f"/api/practice/solutions/{solution_id}/rating", json={"rating": rating}, headers=COOKIE
    )


def test_task_requires_login(client, task):
    assert client.get(f"/api/practice/tasks/{task.id}").status_code == 401


def test_student_gets_the_task_without_the_answer(client, account, task):
    response = client.get(f"/api/practice/tasks/{task.id}", headers=COOKIE)

    assert response.status_code == 200
    shown = response.json()
    assert "answer" not in shown
    assert "model_answer" not in shown
    assert shown["topic_name"] == "Logarytmy"
    assert shown["source"] == "Maj"
    assert shown["choices"] == {"A": "$1$", "B": "$2$", "C": "$3$", "D": "$4$"}


def test_open_task_shows_the_model_answer_for_self_assessment(client, account, open_task):
    shown = client.get(f"/api/practice/tasks/{open_task.id}", headers=COOKIE).json()

    assert shown["model_answer"] == "$x = 3$"


def test_unchecked_task_is_hidden_from_students(client, account, session):
    task = make_task(session)

    assert client.get(f"/api/practice/tasks/{task.id}", headers=COOKIE).status_code == 404
    assert solve(client, task.id, answer="C").status_code == 404


def test_right_answer_scores_full_points(client, account, task, session):
    response = solve(client, task.id, answer="C")

    assert response.status_code == 200
    assert response.json() | {"id": 0} == {"id": 0, "points": 1, "max_points": 1, "answer": "C"}
    saved = session.scalar(select(Solution))
    assert (saved.account_id, saved.mode, saved.answer, saved.points) == (
        account.id,
        "cwiczenie",
        "C",
        1,
    )


def test_wrong_answer_scores_nothing_and_reveals_the_key(client, account, task):
    response = solve(client, task.id, answer="A")

    assert response.json()["points"] == 0
    assert response.json()["answer"] == "C"


def test_true_false_needs_every_statement_right(client, account, session):
    task = make_task(
        session,
        answer_format="prawda-falsz",
        choices={"1": "Zdanie pierwsze", "2": "Zdanie drugie"},
        answer="PF",
        review_status="sprawdzone",
    )

    assert solve(client, task.id, answer="PF").json()["points"] == 1
    assert solve(client, task.id, answer="PP").json()["points"] == 0


def test_closed_task_needs_an_answer(client, account, task):
    response = solve(client, task.id)

    assert response.status_code == 422
    assert response.json()["detail"] == ["Zaznacz odpowiedź."]


def test_open_task_saves_self_assessed_points(client, account, open_task, session):
    response = solve(client, open_task.id, points=1)

    assert response.json()["points"] == 1
    assert session.scalar(select(Solution.answer)) is None


@pytest.mark.parametrize("points", [None, -1, 3])
def test_open_task_rejects_points_outside_the_task(client, account, open_task, points):
    response = solve(client, open_task.id, points=points)

    assert response.status_code == 422
    assert response.json()["detail"] == ["Podaj liczbę punktów od 0 do 2."]


def test_rating_is_saved_once(client, account, task, session):
    solution_id = solve(client, task.id, answer="C").json()["id"]

    assert rate(client, solution_id, "latwy").status_code == 200
    assert session.get(Solution, solution_id).rating == "latwy"
    assert rate(client, solution_id, "trudny").status_code == 409


def test_wrong_answer_cannot_be_rated_easy(client, account, task):
    solution_id = solve(client, task.id, answer="A").json()["id"]

    assert rate(client, solution_id, "latwy").status_code == 422
    assert rate(client, solution_id, "sredni").status_code == 200


def test_partial_points_cannot_be_rated_easy(client, account, open_task):
    solution_id = solve(client, open_task.id, points=1).json()["id"]

    assert rate(client, solution_id, "latwy").status_code == 422


def test_student_cannot_rate_someone_elses_solution(client, account, task, session):
    other = Account(email="ala@example.com", password_hash="skrot")
    session.add(other)
    session.flush()
    solution = Solution(account_id=other.id, task_id=task.id, mode="losowe", points=1)
    session.add(solution)
    session.flush()

    assert rate(client, solution.id, "sredni").status_code == 404


def test_database_rejects_unknown_mode(session, account, task):
    session.add(Solution(account_id=account.id, task_id=task.id, mode="arkusz", points=0))

    with pytest.raises(IntegrityError):
        session.flush()


def test_deleting_the_account_deletes_its_solutions(session, account, task):
    session.add(Solution(account_id=account.id, task_id=task.id, mode="cwiczenie", points=1))
    session.flush()

    session.delete(account)
    session.flush()

    assert session.scalar(select(Solution)) is None


def next_in_topic(client, *skipped, topic="logarytmy"):
    return client.get(
        f"/api/practice/topic/matura-podstawowa/{topic}/next",
        params={"skipped": list(skipped)},
        headers=COOKIE,
    )


def test_topic_gives_only_unsolved_checked_tasks(client, account, task, session):
    other = make_task(session, number=6, review_status="sprawdzone")
    make_task(session, number=7)
    solve(client, task.id, answer="C")

    response = next_in_topic(client)

    assert response.status_code == 200
    assert response.json()["task"]["id"] == other.id
    assert response.json()["left"] == 1


def test_skipped_task_waits_while_others_are_left(client, account, task, session):
    other = make_task(session, number=6, review_status="sprawdzone")

    for _ in range(5):
        assert next_in_topic(client, task.id).json()["task"]["id"] == other.id


def test_skipped_task_comes_back_when_nothing_else_is_left(client, account, task):
    assert next_in_topic(client, task.id).json()["task"]["id"] == task.id


def test_finished_topic_has_no_next_task(client, account, task):
    solve(client, task.id, answer="A")

    assert next_in_topic(client).json() == {"task": None, "left": 0, "total": 1}


def test_topic_without_tasks_says_so(client, account):
    assert next_in_topic(client, topic="potegi").json() == {"task": None, "left": 0, "total": 0}


def test_unknown_topic_is_rejected(client, account):
    response = next_in_topic(client, topic="nie-ma")

    assert response.status_code == 404
    assert response.json()["detail"] == ["Nie ma takiego tematu."]


def add_card(session, account, task, due):
    card = ReviewCard(account_id=account.id, task_id=task.id, state="powtorka", due=due)
    session.add(card)
    session.flush()
    return card


NOW = datetime.now(UTC)


def test_rating_schedules_the_task(client, account, task, session):
    solution_id = solve(client, task.id, answer="A").json()["id"]

    response = rate(client, solution_id, "bardzo-trudny")

    assert response.json()["after_exam"] is False
    card = session.get(ReviewCard, (account.id, task.id))
    assert card.state == "powtorka"
    assert timedelta(hours=20) < card.due - NOW < timedelta(days=2)


def test_easy_task_comes_back_later_than_a_hard_one(client, account, task, session):
    rate(client, solve(client, task.id, answer="C").json()["id"], "trudny")
    hard_due = session.get(ReviewCard, (account.id, task.id)).due
    other = make_task(session, number=6, review_status="sprawdzone")

    rate(client, solve(client, other.id, answer="C").json()["id"], "latwy")

    assert session.get(ReviewCard, (account.id, other.id)).due > hard_due


def test_task_due_after_the_exam_is_reported(client, account, task, monkeypatch):
    monkeypatch.setattr("app.practice.exam_start", lambda *args: NOW + timedelta(hours=1))
    solution_id = solve(client, task.id, answer="C").json()["id"]

    assert rate(client, solution_id, "sredni").json()["after_exam"] is True


def next_review(client, *skipped, more=False):
    return client.get(
        "/api/practice/reviews/matura-podstawowa/next",
        params={"skipped": list(skipped), "more": more},
        headers=COOKIE,
    ).json()


def test_reviews_give_the_most_overdue_task_first(client, account, task, session):
    other = make_task(session, number=6, review_status="sprawdzone")
    add_card(session, account, task, NOW - timedelta(days=1))
    add_card(session, account, other, NOW - timedelta(days=3))

    review = next_review(client)

    assert review["task"]["id"] == other.id
    assert review["left_today"] == 2
    assert review["cards"] == 2
    assert next_review(client, other.id)["task"]["id"] == task.id


def test_reviews_stop_at_the_daily_limit(client, account, task, session):
    add_card(session, account, task, NOW - timedelta(days=1))
    for _ in range(20):
        session.add(Solution(account_id=account.id, task_id=task.id, mode="powtorka", points=1))
    session.flush()

    review = next_review(client)

    assert review["task"] is None
    assert review["left_today"] == 0
    assert review["limit"] == 20


def test_more_reviews_bring_the_nearest_future_task(client, account, task, session):
    add_card(session, account, task, NOW + timedelta(days=5))

    assert next_review(client)["task"] is None
    assert next_review(client, more=True)["task"]["id"] == task.id


def test_random_gives_only_tasks_already_done(client, account, task, session):
    make_task(session, number=6, review_status="sprawdzone")
    add_card(session, account, task, NOW + timedelta(days=5))

    for _ in range(5):
        response = client.get("/api/practice/random/matura-podstawowa", headers=COOKIE).json()
        assert response["task"]["id"] == task.id


def test_random_prefers_tasks_waiting_for_review(client, account, task, session):
    other = make_task(session, number=6, review_status="sprawdzone")
    add_card(session, account, task, NOW + timedelta(days=5))
    add_card(session, account, other, NOW - timedelta(days=1))

    for _ in range(5):
        response = client.get("/api/practice/random/matura-podstawowa", headers=COOKIE).json()
        assert response["task"]["id"] == other.id


def test_random_keeps_to_the_chosen_topics(client, account, task, session):
    add_card(session, account, task, NOW - timedelta(days=1))

    response = client.get(
        "/api/practice/random/matura-podstawowa", params={"topics": ["potegi"]}, headers=COOKIE
    ).json()

    assert response == {"task": None, "cards": 0}


def test_progress_counts_tasks_done_and_due_per_topic(client, account, task, session):
    other = make_task(session, number=6, review_status="sprawdzone")
    make_task(session, number=7)
    solve(client, task.id, answer="C")
    solve(client, task.id, answer="A")
    add_card(session, account, task, NOW - timedelta(hours=1))
    add_card(session, account, other, NOW + timedelta(days=5))

    response = client.get("/api/practice/progress/matura-podstawowa", headers=COOKIE).json()

    logarithms = response["topics"]["logarytmy"]
    assert (logarithms["total"], logarithms["done"], logarithms["due"]) == (2, 1, 1)
    assert logarithms["recent"] == {"attempts": 2, "correct": 1}
    assert "last_activity" in logarithms
    assert response["last_station"] == "logarytmy"


def test_progress_without_solutions_shows_only_totals(client, account, task):
    response = client.get("/api/practice/progress/matura-podstawowa", headers=COOKIE).json()

    assert response["topics"]["logarytmy"] == {
        "total": 1,
        "done": 0,
        "due": 0,
        "recent": {"attempts": 0, "correct": 0},
    }
    assert response["last_station"] is None


@pytest.fixture
def demo(session):
    return make_task(session, year=2026, number=4, review_status="sprawdzone")


def test_demo_task_works_without_an_account(client, demo, session):
    shown = client.get("/api/practice/demo").json()
    checked = client.post("/api/practice/demo/check", json={"answer": "C"}).json()

    assert shown["id"] == demo.id
    assert "answer" not in shown
    assert checked["points"] == 1
    assert session.scalar(select(Solution)) is None


def test_missing_demo_task_is_reported(client):
    response = client.get("/api/practice/demo")

    assert response.status_code == 404
