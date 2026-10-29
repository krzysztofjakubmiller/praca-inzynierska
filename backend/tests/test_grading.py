import json

import httpx2
import pytest

from app import grading
from app.grading import GradingUnavailable, UnreadableSolution, grade


def answer(data: dict) -> dict:
    return {
        "choices": [{"message": {"content": json.dumps(data)}}],
        "usage": {"prompt_tokens": 1200, "completion_tokens": 300, "cost": 0.0003},
    }


GOOD = {"reading": "$2x = 6$", "readable": True, "points": 1, "explanation": "Brakuje wniosku."}


@pytest.fixture
def openrouter(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "klucz-testowy")
    monkeypatch.setenv("AI_MODELS", "pierwszy,drugi")
    sent = []
    replies = {}

    def fake_post(url, headers, json, timeout):
        sent.append(json)
        status, body = replies[json["model"]]
        return httpx2.Response(status, json=body, request=httpx2.Request("POST", url))

    monkeypatch.setattr(httpx2, "post", fake_post)
    return sent, replies


def grade_text():
    return grade("Treść", "2 pkt – dowód.", "$x = 3$", 2, text="2x = 6")


def test_second_model_answers_when_the_first_fails(openrouter):
    sent, replies = openrouter
    replies["pierwszy"] = (500, {"error": "awaria"})
    replies["drugi"] = (200, answer(GOOD))

    result = grade_text()

    assert (result.points, result.model) == (1, "drugi")
    assert result.reply.failed == ["pierwszy"]
    assert result.reply.cost == 0.0003


def test_reply_without_required_fields_counts_as_failure(openrouter):
    sent, replies = openrouter
    replies["pierwszy"] = (200, answer({"points": 2}))
    replies["drugi"] = (200, answer(GOOD))

    assert grade_text().model == "drugi"


def test_no_working_model_or_no_key_means_unavailable(openrouter, monkeypatch):
    sent, replies = openrouter
    replies["pierwszy"] = replies["drugi"] = (503, {})

    with pytest.raises(GradingUnavailable):
        grade_text()
    monkeypatch.delenv("OPENROUTER_API_KEY")
    with pytest.raises(GradingUnavailable):
        grade_text()


def test_points_stay_within_the_task_maximum(openrouter):
    sent, replies = openrouter
    replies["pierwszy"] = (200, answer(GOOD | {"points": 7}))

    assert grade_text().points == 2


def test_unreadable_photo_is_reported_with_the_reply(openrouter):
    sent, replies = openrouter
    replies["pierwszy"] = (200, answer(GOOD | {"readable": False}))

    with pytest.raises(UnreadableSolution) as error:
        grade("Treść", "Zasady", "$x = 3$", 2, image=b"hej", image_type="image/png")

    assert error.value.reply.model == "pierwszy"
    photo, text = sent[0]["messages"][1]["content"]
    assert photo["image_url"]["url"] == "data:image/png;base64,aGVq"
    assert "Rozwiązanie ucznia jest na obrazie." in text["text"]


def test_question_sends_the_whole_conversation(openrouter):
    sent, replies = openrouter
    replies["pierwszy"] = (200, {"choices": [{"message": {"content": "Spróbuj podstawić."}}]})
    conversation = [
        {"role": "user", "content": "Jak zacząć?"},
        {"role": "assistant", "content": "Co wiesz o delcie?"},
        {"role": "user", "content": "Nic."},
    ]

    reply = grading.answer_question("Treść", "Zasady", "$x = 3$", conversation)

    assert reply.text == "Spróbuj podstawić."
    assert sent[0]["messages"][1:] == conversation
    assert "response_format" not in sent[0]
