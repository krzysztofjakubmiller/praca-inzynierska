import re
import smtplib
from datetime import UTC, datetime, timedelta

import pytest
from google.oauth2 import id_token
from sqlalchemy import func, select

from app import mail
from app.accounts import token_hash
from app.models import Account, LoginSession, PasswordLink, Registration

PASSWORD = "dlugie-haslo-123"


# Konta są za hasłem do aplikacji, a klient z conftest domyślnie wysyła hasło panelu.
@pytest.fixture
def client(client):
    client.headers["Authorization"] = "Bearer haslo-testowe"
    return client


# Maile nie wychodzą z testów: trafiają do listy, z której testy wyciągają linki.
@pytest.fixture(autouse=True)
def mailbox(monkeypatch):
    sent = []
    monkeypatch.setattr(
        mail, "send_email", lambda to, subject, text: sent.append((to, subject, text))
    )
    return sent


def link_key(mailbox):
    return re.search(r"klucz=([\w-]+)", mailbox[-1][2]).group(1)


def register(client, email="ola@example.com", password=PASSWORD, accepted_terms=True):
    return client.post(
        "/api/account/register",
        json={"email": email, "password": password, "accepted_terms": accepted_terms},
    )


def confirm(client, key):
    return client.post("/api/account/confirm", json={"key": key})


def create_account(client, mailbox, email="ola@example.com", password=PASSWORD):
    register(client, email, password)
    return confirm(client, link_key(mailbox))


def log_in(client, email="ola@example.com", password=PASSWORD):
    return client.post("/api/account/login", json={"email": email, "password": password})


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


def test_register_sends_a_link_and_creates_no_account_yet(client, session, mailbox):
    response = register(client)

    assert response.status_code == 202
    assert response.json() == {"email": "ola@example.com"}
    [(to, subject, text)] = mailbox
    assert to == "ola@example.com"
    assert subject == "Potwierdź adres e-mail"
    assert "http://localhost:5173/potwierdz-adres?klucz=" in text
    assert session.scalar(select(Account)) is None
    assert "set-cookie" not in response.headers


def test_link_from_the_email_creates_the_account_and_logs_in(client, mailbox):
    register(client)

    response = confirm(client, link_key(mailbox))

    assert response.status_code == 204
    assert client.get("/api/account").json()["email"] == "ola@example.com"


def test_link_works_only_once(client, mailbox):
    register(client)
    key = link_key(mailbox)
    confirm(client, key)

    response = confirm(client, key)

    assert response.status_code == 400
    assert response.json() == {
        "detail": ["Link wygasł albo został już użyty. Zarejestruj się jeszcze raz."]
    }


def test_link_expires_after_a_day(client, session, mailbox):
    register(client)
    session.scalar(select(Registration)).expires_at = datetime.now(UTC) - timedelta(minutes=1)
    session.flush()

    assert confirm(client, link_key(mailbox)).status_code == 400
    assert session.scalar(select(Account)) is None


def test_second_registration_cancels_the_first_link(client, mailbox):
    register(client, password="pierwsze-haslo-1")
    first_key = link_key(mailbox)
    register(client, password="drugie-haslo-22")

    assert confirm(client, first_key).status_code == 400
    assert confirm(client, link_key(mailbox)).status_code == 204
    client.cookies.clear()
    assert log_in(client, password="drugie-haslo-22").status_code == 204


def test_login_before_confirming_asks_for_the_link(client):
    register(client)

    response = log_in(client)

    assert response.status_code == 401
    assert response.json() == {"detail": ["Potwierdź adres. Wysłaliśmy link na ten adres."]}


def test_failed_email_leaves_no_registration(client, session, monkeypatch):
    def broken_mail(to, subject, text):
        raise smtplib.SMTPException("serwer pocztowy nie odpowiada")

    monkeypatch.setattr(mail, "send_email", broken_mail)

    response = register(client)

    assert response.status_code == 502
    assert response.json() == {"detail": ["Nie udało się wysłać maila. Spróbuj za chwilę."]}
    assert session.scalar(select(Registration)) is None


