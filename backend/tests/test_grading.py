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


# Odpowiedź OpenRouter w trybie strumienia: linie SSE czytane po kolei, a błąd na liście
# udaje zerwane połączenie w tym miejscu.
class FakeStream:
    def __init__(self, status, lines):
        self.response = httpx2.Response(status, request=httpx2.Request("POST", grading.URL))
        self.lines = lines

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def raise_for_status(self):
        self.response.raise_for_status()

    def iter_lines(self):
        for line in self.lines:
            if isinstance(line, Exception):
                raise line
            yield line


def part(text):
    return "data: " + json.dumps({"choices": [{"delta": {"content": text}}]})


USAGE = 'data: {"choices": [], "usage": {"prompt_tokens": 500, "completion_tokens": 40, "cost": 0.0001}}'

CONVERSATION = [
    {"role": "user", "content": "Jak zacząć?"},
    {"role": "assistant", "content": "Co wiesz o delcie?"},
    {"role": "user", "content": "Nic."},
]


@pytest.fixture
def streams(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "klucz-testowy")
    monkeypatch.setenv("AI_MODELS", "pierwszy,drugi")
    sent = []
    replies = {}

    def fake_stream(method, url, headers, json, timeout):
        sent.append(json)
        return FakeStream(*replies[json["model"]])

    monkeypatch.setattr(httpx2, "stream", fake_stream)
    return sent, replies


def test_answer_comes_in_parts_and_ends_with_the_full_reply(streams):
    sent, replies = streams
    replies["pierwszy"] = (
        200,
        [": OPENROUTER PROCESSING", part("Spróbuj "), "", part("podstawić."), USAGE, "data: [DONE]"],
    )

    *parts, reply = grading.answer_question("Treść zadania", CONVERSATION, checked=True)
    list(grading.answer_question("Treść zadania", CONVERSATION, checked=False))

    assert parts == ["Spróbuj ", "podstawić."]
    assert (reply.text, reply.model, reply.failed) == ("Spróbuj podstawić.", "pierwszy", [])
    assert (reply.input_tokens, reply.output_tokens, reply.cost) == (500, 40, 0.0001)
    assert sent[0]["stream"] is True
    assert sent[0]["messages"][1:] == CONVERSATION
    checked_system, hint_system = (sent[i]["messages"][0]["content"] for i in (0, 1))
    assert grading.AFTER_CHECK in checked_system and grading.HINT_ONLY not in checked_system
    assert grading.HINT_ONLY in hint_system and grading.AFTER_CHECK not in hint_system


def test_second_model_answers_when_the_first_fails_before_any_part(streams):
    sent, replies = streams
    replies["pierwszy"] = (500, [])
    replies["drugi"] = (200, [part("Hej."), "data: [DONE]"])

    *parts, reply = grading.answer_question("Treść zadania", CONVERSATION, checked=True)

    assert parts == ["Hej."]
    assert (reply.model, reply.failed) == ("drugi", ["pierwszy"])


def test_break_after_the_first_part_is_reported_without_a_second_model(streams):
    sent, replies = streams
    replies["pierwszy"] = (200, [part("Spróbuj "), httpx2.ReadError("zerwane połączenie")])
    replies["drugi"] = (200, [part("Inna odpowiedź."), "data: [DONE]"])
    parts = grading.answer_question("Treść zadania", CONVERSATION, checked=True)

    assert next(parts) == "Spróbuj "
    with pytest.raises(grading.StreamBroken):
        next(parts)
    assert len(sent) == 1


def test_no_answering_model_means_unavailable_before_streaming(streams):
    sent, replies = streams
    replies["pierwszy"] = (500, [])
    replies["drugi"] = (200, ["data: [DONE]"])

    with pytest.raises(GradingUnavailable):
        next(grading.answer_question("Treść zadania", CONVERSATION, checked=True))


def test_question_photo_goes_with_the_last_message(streams):
    sent, replies = streams
    replies["pierwszy"] = (200, [part("Widzę wzór."), USAGE, "data: [DONE]"])

    list(grading.answer_question("Treść", CONVERSATION, True, b"hej", "image/png"))

    *earlier, last = sent[0]["messages"][1:]
    assert earlier == CONVERSATION[:-1]
    assert last["content"] == [
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,aGVq"}},
        {"type": "text", "text": CONVERSATION[-1]["content"]},
    ]


def test_changed_board_goes_with_the_previous_version_first(streams):
    sent, replies = streams
    replies["pierwszy"] = (200, [part("Poprawione."), USAGE, "data: [DONE]"])

    previous = [(b"stara", "image/png")]
    list(grading.answer_question("Treść", CONVERSATION, True, b"hej", "image/png", previous))

    assert sent[0]["messages"][-1]["content"] == [
        {"type": "text", "text": "Poprzedni obraz:"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,c3RhcmE="}},
        {"type": "text", "text": "Obraz teraz:"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,aGVq"}},
        {"type": "text", "text": CONVERSATION[-1]["content"]},
    ]


def test_strong_question_goes_to_the_stronger_models(streams, monkeypatch):
    sent, replies = streams
    monkeypatch.setenv("AI_STRONG_MODELS", "mocny,pierwszy")
    replies["mocny"] = (200, [part("Teraz widzę 69."), USAGE, "data: [DONE]"])

    *_, reply = grading.answer_question("Treść", CONVERSATION, True, strong=True)

    assert reply.model == "mocny"
    assert [body["model"] for body in sent] == ["mocny"]
