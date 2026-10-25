from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select

from app.accounts import token_hash
from app.models import Account, LoginSession, Profile
from app.profile import default_exam_year, exam_date

KEY = "klucz-sesji-testowej"


# Profil jest za hasłem do aplikacji, a klient z conftest domyślnie wysyła hasło panelu.
@pytest.fixture
def client(client):
    client.headers["Authorization"] = "Bearer haslo-testowe"
    return client


# Konto i sesja prosto w bazie: tu liczy się tylko to, że ktoś jest zalogowany.
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


def get_profile(client):
    return client.get("/api/profile", headers={"Cookie": f"session={KEY}"})


def put_profile(client, **changes):
    profile = {
        "level": "rozszerzona",
        "exam_year": default_exam_year(date.today()),
        "target_percent": 80,
        "theme": "dark",
        "dark_shade": "black",
        "daily_reviews": "duzo",
    } | changes
    return client.put("/api/profile", json=profile, headers={"Cookie": f"session={KEY}"})


def test_profile_requires_login(client):
    response = client.get("/api/profile")

    assert response.status_code == 401
    assert response.json()["detail"] == ["Nie zalogowano."]


def test_profile_needs_the_access_password(client, account):
    del client.headers["Authorization"]

    assert get_profile(client).status_code == 401


def test_new_account_gets_the_default_profile(client, account):
    year = default_exam_year(date.today())

    response = get_profile(client)

    assert response.status_code == 200
    assert response.json() == {
        "level": "podstawowa",
        "exam_year": year,
        "target_percent": None,
        "theme": "light",
        "dark_shade": "grey",
        "daily_reviews": "srednio",
        "exam_years": [year, year + 1, year + 2],
        "exam_dates": {
            "podstawowa": exam_date(year, "podstawowa").isoformat(),
            "rozszerzona": exam_date(year, "rozszerzona").isoformat(),
        },
        "daily_review_limit": 20,
    }


def test_reading_the_profile_does_not_create_a_row(client, session, account):
    get_profile(client)

    assert session.get(Profile, account.id) is None


def test_saved_profile_comes_back(client, account):
    saved = put_profile(client)
    read = get_profile(client)

    assert saved.status_code == 200
    assert read.json() == saved.json()
    assert read.json()["level"] == "rozszerzona"
    assert read.json()["target_percent"] == 80
    assert read.json()["theme"] == "dark"
    assert read.json()["dark_shade"] == "black"
    assert read.json()["daily_reviews"] == "duzo"


def test_saving_again_overwrites_the_profile(client, session, account):
    put_profile(client)
    put_profile(client, theme="light", target_percent=None)

    profiles = session.scalars(select(Profile)).all()
    assert len(profiles) == 1
    assert profiles[0].theme == "light"
    assert profiles[0].target_percent is None


def test_profile_lists_all_problems_at_once(client, account):
    response = put_profile(
        client,
        level="srednia",
        exam_year=1999,
        target_percent=0,
        theme="niebieski",
        dark_shade="granatowy",
        daily_reviews="bardzo-duzo",
    )

    assert response.status_code == 422
    assert len(response.json()["detail"]) == 6


def test_target_above_100_is_rejected(client, account):
    response = put_profile(client, target_percent=101)

    assert response.status_code == 422
    assert response.json()["detail"] == ["Cel podaj w procentach, od 1 do 100."]


def test_profile_is_removed_with_the_account(client, session, account):
    put_profile(client)

    session.delete(account)
    session.flush()

    assert session.scalars(select(Profile)).all() == []


def test_exam_dates_come_from_the_cke_schedule():
    assert exam_date(2027, "podstawowa") == date(2027, 5, 5)
    assert exam_date(2027, "rozszerzona") == date(2027, 5, 11)


def test_missing_exam_date_falls_back_to_the_third_of_may():
    assert exam_date(2031, "podstawowa") == date(2031, 5, 3)


@pytest.mark.parametrize(
    ("today", "year"),
    [(date(2026, 10, 16), 2027), (date(2027, 5, 31), 2027), (date(2027, 6, 1), 2028)],
)
def test_default_exam_year_is_the_next_matura(today, year):
    assert default_exam_year(today) == year