def test_register_stores_email_in_lowercase_without_spaces(client, mailbox):
    create_account(client, mailbox, email="  Ola@Example.COM ")

    assert client.get("/api/account").json()["email"] == "ola@example.com"


def test_register_rejects_taken_email_regardless_of_case(client, mailbox):
    create_account(client, mailbox)

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
    assert register(client, password="a" * 12).status_code == 202


def test_register_reports_all_problems_at_once(client):
    response = register(client, email="ola", password="krotkie")

    assert response.json() == {
        "detail": ["Niepoprawny adres e-mail.", "Hasło musi mieć co najmniej 12 znaków."]
    }


def test_waiting_registration_keeps_only_hashes(client, session, mailbox):
    register(client)

    registration = session.scalar(select(Registration))
    assert registration.password_hash.startswith("$argon2id$")
    assert registration.token_hash == token_hash(link_key(mailbox))


def test_password_and_session_key_are_not_stored_in_plain_text(client, session, mailbox):
    create_account(client, mailbox)
    account = session.scalar(select(Account))
    login_session = session.scalar(select(LoginSession))

    assert account.password_hash.startswith("$argon2id$v=19$m=19456,t=2,p=1$")
    assert PASSWORD not in account.password_hash
    assert login_session.token_hash == token_hash(client.cookies["session"])
    assert login_session.token_hash != client.cookies["session"]


def test_session_cookie_is_hidden_from_scripts_and_other_sites(client, mailbox):
    cookie = create_account(client, mailbox).headers["set-cookie"].lower()

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


def test_expired_session_is_rejected(client, session, mailbox):
    create_account(client, mailbox)
    add_session(session, "stary-klucz", expires_in=timedelta(minutes=-1))

    assert account_with_key(client, "stary-klucz").status_code == 401


def test_accounts_need_the_access_password(client):
    client.headers["Authorization"] = ""
    response = register(client)

    assert response.status_code == 401
    assert response.json() == {"detail": ["złe hasło"]}


def test_login_with_correct_password(client, mailbox):
    create_account(client, mailbox)
    client.cookies.clear()

    response = log_in(client)

    assert response.status_code == 204
    assert client.get("/api/account").json()["email"] == "ola@example.com"


def test_login_ignores_case_and_spaces_in_email(client, mailbox):
    create_account(client, mailbox)
    client.cookies.clear()

    assert log_in(client, email=" OLA@example.com ").status_code == 204


def test_login_accepts_polish_letters_in_password(client, mailbox):
    create_account(client, mailbox, password="zażółć gęślą jaźń")
    client.cookies.clear()

    assert log_in(client, password="zażółć gęślą jaźń").status_code == 204


def test_login_tells_when_there_is_no_account(client):
    response = log_in(client, email="nikt@example.com")

    assert response.status_code == 401
    assert response.json() == {"detail": ["Nie ma konta z tym adresem."]}
    assert "set-cookie" not in response.headers


def test_login_tells_when_password_is_wrong(client, mailbox):
    create_account(client, mailbox)
    client.cookies.clear()

    response = log_in(client, password="inne-dlugie-haslo")

    assert response.status_code == 401
    assert response.json() == {"detail": ["Złe hasło."]}
    assert client.get("/api/account").status_code == 401


def test_login_removes_expired_sessions(client, session, mailbox):
    create_account(client, mailbox)
    add_session(session, "stary-klucz", expires_in=timedelta(minutes=-1))

    log_in(client)

    assert session.get(LoginSession, token_hash("stary-klucz")) is None


def test_logout_ends_the_session(client, session, mailbox):
    create_account(client, mailbox)
    key = client.cookies["session"]

    response = client.post("/api/account/logout")

    assert response.status_code == 204
    assert "max-age=0" in response.headers["set-cookie"].lower()
    assert session.get(LoginSession, token_hash(key)) is None
    assert account_with_key(client, key).status_code == 401


def test_logout_works_without_a_session(client):
    assert client.post("/api/account/logout").status_code == 204


def test_session_is_extended_when_used(client, session, mailbox):
    create_account(client, mailbox)
    add_session(session, "klucz", expires_in=timedelta(days=3))

    response = account_with_key(client, "klucz")

    login_session = session.get(LoginSession, token_hash("klucz"))
    assert login_session.expires_at > datetime.now(UTC) + timedelta(days=13, hours=23)
    assert "max-age=1209600" in response.headers["set-cookie"].lower()


