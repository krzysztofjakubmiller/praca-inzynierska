import json
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app import grading, practice
from app.accounts import token_hash
from app.grading import Grade, GradingUnavailable, Reply, StreamBroken, UnreadableSolution
from app.models import Account, AiRequest, LoginSession, Profile, ReviewCard, Solution
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
        scoring={
            "results": [{"expected": "$x = 3$", "kind": "liczba"}],
            "rules": "2 pkt – rozwiązanie równania: $x = 3$.",
        },
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
    assert shown["topic_name"] == "Logarytmy"
    assert shown["source"] == "Maj"
    assert shown["choices"] == {"A": "$1$", "B": "$2$", "C": "$3$", "D": "$4$"}


def test_open_task_shows_answer_fields_without_the_key_or_rules(client, account, open_task):
    shown = client.get(f"/api/practice/tasks/{open_task.id}", headers=COOKIE).json()

    assert shown["results"] == [{"kind": "liczba"}]
    assert "scoring" not in shown and "answer" not in shown


def test_open_task_without_scoring_is_hidden_from_students(client, account, open_task, session):
    open_task.scoring = None
    session.flush()

    assert client.get(f"/api/practice/tasks/{open_task.id}", headers=COOKIE).status_code == 404
    assert next_in_topic(client).json()["total"] == 0


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


def test_right_open_result_scores_full_points(client, account, open_task, session):
    response = solve(client, open_task.id, answers=["6/2"])

    assert response.json()["points"] == 2
    saved = session.scalar(select(Solution))
    assert saved.answer is None
    assert saved.open_answer == {"answers": ["6/2"], "checked": "program"}


def test_wrong_open_result_scores_nothing_and_shows_the_key(client, account, open_task):
    response = solve(client, open_task.id, answers=["4"])

    assert response.json()["points"] == 0
    assert response.json()["answer"] == "$x = 3$"


@pytest.mark.parametrize(
    "answers, problem",
    [
        (None, "Wpisz wszystkie wyniki."),
        (["3", "4"], "Wpisz wszystkie wyniki."),
        (["???"], "Nie rozumiem zapisu wyniku. Wpisz go inaczej."),
    ],
)
def test_open_result_must_be_complete_and_readable(client, account, open_task, answers, problem):
    response = solve(client, open_task.id, answers=answers)

    assert response.status_code == 422
    assert response.json()["detail"] == [problem]


def test_parts_score_their_own_points(client, account, session):
    task = make_task(
        session,
        number=21,
        answer_format="otwarte",
        choices=None,
        answer="$6{,}38$, $6{,}5$",
        max_points=2,
        review_status="sprawdzone",
        scoring={
            "results": [
                {"part": "1", "expected": "$6{,}38$", "kind": "liczba", "points": 1},
                {"part": "2", "expected": "$6{,}5$", "kind": "liczba", "points": 1},
            ],
            "rules": "Po 1 pkt za każdą lukę.",
        },
    )

    assert solve(client, task.id, answers=["6,38", "7"]).json()["points"] == 1
    assert solve(client, task.id, answers=["6,38", "6,5"]).json()["points"] == 2


def test_rating_is_saved_once(client, account, task, session):
    solution_id = solve(client, task.id, answer="C").json()["id"]

    assert rate(client, solution_id, "latwy").status_code == 200
    assert session.get(Solution, solution_id).rating == "latwy"
    assert rate(client, solution_id, "trudny").status_code == 409


def test_wrong_answer_cannot_be_rated_easy(client, account, task):
    solution_id = solve(client, task.id, answer="A").json()["id"]

    assert rate(client, solution_id, "latwy").status_code == 422
    assert rate(client, solution_id, "sredni").status_code == 200


def test_wrong_open_result_cannot_be_rated_easy(client, account, open_task):
    solution_id = solve(client, open_task.id, answers=["4"]).json()["id"]

    assert rate(client, solution_id, "latwy").status_code == 422


def add_help(session, account, task, kind):
    request = AiRequest(
        account_id=account.id,
        task_id=task.id,
        kind=kind,
        text="Jak zacząć?" if kind == "pytanie" else None,
        reply="Zacznij od wzoru.",
        model="model-rozmowy",
        failed_models=[],
        prompt_version=6,
        input_tokens=1,
        output_tokens=1,
        seconds=1,
    )
    session.add(request)
    session.flush()
    return request


