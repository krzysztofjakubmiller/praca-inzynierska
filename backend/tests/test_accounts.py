from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.accounts import token_hash
from app.models import Account, LoginSession

PASSWORD = "dlugie-haslo-123"


# Konta są za hasłem do aplikacji, a klient z conftest domyślnie wysyła hasło panelu.
@pytest.fixture
def client(client):
    client.headers["Authorization"] = "Bearer haslo-testowe"
    return client


def register(client, email="ola@example.com", password=PASSWORD):
    return client.post("/api/account/register", json={"email": email, "password": password})


def account_with_key(client, key):
    return client.get("/api/account", headers={"Cookie": f"session={key}"})


def add_session(session, key, expires_in):
    account = session.scalar(select(Account))
    session.add(
        LoginSession(
            token_hash=token_hash(key),
            account_id=account.id,
            expires_at=datetime.now(UTC) + expires_in,
        )
    )
    session.flush()


def test_register_logs_in_right_away(client):
    response = register(client)

    assert response.status_code == 201
    assert response.json() == {"email": "ola@example.com"}
    assert client.get("/api/account").json() == {"email": "ola@example.com"}


def test_register_stores_email_in_lowercase_without_spaces(client):
    register(client, email="  Ola@Example.COM ")

    assert client.get("/api/account").json() == {"email": "ola@example.com"}


def test_register_rejects_taken_email_regardless_of_case(client):
    register(client)
    response = register(client, email="OLA@example.com")

    assert response.status_code == 409
    assert response.json() == {"detail": ["Konto z tym adresem już istnieje."]}


@pytest.mark.parametrize(
    "email",
    ["", "ola", "ola@", "@example.com", "ola@@example.com", "o la@example.com", "a@" + "b" * 253],
)
def test_register_rejects_bad_email(client, email):
    response = register(client, email=email)

    assert response.status_code == 422
    assert response.json() == {"detail": ["Niepoprawny adres e-mail."]}


def test_register_rejects_short_password(client):
    response = register(client, password="a" * 11)

    assert response.status_code == 422
    assert response.json() == {"detail": ["Hasło musi mieć co najmniej 12 znaków."]}


def test_register_rejects_too_long_password(client):
    response = register(client, password="a" * 129)

    assert response.status_code == 422
    assert response.json() == {"detail": ["Hasło może mieć najwyżej 128 znaków."]}


def test_register_accepts_password_of_exactly_12_characters(client):
    assert register(client, password="a" * 12).status_code == 201


def test_register_reports_all_problems_at_once(client):
    response = register(client, email="ola", password="krotkie")

    assert response.json() == {
        "detail": ["Niepoprawny adres e-mail.", "Hasło musi mieć co najmniej 12 znaków."]
    }


def test_password_and_session_key_are_not_stored_in_plain_text(client, session):
    register(client)
    account = session.scalar(select(Account))
    login_session = session.scalar(select(LoginSession))

    assert account.password_hash.startswith("$argon2id$v=19$m=19456,t=2,p=1$")
    assert PASSWORD not in account.password_hash
    assert login_session.token_hash == token_hash(client.cookies["session"])
    assert login_session.token_hash != client.cookies["session"]


def test_session_cookie_is_hidden_from_scripts_and_other_sites(client):
    cookie = register(client).headers["set-cookie"].lower()

    assert "httponly" in cookie
    assert "secure" in cookie
    assert "samesite=lax" in cookie
    assert "max-age=1209600" in cookie
    assert "domain" not in cookie


def test_account_requires_login(client):
    response = client.get("/api/account")

    assert response.status_code == 401
    assert response.json() == {"detail": ["Nie zalogowano."]}


def test_unknown_session_key_is_rejected(client):
    assert account_with_key(client, "zmyslony-klucz").status_code == 401


def test_expired_session_is_rejected(client, session):
    register(client)
    add_session(session, "stary-klucz", expires_in=timedelta(minutes=-1))

    assert account_with_key(client, "stary-klucz").status_code == 401


def test_accounts_need_the_access_password(client):
    client.headers["Authorization"] = ""
    response = register(client)

    assert response.status_code == 401
    assert response.json() == {"detail": ["złe hasło"]}


def log_in(client, email="ola@example.com", password=PASSWORD):
    return client.post("/api/account/login", json={"email": email, "password": password})


def test_login_with_correct_password(client):
    register(client)
    client.cookies.clear()

    response = log_in(client)

    assert response.status_code == 204
    assert client.get("/api/account").json() == {"email": "ola@example.com"}


def test_login_ignores_case_and_spaces_in_email(client):
    register(client)
    client.cookies.clear()

    assert log_in(client, email=" OLA@example.com ").status_code == 204


def test_login_accepts_polish_letters_in_password(client):
    register(client, password="zażółć gęślą jaźń")
    client.cookies.clear()

    assert log_in(client, password="zażółć gęślą jaźń").status_code == 204


def test_login_tells_when_there_is_no_account(client):
    response = log_in(client, email="nikt@example.com")

    assert response.status_code == 401
    assert response.json() == {"detail": ["Nie ma konta z tym adresem."]}
    assert "set-cookie" not in response.headers


def test_login_tells_when_password_is_wrong(client):
    register(client)
    client.cookies.clear()

    response = log_in(client, password="inne-dlugie-haslo")

    assert response.status_code == 401
    assert response.json() == {"detail": ["Złe hasło."]}
    assert client.get("/api/account").status_code == 401


def test_login_removes_expired_sessions(client, session):
    register(client)
    add_session(session, "stary-klucz", expires_in=timedelta(minutes=-1))

    log_in(client)

    assert session.get(LoginSession, token_hash("stary-klucz")) is None


def test_logout_ends_the_session(client, session):
    register(client)
    key = client.cookies["session"]

    response = client.post("/api/account/logout")

    assert response.status_code == 204
    assert "max-age=0" in response.headers["set-cookie"].lower()
    assert session.get(LoginSession, token_hash(key)) is None
    assert account_with_key(client, key).status_code == 401


def test_logout_works_without_a_session(client):
    assert client.post("/api/account/logout").status_code == 204


def test_session_is_extended_when_used(client, session):
    register(client)
    add_session(session, "klucz", expires_in=timedelta(days=3))

    response = account_with_key(client, "klucz")

    login_session = session.get(LoginSession, token_hash("klucz"))
    assert login_session.expires_at > datetime.now(UTC) + timedelta(days=13, hours=23)
    assert "max-age=1209600" in response.headers["set-cookie"].lower()


def test_session_is_extended_at_most_once_a_day(client, session):
    register(client)
    add_session(session, "klucz", expires_in=timedelta(days=13, hours=12))
    expires_at = session.get(LoginSession, token_hash("klucz")).expires_at

    response = account_with_key(client, "klucz")

    assert session.get(LoginSession, token_hash("klucz")).expires_at == expires_at
    assert "set-cookie" not in response.headers