def test_session_is_extended_at_most_once_a_day(client, session, mailbox):
    create_account(client, mailbox)
    add_session(session, "klucz", expires_in=timedelta(days=13, hours=12))
    expires_at = session.get(LoginSession, token_hash("klucz")).expires_at

    response = account_with_key(client, "klucz")

    assert session.get(LoginSession, token_hash("klucz")).expires_at == expires_at
    assert "set-cookie" not in response.headers


GOOGLE_CLAIMS = {"sub": "google-123", "email": "ola@gmail.com", "email_verified": True}


# Testy nie łączą się z Google: podmieniona funkcja przyjmuje tylko "dobry-token" i zwraca dane,
# które test może zmienić przed logowaniem.
@pytest.fixture
def google(monkeypatch):
    claims = dict(GOOGLE_CLAIMS)

    def verify(credential, request, client_id):
        if credential != "dobry-token":
            raise ValueError("zły token")
        return claims

    monkeypatch.setattr(id_token, "verify_oauth2_token", verify)
    return claims


def google_log_in(client, credential="dobry-token"):
    return client.post("/api/account/google", json={"credential": credential})


def test_google_creates_account_without_password(client, session, google):
    response = google_log_in(client)

    assert response.status_code == 204
    assert client.get("/api/account").json()["email"] == "ola@gmail.com"
    account = session.scalar(select(Account))
    assert account.google_id == "google-123"
    assert account.password_hash is None


def test_google_stores_email_in_lowercase(client, google):
    google["email"] = "Ola@Gmail.com"

    google_log_in(client)

    assert client.get("/api/account").json()["email"] == "ola@gmail.com"


def test_google_finds_returning_account_by_sub(client, session, google):
    google_log_in(client)
    google["email"] = "nowy-adres@gmail.com"
    client.cookies.clear()

    google_log_in(client)

    assert session.scalar(select(func.count()).select_from(Account)) == 1
    assert client.get("/api/account").json()["email"] == "ola@gmail.com"


def test_google_joins_gmail_account_created_with_password(client, session, google, mailbox):
    create_account(client, mailbox, email="ola@gmail.com")
    client.cookies.clear()

    assert google_log_in(client).status_code == 204

    account = session.scalar(select(Account))
    assert session.scalar(select(func.count()).select_from(Account)) == 1
    assert account.google_id == "google-123"
    assert account.password_hash is not None


def test_google_does_not_join_other_address_without_workspace(client, session, google, mailbox):
    create_account(client, mailbox, email="ola@wp.pl")
    client.cookies.clear()
    google["email"] = "ola@wp.pl"

    response = google_log_in(client)

    assert response.status_code == 409
    assert response.json() == {"detail": ["Konto z tym adresem już istnieje. Zaloguj się hasłem."]}
    assert session.scalar(select(Account)).google_id is None


def test_google_joins_workspace_address(client, session, google, mailbox):
    create_account(client, mailbox, email="ola@szkola.edu.pl")
    client.cookies.clear()
    google.update(email="ola@szkola.edu.pl", hd="szkola.edu.pl")

    assert google_log_in(client).status_code == 204
    assert session.scalar(select(Account)).google_id == "google-123"


def test_google_cancels_waiting_registration_for_the_same_address(client, session, google, mailbox):
    register(client, email="ola@gmail.com")
    key = link_key(mailbox)

    assert google_log_in(client).status_code == 204

    assert session.scalar(select(Registration)) is None
    assert confirm(client, key).status_code == 400
    assert session.scalar(select(func.count()).select_from(Account)) == 1
    assert session.scalar(select(Account)).password_hash is None


def test_google_rejects_bad_token(client, google):
    response = google_log_in(client, credential="podrobiony")

    assert response.status_code == 401
    assert response.json() == {"detail": ["Logowanie przez Google nie powiodło się."]}