@pytest.fixture
def judge(monkeypatch):
    calls = []
    verdict = {"rating": "bardzo-trudny", "reason": "Uczeń nie znał wzoru."}

    def fake_judge(task, conversation, rating, model):
        calls.append({"task": task, "conversation": conversation, "rating": rating, "model": model})
        if not verdict:
            raise GradingUnavailable
        reply = model_reply(json.dumps(verdict))
        reply.data = verdict
        return reply

    monkeypatch.setattr(practice, "judge_difficulty", fake_judge)
    return calls, verdict


def difficulty_request(session):
    return session.scalar(select(AiRequest).where(AiRequest.kind == "ocena-trudnosci"))


def test_rating_without_ai_help_skips_the_model(client, account, task, session, judge):
    calls, _ = judge
    solution_id = solve(client, task.id, answer="C").json()["id"]

    rate(client, solution_id, "latwy")

    saved = session.get(Solution, solution_id)
    assert (saved.rating, saved.student_rating) == ("latwy", "latwy")
    assert calls == [] and difficulty_request(session) is None


def test_model_after_a_conversation_can_make_the_rating_harder(
    client, account, task, session, judge
):
    calls, _ = judge
    question = add_help(session, account, task, "pytanie")
    solution_id = solve(client, task.id, answer="A").json()["id"]

    rate(client, solution_id, "sredni")

    saved = session.get(Solution, solution_id)
    assert (saved.rating, saved.student_rating) == ("bardzo-trudny", "sredni")
    [call] = calls
    assert "Odpowiedź zaznaczona przez ucznia: A" in call["task"]
    assert call["conversation"] == [
        {"role": "user", "content": "Jak zacząć?"},
        {"role": "assistant", "content": "Zacznij od wzoru."},
    ]
    assert (call["rating"], call["model"]) == ("sredni", "model-rozmowy")
    saved_reply = difficulty_request(session)
    assert saved_reply.solution_id == solution_id
    assert json.loads(saved_reply.reply)["reason"] == "Uczeń nie znał wzoru."
    assert (saved_reply.input_tokens, saved_reply.cost) == (10, 0.001)
    assert question.solution_id == solution_id


def test_model_cannot_make_the_rating_easier(client, account, task, session, judge):
    _, verdict = judge
    verdict["rating"] = "latwy"
    add_help(session, account, task, "pytanie")
    solution_id = solve(client, task.id, answer="C").json()["id"]

    rate(client, solution_id, "trudny")

    assert session.get(Solution, solution_id).rating == "trudny"


def test_shown_solution_makes_the_rating_at_least_hard_even_without_the_model(
    client, account, task, session, judge
):
    judge[1].clear()
    add_help(session, account, task, "rozwiazanie")
    solution_id = solve(client, task.id, answer="C").json()["id"]

    assert rate(client, solution_id, "latwy").status_code == 200

    saved = session.get(Solution, solution_id)
    assert (saved.rating, saved.student_rating) == ("trudny", "latwy")
    assert difficulty_request(session) is None


def test_student_rating_stays_when_the_model_does_not_answer(client, account, task, session, judge):
    judge[1].clear()
    add_help(session, account, task, "pytanie")
    solution_id = solve(client, task.id, answer="C").json()["id"]

    assert rate(client, solution_id, "sredni").status_code == 200

    assert session.get(Solution, solution_id).rating == "sredni"


def test_help_from_an_earlier_attempt_does_not_count(client, account, task, session, judge):
    calls, _ = judge
    add_help(session, account, task, "rozwiazanie")
    rate(client, solve(client, task.id, answer="C").json()["id"], "trudny")
    second_id = solve(client, task.id, answer="C").json()["id"]

    rate(client, second_id, "latwy")

    assert session.get(Solution, second_id).rating == "latwy"
    assert len(calls) == 1


def spend(session, account, task, cost):
    add_help(session, account, task, "ocena-trudnosci").cost = cost
    session.flush()


def test_ai_stops_when_the_day_costs_reach_the_budget(client, account, task, session):
    spend(session, account, task, practice.AI_DAILY_BUDGET - 0.01)
    assert client.post(f"/api/practice/tasks/{task.id}/ai-solution", headers=COOKIE).status_code == 503

    spend(session, account, task, 0.01)
    response = client.post(f"/api/practice/tasks/{task.id}/ai-solution", headers=COOKIE)

    assert response.status_code == 429


def test_listed_accounts_have_no_ai_budget(client, account, task, session, monkeypatch):
    monkeypatch.setenv("AI_UNLIMITED_EMAILS", "admin@example.com, OLA@example.com")
    spend(session, account, task, 5.0)

    assert client.post(f"/api/practice/tasks/{task.id}/ai-solution", headers=COOKIE).status_code == 503


