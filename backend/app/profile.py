from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.access import require_password
from app.accounts import current_account
from app.db import get_session
from app.models import Account, Profile

router = APIRouter(prefix="/api/profile", dependencies=[Depends(require_password)])

# Terminy z harmonogramu CKE, dopisywane co roku po komunikacie dyrektora CKE.
MATURA_DATES = {
    (2027, "podstawowa"): date(2027, 5, 5),
    (2027, "rozszerzona"): date(2027, 5, 11),
}

LEVELS = ("podstawowa", "rozszerzona")

# Ile powtórek może przyjść jednego dnia przy „mało”, „średnio” i „dużo”. Jedyne miejsce z tymi
# liczbami: kolejka powtórek liczy z nich limit, a frontend dostaje liczbę razem z profilem.
DAILY_REVIEW_LIMITS = {"malo": 10, "srednio": 20, "duzo": 40}


class ProfileData(BaseModel):
    level: str
    exam_year: int
    target_percent: int | None
    theme: str
    dark_shade: str
    daily_reviews: str


def default_exam_year(today: date) -> int:
    # Matury kończą się w maju, więc od czerwca uczeń przygotowuje się już do następnej.
    return today.year if today.month <= 5 else today.year + 1


def exam_years(today: date) -> list[int]:
    first = default_exam_year(today)
    return [first, first + 1, first + 2]


# Bez terminu w słowniku odliczanie celuje w początek maja, kiedy zaczynają się matury.
def exam_date(year: int, level: str) -> date:
    return MATURA_DATES.get((year, level), date(year, 5, 3))


def problems(data: ProfileData) -> list[str]:
    found = []
    if data.level not in LEVELS:
        found.append("Wybierz poziom matury: podstawowy albo rozszerzony.")
    years = exam_years(date.today())
    if data.exam_year not in years:
        found.append(f"Wybierz rok matury: {years[0]}, {years[1]} albo {years[2]}.")
    if data.target_percent is not None and not 1 <= data.target_percent <= 100:
        found.append("Cel podaj w procentach, od 1 do 100.")
    if data.theme not in ("light", "dark"):
        found.append("Wybierz motyw: jasny albo ciemny.")
    if data.dark_shade not in ("grey", "black"):
        found.append("Wybierz odcień ciemnego motywu: szary albo czarny.")
    if data.daily_reviews not in DAILY_REVIEW_LIMITS:
        found.append("Wybierz liczbę powtórek na dzień: mało, średnio albo dużo.")
    return found


def response(data: ProfileData) -> dict:
    return data.model_dump() | {
        "exam_years": exam_years(date.today()),
        "exam_dates": {level: exam_date(data.exam_year, level).isoformat() for level in LEVELS},
        "daily_review_limit": DAILY_REVIEW_LIMITS[data.daily_reviews],
    }


@router.get("")
def read_profile(
    account: Account = Depends(current_account), session: Session = Depends(get_session)
):
    profile = session.get(Profile, account.id)
    if profile is None:
        data = ProfileData(
            level="podstawowa",
            exam_year=default_exam_year(date.today()),
            target_percent=None,
            theme="light",
            dark_shade="grey",
            daily_reviews="srednio",
        )
    else:
        data = ProfileData.model_validate(profile, from_attributes=True)
    return response(data)


@router.put("")
def save_profile(
    data: ProfileData,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    found = problems(data)
    if found:
        raise HTTPException(status_code=422, detail=found)
    session.merge(Profile(account_id=account.id, **data.model_dump()))
    session.commit()
    return response(data)
