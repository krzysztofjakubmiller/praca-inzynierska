from datetime import UTC, date, datetime, time, timedelta

from fsrs import Card, Rating, Scheduler, State
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Profile, ReviewCard
from app.profile import DAILY_REVIEW_LIMITS, default_exam_year, exam_date

# Bez kroków w minutach: zadanie z błędem wraca najwcześniej następnego dnia, bo to samo zadanie
# po 10 minutach sprawdzałoby pamięć odpowiedzi, a nie umiejętność.
SCHEDULER = Scheduler(learning_steps=(), relearning_steps=())

RATINGS = {
    "latwy": Rating.Easy,
    "sredni": Rating.Good,
    "trudny": Rating.Hard,
    "bardzo-trudny": Rating.Again,
}

STATES = {State.Learning: "nauka", State.Review: "powtorka", State.Relearning: "ponowna-nauka"}

LEVELS = {"matura-podstawowa": "podstawowa", "matura-rozszerzona": "rozszerzona"}


# Doba liczy się od północy w Polsce. Strefę czasową zna baza, więc Python nie potrzebuje
# do tego dodatkowej paczki z danymi stref.
def day_start():
    local_now = func.timezone("Europe/Warsaw", func.now())
    return func.timezone("Europe/Warsaw", func.date_trunc("day", local_now))


def update_card(
    session: Session, account_id: int, task_id: int, rating: str, now: datetime
) -> ReviewCard:
    row = session.get(ReviewCard, (account_id, task_id))
    if row is None:
        card = Card()
        row = ReviewCard(account_id=account_id, task_id=task_id)
        session.add(row)
    else:
        state = next(key for key, value in STATES.items() if value == row.state)
        card = Card(
            state=state,
            step=row.step,
            stability=row.stability,
            difficulty=row.difficulty,
            due=row.due,
            last_review=row.last_review,
        )
    card, _ = SCHEDULER.review_card(card, RATINGS[rating], now)
    row.state = STATES[card.state]
    row.step = card.step
    row.stability = card.stability
    row.difficulty = card.difficulty
    row.due = card.due
    row.last_review = card.last_review
    return row


# Początek dnia matury ucznia. Termin powtórki od tej chwili znaczy, że w dniu matury uczeń
# jeszcze będzie pamiętał zadanie lepiej niż na 90%, więc przed maturą nie musi do niego wracać.
def exam_start(session: Session, account_id: int, exam: str) -> datetime:
    profile = session.get(Profile, account_id)
    year = profile.exam_year if profile else default_exam_year(date.today())
    return datetime.combine(exam_date(year, LEVELS.get(exam, "podstawowa")), time(), UTC)


def daily_limit(session: Session, account_id: int) -> int:
    profile = session.get(Profile, account_id)
    return DAILY_REVIEW_LIMITS[profile.daily_reviews if profile else "srednio"]


def tomorrow():
    return day_start() + timedelta(days=1)