def test_wrong_open_result_can_be_rated_without_ai_grading(client, account, open_task, session):
    solution_id = solve(client, open_task.id, answers=["5"]).json()["id"]

    assert rate(client, solution_id, "trudny").status_code == 200
    assert session.get(Solution, solution_id).rating == "trudny"


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


@pytest.fixture
def proof(session):
    return make_task(
        session,
        number=22,
        answer_format="otwarte",
        choices=None,
        answer="Szkic dowodu.",
        max_points=2,
        review_status="sprawdzone",
        scoring={"results": [], "rules": "2 pkt – pełny dowód."},
    )


def test_proof_without_ai_grading_gets_no_points_and_can_be_rated(
    client, account, proof, session
):
    shown = client.get(f"/api/practice/tasks/{proof.id}", headers=COOKIE).json()
    response = solve(client, proof.id)

    assert shown["results"] == []
    assert response.json()["points"] == 0
    saved = session.get(Solution, response.json()["id"])
    assert saved.open_answer == {"answers": [], "checked": "bez-oceny"}
    assert rate(client, saved.id, "bardzo-trudny").status_code == 200


def grade(client, task_id, **body):
    return client.post(
        f"/api/practice/tasks/{task_id}/grade", json={"mode": "cwiczenie"} | body, headers=COOKIE
    )


def test_grading_is_unavailable_until_ai_is_connected(client, account, proof, session):
    response = grade(client, proof.id, text="Wyłączam 2 przed nawias.")

    assert response.status_code == 503
    assert response.json()["detail"] == [practice.AI_UNAVAILABLE]
    assert session.scalar(select(Solution)) is None


@pytest.mark.parametrize("body", [{}, {"text": "opis", "image": "aGVq"}])
def test_grading_needs_either_a_photo_or_a_text(client, account, proof, body):
    response = grade(client, proof.id, **body)

    assert response.status_code == 422
    assert response.json()["detail"] == ["Wyślij zdjęcie albo opis rozwiązania."]


def model_reply(text):
    return Reply(
        text=text, model="model", failed=[], input_tokens=10, output_tokens=5, cost=0.001, seconds=1.5
    )


def test_ai_grade_is_saved_with_the_photo_kept_for_analysis(
    client, account, proof, session, monkeypatch
):
    def fake_grade(content, scoring, answer, max_points, **details):
        image, image_type = details["image"], details["image_type"]
        assert scoring.startswith("2 pkt – pełny dowód.")
        assert image == b"hej" and image_type == "image/png"
        return Grade(
            points=1,
            explanation="Brakuje wniosku.",
            reading="2(...)",
            model="model",
            reply=model_reply('{"points": 1}'),
        )

    monkeypatch.setattr(practice, "grade", fake_grade)
    response = grade(client, proof.id, image="aGVq", image_type="image/png")

    assert response.json()["points"] == 1
    assert response.json()["explanation"] == "Brakuje wniosku."
    solution = session.scalar(select(Solution))
    assert solution.open_answer == {
        "answers": [],
        "checked": "ai",
        "model": "model",
        "reading": "2(...)",
    }
    request = session.scalar(select(AiRequest))
    assert (request.kind, request.image, request.solution_id) == ("ocena", b"hej", solution.id)
    assert request.reply == '{"points": 1}'


def test_unreadable_photo_is_kept_without_points(client, account, proof, session, monkeypatch):
    def fake_grade(*args, **kwargs):
        raise UnreadableSolution(model_reply('{"readable": false}'))

    monkeypatch.setattr(practice, "grade", fake_grade)
    response = grade(client, proof.id, image="aGVq", image_type="image/jpeg")

    assert response.status_code == 422
    assert session.scalar(select(Solution)) is None
    assert session.scalar(select(AiRequest.solution_id)) is None


def ask(client, task_id, checked=True):
    return client.post(
        f"/api/practice/tasks/{task_id}/question",
        json={"messages": [{"role": "user", "content": "Od czego zacząć?"}], "checked": checked},
        headers=COOKIE,
    )


def sse_events(response):
    return [
        (block.split("\n")[0].removeprefix("event: "), json.loads(block.split("\n")[1][6:]))
        for block in response.text.strip().split("\n\n")
    ]