def test_google_rejects_unverified_email(client, google):
    google["email_verified"] = False

    response = google_log_in(client)

    assert response.status_code == 401
    assert response.json() == {"detail": ["Google nie potwierdził tego adresu e-mail."]}


def test_password_login_to_google_only_account_explains_why(client, google):
    google_log_in(client)
    client.cookies.clear()

    response = log_in(client, email="ola@gmail.com")

    assert response.status_code == 403
    assert response.json() == {
        "detail": [
            "To konto logowało się dotąd przez Google. Zaloguj się przez Google albo dodaj hasło."
        ]
    }


def test_new_login_replaces_previous_session_of_the_browser(client, session, mailbox):
    create_account(client, mailbox)
    old_key = client.cookies["session"]

    log_in(client)

    assert session.get(LoginSession, token_hash(old_key)) is None
    assert session.scalar(select(func.count()).select_from(LoginSession)) == 1


def test_login_on_another_device_keeps_the_first_session(client, mailbox):
    create_account(client, mailbox)
    first_key = client.cookies["session"]
    client.cookies.clear()

    log_in(client)

    assert account_with_key(client, first_key).status_code == 200


def request_password_link(client, email="ola@example.com"):
    return client.post("/api/account/password-link", json={"email": email})


def set_password(client, key, password="nowe-dlugie-haslo"):
    return client.post("/api/account/password", json={"key": key, "password": password})


def test_password_link_sets_a_new_password_and_logs_in(client, mailbox):
    create_account(client, mailbox)
    client.cookies.clear()

    response = request_password_link(client)

    assert response.status_code == 204
    to, subject, text = mailbox[-1]
    assert (to, subject) == ("ola@example.com", "Ustaw hasło")
    assert "http://localhost:5173/nowe-haslo?klucz=" in text
    assert set_password(client, link_key(mailbox)).status_code == 204
    assert client.get("/api/account").status_code == 200
    client.cookies.clear()
    assert log_in(client, password="nowe-dlugie-haslo").status_code == 204
    assert log_in(client).status_code == 401


def test_password_link_works_only_once(client, mailbox):
    create_account(client, mailbox)
    request_password_link(client)
    key = link_key(mailbox)
    set_password(client, key)

    response = set_password(client, key, password="jeszcze-inne-haslo")

    assert response.status_code == 400
    assert response.json() == {"detail": ["Link wygasł albo został już użyty. Poproś o nowy."]}


def test_password_link_expires_after_an_hour(client, session, mailbox):
    create_account(client, mailbox)
    request_password_link(client)
    session.scalar(select(PasswordLink)).expires_at = datetime.now(UTC) - timedelta(minutes=1)
    session.flush()

    assert set_password(client, link_key(mailbox)).status_code == 400


def test_new_password_link_cancels_the_previous_one(client, mailbox):
    create_account(client, mailbox)
    request_password_link(client)
    first_key = link_key(mailbox)
    request_password_link(client)

    assert set_password(client, first_key).status_code == 400
    assert set_password(client, link_key(mailbox)).status_code == 204


def test_password_from_link_must_meet_the_rules(client, mailbox):
    create_account(client, mailbox)
    request_password_link(client)

    response = set_password(client, link_key(mailbox), password="krotkie")

    assert response.status_code == 422
    assert response.json() == {"detail": ["Hasło musi mieć co najmniej 12 znaków."]}


def test_password_link_keeps_other_devices_logged_in(client, mailbox):
    create_account(client, mailbox)
    first_key = client.cookies["session"]
    client.cookies.clear()

    request_password_link(client)
    set_password(client, link_key(mailbox))

    assert account_with_key(client, first_key).status_code == 200


def test_google_account_can_add_a_password_by_link(client, google, mailbox):
    google_log_in(client)
    client.cookies.clear()

    request_password_link(client, email="ola@gmail.com")
    set_password(client, link_key(mailbox))
    client.cookies.clear()

    assert log_in(client, email="ola@gmail.com", password="nowe-dlugie-haslo").status_code == 204


def test_password_link_needs_an_existing_account(client, mailbox):
    response = request_password_link(client, email="nikt@example.com")

    assert response.status_code == 404
    assert response.json() == {"detail": ["Nie ma konta z tym adresem."]}
    assert mailbox == []


