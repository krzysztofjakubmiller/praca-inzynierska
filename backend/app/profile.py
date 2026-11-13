from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Date, cast, func, select
from sqlalchemy.orm import Session

from app.access import require_password
from app.accounts import current_account
from app.db import get_session
from app.models import Account, Exam, Profile, ReviewCard, Solution, Task

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

LEARNING_DIFFICULTIES = ("brak", "specyficzne", "dyskalkulia")


class ProfileData(BaseModel):
    level: str
    exam_year: int
    target_percent: int | None
    theme: str
    dark_shade: str
    daily_reviews: str
    learning_difficulties: str


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
    if data.learning_difficulties not in LEARNING_DIFFICULTIES:
        found.append("Wybierz opinię o trudnościach w uczeniu się z listy.")
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
            learning_difficulties="brak",
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


# Ile dni wstecz pokazuje kalendarz nauki i ile dni naprzód wykres powtórek.
HISTORY_DAYS = 140
REVIEW_DAYS = 14
# Tyle ostatnich rozwiązań liczy się do skuteczności, tak jak na mapie.
RECENT_SOLUTIONS = 20


# Dzień w Polsce, bo uczeń liczy dni nauki od swojej północy, a nie od północy UTC.
def polish_day(moment):
    return cast(func.timezone("Europe/Warsaw", moment), Date)


# Dane do wykresów postępu, które nie wynikają z samej mapy: dni nauki, skuteczność ostatnich
# zadań i powtórki na najbliższe dni. Linie i stany tematów frontend liczy z postępu na mapie.
@router.get("/stats/{exam}")
def read_stats(
    exam: str,
    account: Account = Depends(current_account),
    session: Session = Depends(get_session),
):
    today = session.scalar(select(polish_day(func.now())))
    first = today - timedelta(days=HISTORY_DAYS - 1)
    day = polish_day(Solution.created_at)
    per_day = dict(
        session.execute(
            select(day, func.count())
            .join(Task, Task.id == Solution.task_id)
            .join(Exam, Exam.id == Task.exam_id)
            .where(Solution.account_id == account.id, Exam.code == exam, day >= first)
            .group_by(day)
        ).all()
    )
    days = [per_day.get(first + timedelta(days=offset), 0) for offset in range(HISTORY_DAYS)]

    recent = session.execute(
        select(Solution.points, Task.max_points)
        .join(Task, Task.id == Solution.task_id)
        .join(Exam, Exam.id == Task.exam_id)
        .where(Solution.account_id == account.id, Exam.code == exam)
        .order_by(Solution.created_at.desc())
        .limit(RECENT_SOLUTIONS)
    ).all()

    # Zaległe powtórki wliczają się do dzisiejszych, a osobno podaje się, ile ich jest.
    due_day = func.greatest(polish_day(ReviewCard.due), today)
    due = dict(
        session.execute(
            select(due_day, func.count())
            .join(Task, Task.id == ReviewCard.task_id)
            .join(Exam, Exam.id == Task.exam_id)
            .where(
                ReviewCard.account_id == account.id,
                Exam.code == exam,
                Task.review_status == "sprawdzone",
                polish_day(ReviewCard.due) < today + timedelta(days=REVIEW_DAYS),
            )
            .group_by(due_day)
        ).all()
    )
    overdue = session.scalar(
        select(func.count())
        .select_from(ReviewCard)
        .join(Task, Task.id == ReviewCard.task_id)
        .join(Exam, Exam.id == Task.exam_id)
        .where(
            ReviewCard.account_id == account.id,
            Exam.code == exam,
            Task.review_status == "sprawdzone",
            polish_day(ReviewCard.due) < today,
        )
    )
    return {
        "today": today.isoformat(),
        "days": days,
        "recent_score": (
            sum(points == max_points for points, max_points in recent) / len(recent)
            if recent
            else None
        ),
        "reviews_ahead": [
            due.get(today + timedelta(days=offset), 0) for offset in range(REVIEW_DAYS)
        ],
        "overdue": overdue,
    }