def test_question_answer_streams_in_parts_and_is_saved_at_the_end(
    client, account, proof, session, monkeypatch
):
    def fake_answer(task, messages, checked, *image):
        assert "2 pkt – pełny dowód." in task and checked
        assert messages[-1] == {"role": "user", "content": "Od czego zacząć?"}
        yield "Zacznij od "
        yield "wyłączenia czynnika."
        yield model_reply("Zacznij od wyłączenia czynnika.")

    monkeypatch.setattr(practice, "answer_question", fake_answer)
    response = ask(client, proof.id)

    request = session.scalar(select(AiRequest))
    assert response.headers["content-type"].startswith("text/event-stream")
    assert sse_events(response) == [
        ("delta", {"text": "Zacznij od "}),
        ("delta", {"text": "wyłączenia czynnika."}),
        ("done", {"request_id": request.id}),
    ]
    assert (request.text, request.reply) == ("Od czego zacząć?", "Zacznij od wyłączenia czynnika.")


def test_broken_answer_ends_with_an_error_and_saves_nothing(
    client, account, proof, session, monkeypatch
):
    def fake_answer(task, messages, checked, *image):
        yield "Zacznij od "
        raise StreamBroken

    monkeypatch.setattr(practice, "answer_question", fake_answer)
    response = ask(client, proof.id)

    assert [event for event, data in sse_events(response)] == ["delta", "error"]
    assert session.scalar(select(AiRequest)) is None


def test_no_answering_model_is_a_plain_error_before_streaming(client, account, proof, monkeypatch):
    def fake_answer(task, messages, checked, *image):
        raise GradingUnavailable
        yield

    monkeypatch.setattr(practice, "answer_question", fake_answer)
    response = ask(client, proof.id)

    assert response.status_code == 503
    assert response.json()["detail"] == [practice.AI_UNAVAILABLE]


def test_closed_task_question_gets_choices_and_answer_for_a_hint(
    client, account, task, monkeypatch
):
    def fake_answer(task_text, messages, checked, *image):
        assert "Odpowiedzi do wyboru:" in task_text and "Poprawna odpowiedź: C" in task_text
        assert not checked
        yield model_reply("Pomyśl, co dzieje się z wykładnikiem.")

    monkeypatch.setattr(practice, "answer_question", fake_answer)

    assert sse_events(ask(client, task.id, checked=False))[0][0] == "done"


def fake_grades(monkeypatch, *points):
    replies = iter(points)

    def fake_grade(*args, **details):
        given = next(replies)
        data = {"reading": f"odczyt {given}", "explanation": f"Za {given} pkt.", "points": given}
        reply = model_reply(json.dumps(data))
        return Grade(
            points=given,
            explanation=data["explanation"],
            reading=data["reading"],
            model="model",
            reply=reply,
        )

    monkeypatch.setattr(practice, "grade", fake_grade)


def test_regrading_a_wrong_solution_keeps_the_best_points(
    client, account, open_task, session, monkeypatch
):
    fake_grades(monkeypatch, 0, 2, 1)
    solution_id = solve(client, open_task.id, answers=["5"]).json()["id"]

    responses = [
        grade(client, open_task.id, solution_id=solution_id, image="aGVq", image_type="image/png")
        for _ in range(3)
    ]

    assert [response.json()["points"] for response in responses] == [0, 2, 2]
    assert responses[2].json()["explanation"] == "Za 1 pkt."
    assert {response.json()["id"] for response in responses} == {solution_id}
    saved = session.get(Solution, solution_id)
    assert saved.open_answer == {
        "answers": ["5"],
        "checked": "ai",
        "model": "model",
        "reading": "odczyt 2",
    }
    requests = session.scalars(select(AiRequest)).all()
    assert [request.solution_id for request in requests] == [solution_id] * 3


def test_regrading_needs_the_students_own_solution(client, account, open_task, session):
    other = Account(email="ala@example.com", password_hash="skrot")
    session.add(other)
    session.flush()
    solution = Solution(account_id=other.id, task_id=open_task.id, mode="losowe", points=0)
    session.add(solution)
    session.flush()

    response = grade(client, open_task.id, solution_id=solution.id, text="opis")

    assert response.status_code == 404