def change_password(client, new="nowe-dlugie-haslo", current=PASSWORD):
    return client.post(
        "/api/account/change-password",
        json={"current_password": current, "new_password": new},
    )


def test_account_tells_whether_it_has_a_password(client, google, mailbox):
    create_account(client, mailbox)
    assert client.get("/api/account").json() == {"email": "ola@example.com", "has_password": True}

    google_log_in(client)
    assert client.get("/api/account").json() == {"email": "ola@gmail.com", "has_password": False}


def test_change_password_with_the_current_one(client, mailbox):
    create_account(client, mailbox)

    assert change_password(client).status_code == 204

    client.cookies.clear()
    assert log_in(client, password="nowe-dlugie-haslo").status_code == 204


def test_change_password_needs_the_correct_current_one(client, mailbox):
    create_account(client, mailbox)

    response = change_password(client, current="nie-to-haslo-wcale")

    assert response.status_code == 401
    assert response.json() == {"detail": ["Złe hasło."]}


def test_new_password_must_meet_the_rules(client, mailbox):
    create_account(client, mailbox)

    response = change_password(client, new="krotkie")

    assert response.status_code == 422
    assert response.json() == {"detail": ["Hasło musi mieć co najmniej 12 znaków."]}


def test_google_account_adds_a_password_without_a_current_one(client, google):
    google_log_in(client)

    assert change_password(client, current=None).status_code == 204

    client.cookies.clear()
    assert log_in(client, email="ola@gmail.com", password="nowe-dlugie-haslo").status_code == 204


def test_change_password_keeps_other_devices_logged_in(client, mailbox):
    create_account(client, mailbox)
    first_key = client.cookies["session"]
    client.cookies.clear()
    log_in(client)

    change_password(client)

    assert account_with_key(client, first_key).status_code == 200


def test_change_password_needs_login(client):
    assert change_password(client).status_code == 401


def test_logout_everywhere_ends_sessions_on_all_devices(client, session, mailbox):
    create_account(client, mailbox)
    first_key = client.cookies["session"]
    client.cookies.clear()
    log_in(client)

    response = client.post("/api/account/logout-everywhere")

    assert response.status_code == 204
    assert "max-age=0" in response.headers["set-cookie"].lower()
    assert account_with_key(client, first_key).status_code == 401
    assert session.scalar(select(func.count()).select_from(LoginSession)) == 0


def test_register_requires_accepting_the_terms(client, session, mailbox):
    response = register(client, accepted_terms=False)

    assert response.status_code == 422
    assert response.json() == {"detail": ["Zaakceptuj regulamin i politykę prywatności."]}
    assert mailbox == []


def test_account_remembers_when_the_terms_were_accepted(client, session, mailbox):
    create_account(client, mailbox)

    accepted_at = session.scalar(select(Account)).terms_accepted_at
    assert datetime.now(UTC) - accepted_at < timedelta(minutes=1)


def test_google_account_remembers_when_the_terms_were_accepted(client, session, google):
    google_log_in(client)

    assert session.scalar(select(Account)).terms_accepted_at is not None


def delete_account(client, email="ola@example.com"):
    return client.post("/api/account/delete", json={"email": email})


def test_delete_account_removes_it_with_sessions_and_links(client, session, mailbox):
    create_account(client, mailbox)
    request_password_link(client)

    response = delete_account(client, email=" OLA@example.com ")

    assert response.status_code == 204
    assert "max-age=0" in response.headers["set-cookie"].lower()
    assert session.scalar(select(func.count()).select_from(Account)) == 0
    assert session.scalar(select(func.count()).select_from(LoginSession)) == 0
    assert session.scalar(select(func.count()).select_from(PasswordLink)) == 0


def test_delete_account_needs_the_own_address_typed(client, session, mailbox):
    create_account(client, mailbox)

    response = delete_account(client, email="inny@example.com")

    assert response.status_code == 422
    assert response.json() == {"detail": ["Wpisz adres swojego konta, żeby potwierdzić."]}
    assert session.scalar(select(Account)) is not None


def test_delete_account_needs_login(client):
    assert delete_account(client).status_code == 401