def test_checked_question_knows_the_student_answer_and_every_ai_grade(
    client, account, open_task, session, monkeypatch
):
    seen = []

    def fake_answer(task_text, messages, checked, image, image_type, previous, strong):
        seen.append(task_text)
        yield model_reply("Spójrz na przeniesienie.")

    fake_grades(monkeypatch, 0, 1)
    monkeypatch.setattr(practice, "answer_question", fake_answer)
    solution_id = solve(client, open_task.id, answers=["2"]).json()["id"]
    grade(client, open_task.id, solution_id=solution_id, text="tablica")
    grade(client, open_task.id, solution_id=solution_id, text="kartka")

    sse_events(ask(client, open_task.id, checked=True))

    assert "Wyniki wpisane przez ucznia: 2" in seen[0]
    assert "Punkty po sprawdzeniu: 1 z 2" in seen[0]
    assert "Wyjaśnienie oceny dla ucznia: Za 0 pkt." in seen[0]
    assert "Wyjaśnienie oceny dla ucznia: Za 1 pkt." in seen[0]


def test_photo_and_strong_model_request_go_to_the_model_and_the_photo_is_saved(
    client, account, task, session, monkeypatch
):
    sent = []

    def fake_answer(task_text, messages, checked, image, image_type, previous, strong):
        sent.append((image, image_type, strong))
        yield model_reply("Widzę, że zaczynasz od wzoru.")

    monkeypatch.setattr(practice, "answer_question", fake_answer)
    response = client.post(
        f"/api/practice/tasks/{task.id}/question",
        json={
            "messages": [{"role": "user", "content": "Dobrze zaczynam?"}],
            "checked": False,
            "image": "aGVq",
            "image_type": "image/png",
            "strong": True,
        },
        headers=COOKIE,
    )

    assert sse_events(response)[-1][0] == "done"
    assert sent == [(b"hej", "image/png", True)]
    request = session.scalar(select(AiRequest))
    assert (request.kind, request.image, request.image_type) == ("pytanie", b"hej", "image/png")


def test_question_sees_the_latest_image_and_the_previous_one_when_it_changed(
    client, account, task, session, monkeypatch
):
    sent = []

    def fake_answer(task_text, messages, checked, image, image_type, previous, strong):
        sent.append((messages[-1]["content"], image, previous))
        yield model_reply("Widzę.")

    monkeypatch.setattr(practice, "answer_question", fake_answer)
    # "aGVq" to b"hej", "aW5uZQ==" to b"inne": pierwsza tablica, pytanie bez zmian, nowa tablica.
    for image in ("aGVq", None, "aW5uZQ=="):
        question = {"messages": [{"role": "user", "content": "Co dalej?"}], "checked": False}
        if image:
            question |= {"image": image, "image_type": "image/png"}
        sse_events(
            client.post(f"/api/practice/tasks/{task.id}/question", json=question, headers=COOKIE)
        )

    assert sent == [
        ("Co dalej?", b"hej", None),
        ("(Obraz dołączony wcześniej, bez zmian.)\nCo dalej?", b"hej", None),
        ("Co dalej?", b"inne", [(b"hej", "image/png")]),
    ]
    saved = session.scalars(select(AiRequest).order_by(AiRequest.id)).all()
    assert [(request.text, request.image) for request in saved] == [
        ("Co dalej?", b"hej"),
        ("Co dalej?", None),
        ("Co dalej?", b"inne"),
    ]


def test_student_feedback_is_saved_with_a_comment(client, account, proof, session, monkeypatch):
    monkeypatch.setattr(
        practice, "show_solution", lambda task: iter(["Krok 1.", model_reply("Krok 1.")])
    )
    shown = client.post(f"/api/practice/tasks/{proof.id}/ai-solution", headers=COOKIE)
    (_, delta), (_, done) = sse_events(shown)

    assert delta == {"text": "Krok 1."}
    assert session.scalar(select(AiRequest.kind)) == "rozwiazanie"
    response = client.post(
        f"/api/practice/ai-requests/{done['request_id']}/feedback",
        json={"feedback": "nie-pomoglo", "comment": "Za krótko."},
        headers=COOKIE,
    )

    assert response.status_code == 204
    request = session.scalar(select(AiRequest))
    assert (request.feedback, request.feedback_comment) == ("nie-pomoglo", "Za krótko.")


def test_preview_shows_what_was_read(client):
    read = client.post("/api/practice/read", json={"kind": "liczba", "text": "1/4"}).json()
    unreadable = client.post("/api/practice/read", json={"kind": "liczba", "text": "???"}).json()

    assert read["latex"] == "\\frac{1}{4}"
    assert unreadable == {"latex": None}


@pytest.fixture
def full_task(session):
    return make_task(
        session,
        number=23,
        answer_format="otwarte",
        choices=None,
        answer="$x = 3$",
        max_points=2,
        review_status="sprawdzone",
        scoring={
            "results": [{"expected": "$x = 3$", "kind": "liczba"}],
            "rules": "2 pkt – rozwiązanie równania.",
            "notes": "Uwaga standardowa.",
        },
        solutions=[{"name": "Sposób I", "content": "Sposób-z-CKE."}],
        specific_difficulties="Kryterium-S.",
        dyscalculia={"rules": "Kryterium-D.", "notes": "Uwaga-D."},
    )


def set_difficulties(session, account, difficulties):
    session.add(
        Profile(
            account_id=account.id,
            level="podstawowa",
            exam_year=2027,
            theme="light",
            dark_shade="grey",
            daily_reviews="srednio",
            learning_difficulties=difficulties,
        )
    )
    session.flush()


# Cały tekst, który dostaje model: przechwycony na samym końcu, tuż przed wysłaniem.
def text_sent_to_model(client, monkeypatch, task, path, body):
    sent = []

    def fake_ask(system, messages, *args, **kwargs):
        sent.append(system + str(messages))
        return Reply(
            text="{}",
            model="model",
            failed=[],
            input_tokens=1,
            output_tokens=1,
            cost=None,
            seconds=0.1,
            data={"reading": "x", "readable": True, "points": 1, "explanation": "Dobrze."},
        )

    monkeypatch.setattr(grading, "ask", fake_ask)
    # „Dopytaj się” idzie strumieniem, a nie przez ask.
    monkeypatch.setattr(grading, "stream", lambda system, messages, *image: iter([fake_ask(system, messages)]))
    response = client.post(f"/api/practice/tasks/{task.id}/{path}", json=body, headers=COOKIE)
    assert response.status_code == 200
    return sent[0]


GRADE_BODY = {"mode": "cwiczenie", "text": "Moje rozwiązanie."}
SPECIAL_WORDS = ("Kryterium-S", "Kryterium-D", "Uwaga-D", "dyskalkul", "specyficzn", "opinię")


def assert_no_special_rules(text):
    for word in SPECIAL_WORDS:
        assert word.lower() not in text.lower(), word


@pytest.mark.parametrize("with_profile", [False, True])
def test_without_difficulties_model_knows_nothing_about_special_rules(
    client, account, full_task, session, monkeypatch, with_profile
):
    if with_profile:
        set_difficulties(session, account, "brak")

    text = text_sent_to_model(client, monkeypatch, full_task, "grade", GRADE_BODY)

    assert_no_special_rules(text)
    assert "2 pkt – rozwiązanie równania." in text
    assert "Uwaga standardowa." in text
    assert "Uwagi ogólne:" in text
    assert "Sposób-z-CKE." in text


def test_specific_difficulties_come_first_and_dyscalculia_stays_hidden(
    client, account, full_task, session, monkeypatch
):
    set_difficulties(session, account, "specyficzne")

    text = text_sent_to_model(client, monkeypatch, full_task, "grade", GRADE_BODY)

    assert text.index("Kryterium-S.") < text.index("2 pkt – rozwiązanie równania.")
    assert "pierwszeństwo" in text
    for word in ("Kryterium-D", "Uwaga-D", "dyskalkul"):
        assert word.lower() not in text.lower(), word


def test_dyscalculia_comes_first_and_standard_rules_stay(
    client, account, full_task, session, monkeypatch
):
    set_difficulties(session, account, "dyskalkulia")

    text = text_sent_to_model(client, monkeypatch, full_task, "grade", GRADE_BODY)

    assert (
        text.index("Nie należy traktować jako błędy merytoryczne")
        < text.index("Kryterium-D.")
        < text.index("Kryterium-S.")
        < text.index("2 pkt – rozwiązanie równania.")
    )
    assert "Uwaga-D." in text


@pytest.mark.parametrize(
    "path, body",
    [("ai-solution", {}), ("question", {"messages": [{"role": "user", "content": "Jak?"}], "checked": True})],
)
def test_tutor_never_gets_special_rules_but_gets_solutions(
    client, account, full_task, session, monkeypatch, path, body
):
    set_difficulties(session, account, "dyskalkulia")

    text = text_sent_to_model(client, monkeypatch, full_task, path, body)

    assert_no_special_rules(text)
    assert "Sposób-z-CKE." in text


def test_student_never_gets_cke_sections(client, account, full_task, session):
    set_difficulties(session, account, "dyskalkulia")

    shown = client.get(f"/api/practice/tasks/{full_task.id}", headers=COOKIE).text

    for word in ("Sposób-z-CKE", "Kryterium-S", "Kryterium-D", "Uwaga standardowa"):
        assert word not in shown
