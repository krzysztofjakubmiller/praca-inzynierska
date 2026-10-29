from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    type_annotation_map = {str: Text, datetime: DateTime(timezone=True)}


class Exam(Base):
    __tablename__ = "exam"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str]


class Topic(Base):
    __tablename__ = "topic"
    __table_args__ = (
        UniqueConstraint("exam_id", "code"),
        # Potrzebne, żeby zadanie mogło wskazać parę (egzamin, temat) kluczem obcym.
        UniqueConstraint("exam_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exam.id"))
    code: Mapped[str]
    name: Mapped[str]


class SourceKind(Base):
    __tablename__ = "source_kind"
    __table_args__ = (
        UniqueConstraint("exam_id", "code"),
        UniqueConstraint("exam_id", "id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exam.id"))
    code: Mapped[str]
    name: Mapped[str]


class Task(Base):
    __tablename__ = "task"
    __table_args__ = (
        # Temat i rodzaj źródła muszą należeć do tego samego egzaminu co zadanie.
        ForeignKeyConstraint(
            ["exam_id", "topic_id"],
            ["topic.exam_id", "topic.id"],
            name="task_topic_same_exam",
        ),
        ForeignKeyConstraint(
            ["exam_id", "source_kind_id"],
            ["source_kind.exam_id", "source_kind.id"],
            name="task_source_kind_same_exam",
        ),
        # Pusty podpunkt też musi się liczyć, inaczej to samo zadanie weszłoby dwa razy.
        UniqueConstraint(
            "source_kind_id",
            "year",
            "month",
            "number",
            "subnumber",
            name="task_source_unique",
            postgresql_nulls_not_distinct=True,
        ),
        CheckConstraint("month between 1 and 12", name="task_month_valid"),
        CheckConstraint("max_points > 0", name="task_max_points_positive"),
        CheckConstraint(
            "answer_format in ('wielokrotny-wybor', 'prawda-falsz', 'dobieranie', 'otwarte')",
            name="task_answer_format_valid",
        ),
        CheckConstraint(
            "review_status in ('do-sprawdzenia', 'sprawdzone')",
            name="task_review_status_valid",
        ),
        CheckConstraint(
            "read_method in ('recznie', 'gemini', 'inne-ai')",
            name="task_read_method_valid",
        ),
        CheckConstraint(
            "review_status <> 'sprawdzone' or answer is not null",
            name="task_reviewed_has_answer",
        ),
        CheckConstraint("has_figure = (figures is not null)", name="task_has_figure_matches"),
        CheckConstraint(
            "scoring is null or answer_format = 'otwarte'", name="task_scoring_only_open"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exam.id"))
    topic_id: Mapped[int]
    source_kind_id: Mapped[int]

    year: Mapped[int] = mapped_column(SmallInteger)
    month: Mapped[int] = mapped_column(SmallInteger)
    number: Mapped[int] = mapped_column(SmallInteger)
    subnumber: Mapped[int | None] = mapped_column(SmallInteger)

    content: Mapped[str]
    has_figure: Mapped[bool] = mapped_column(default=False)
    answer_format: Mapped[str]
    # Etykieta z arkusza i jej treść, np. {"A": "$2$", "B": "$3$"}.
    # Bez none_as_null zadanie otwarte dostałoby w bazie JSON-owe null zamiast NULL.
    choices: Mapped[dict[str, str] | None] = mapped_column(JSONB(none_as_null=True))
    # Przy dobieraniu tekst w środku tabeli, między wariantami z literami i z cyframi.
    connector: Mapped[str | None]
    # Format rysunków opisują klasy w figures.py.
    figures: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    answer: Mapped[str | None]
    max_points: Mapped[int] = mapped_column(SmallInteger)
    # Zadanie otwarte: wyniki końcowe dla programu i zasady oceniania CKE dla AI, format w
    # Scoring (import_tasks.py). Uczeń dostaje zadanie otwarte dopiero wtedy, gdy są.
    scoring: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))

    review_status: Mapped[str] = mapped_column(default="do-sprawdzenia")
    read_method: Mapped[str]
    read_model: Mapped[str | None]
    ai_content: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    reviewed_at: Mapped[datetime | None]


# Szablon wariantów zadania: to samo zadanie z innymi liczbami. Oryginał w task zostaje bez zmian.
# Uczniowie dostają warianty tylko z szablonów sprawdzonych przez właściciela.
class TaskTemplate(Base):
    __tablename__ = "task_template"
    __table_args__ = (
        CheckConstraint(
            "review_status in ('do-sprawdzenia', 'sprawdzone')",
            name="task_template_review_status_valid",
        ),
        CheckConstraint(
            "read_method in ('recznie', 'gemini', 'inne-ai')", name="task_template_read_method_valid"
        ),
    )

    task_id: Mapped[int] = mapped_column(ForeignKey("task.id", ondelete="CASCADE"), primary_key=True)
    # Format opisuje klasa Template w variants.py.
    body: Mapped[dict] = mapped_column(JSONB)
    # Nieedytowana kopia szablonu od AI, do pomiaru, ile szablonów trzeba było poprawiać.
    ai_body: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    read_method: Mapped[str]
    read_model: Mapped[str | None]
    review_status: Mapped[str] = mapped_column(default="do-sprawdzenia")
    # Wynik ostatniego sprawdzenia losowaniem: czy przeszedł, problemy, liczba wariantów.
    check_result: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    reviewed_at: Mapped[datetime | None]


class Account(Base):
    __tablename__ = "account"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Zapisywany małymi literami, więc unikalność nie zależy od wielkości liter.
    email: Mapped[str] = mapped_column(unique=True)
    # Puste w koncie założonym przez Google.
    password_hash: Mapped[str | None]
    # Stały identyfikator konta Google (sub). Adres w koncie Google może się zmienić, ten nie.
    google_id: Mapped[str | None] = mapped_column(unique=True)
    # Puste w kontach założonych, zanim aplikacja miała regulamin.
    terms_accepted_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class LoginSession(Base):
    __tablename__ = "login_session"

    # Skrót SHA-256 klucza z ciasteczka. Sam klucz zna tylko przeglądarka użytkownika.
    token_hash: Mapped[str] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime]


# Rejestracja hasłem czeka tu na kliknięcie linku z maila. Konto w account powstaje dopiero
# potem, więc nikt nie założy konta na cudzy adres.
class Registration(Base):
    __tablename__ = "registration"

    email: Mapped[str] = mapped_column(primary_key=True)
    password_hash: Mapped[str]
    token_hash: Mapped[str] = mapped_column(unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime]


# Link z maila do ustawienia hasła: zapomnianego albo nowego w koncie założonym przez Google.
class PasswordLink(Base):
    __tablename__ = "password_link"

    token_hash: Mapped[str] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    expires_at: Mapped[datetime]


# Nieudane logowania i wysłane maile, liczone do limitów prób. Każde zdarzenie ma dwa wiersze:
# z adresem e-mail i z adresem IP.
class Attempt(Base):
    __tablename__ = "attempt"
    __table_args__ = (
        CheckConstraint("kind in ('logowanie', 'mail')", name="attempt_kind_valid"),
        Index("attempt_lookup", "kind", "key", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str]
    key: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


# Ustawienia ucznia w osobnej tabeli, żeby nie mieszać ich z danymi logowania. Wiersz powstaje
# przy pierwszym zapisie, a do tego czasu API zwraca wartości domyślne.
class Profile(Base):
    __tablename__ = "profile"
    __table_args__ = (
        CheckConstraint("level in ('podstawowa', 'rozszerzona')", name="profile_level_valid"),
        CheckConstraint("target_percent between 1 and 100", name="profile_target_percent_valid"),
        CheckConstraint("theme in ('light', 'dark')", name="profile_theme_valid"),
        CheckConstraint("dark_shade in ('grey', 'black')", name="profile_dark_shade_valid"),
        CheckConstraint(
            "daily_reviews in ('malo', 'srednio', 'duzo')", name="profile_daily_reviews_valid"
        ),
    )

    account_id: Mapped[int] = mapped_column(
        ForeignKey("account.id", ondelete="CASCADE"), primary_key=True
    )
    level: Mapped[str]
    exam_year: Mapped[int] = mapped_column(SmallInteger)
    target_percent: Mapped[int | None] = mapped_column(SmallInteger)
    theme: Mapped[str]
    dark_shade: Mapped[str]
    # Ile powtórek może przyjść jednego dnia: mało, średnio albo dużo. Liczby ustala frontend.
    daily_reviews: Mapped[str]


# Każda próba rozwiązania zadania przez ucznia, w każdym trybie. Z tych wierszy liczy się
# postęp na mapie i wykresy w profilu.
class Solution(Base):
    __tablename__ = "solution"
    __table_args__ = (
        CheckConstraint("mode in ('cwiczenie', 'losowe', 'powtorka')", name="solution_mode_valid"),
        CheckConstraint("points >= 0", name="solution_points_not_negative"),
        CheckConstraint(
            "rating in ('latwy', 'sredni', 'trudny', 'bardzo-trudny')", name="solution_rating_valid"
        ),
        Index("solution_by_day", "account_id", "created_at"),
        Index("solution_by_task", "account_id", "task_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id", ondelete="CASCADE"))
    task_id: Mapped[int] = mapped_column(ForeignKey("task.id", ondelete="CASCADE"))
    mode: Mapped[str]
    # Zaznaczona odpowiedź w zadaniu zamkniętym, np. "B" albo "PF". Puste przy otwartym.
    answer: Mapped[str | None]
    # Dobrze rozwiązane to pełne punkty zadania. Bez osobnej kolumny, bo korepetytor może
    # później zmienić punkty.
    points: Mapped[int] = mapped_column(SmallInteger)
    # Zadanie otwarte: wpisy ucznia i kto ocenił, np. {"answers": ["-3; 1"], "checked": "program"}.
    # Przy ocenie przez AI dochodzą model i odczyt rozwiązania. Zdjęcia się nie zapisuje.
    open_answer: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    # Liczby wariantu, który uczeń widział, np. {"k": 5, "b": 2}; puste przy oryginale.
    # Z liczb i szablonu wariant składa się od nowa (variants.py).
    variant: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))
    # Ocena trudności wybrana przez ucznia po zadaniu; puste, dopóki jej nie wybierze.
    rating: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


# Każde zapytanie ucznia do AI z pełną odpowiedzią modelu: do dziennego limitu i do analizy
# modeli w pracy. Zdjęcia pobiera się na dysk właściciela i czyści z bazy.
class AiRequest(Base):
    __tablename__ = "ai_request"
    __table_args__ = (
        CheckConstraint("kind in ('ocena', 'rozwiazanie', 'pytanie')", name="ai_request_kind_valid"),
        CheckConstraint(
            "feedback in ('zgadzam-sie', 'nie-zgadzam-sie', 'pomoglo', 'nie-pomoglo')",
            name="ai_request_feedback_valid",
        ),
        Index("ai_request_by_day", "account_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("account.id", ondelete="CASCADE"))
    task_id: Mapped[int] = mapped_column(ForeignKey("task.id", ondelete="CASCADE"))
    # Rozwiązanie z punktami od AI; puste przy nieczytelnym zdjęciu, rozwiązaniu i pytaniu.
    solution_id: Mapped[int | None] = mapped_column(ForeignKey("solution.id", ondelete="SET NULL"))
    kind: Mapped[str]
    image: Mapped[bytes | None]
    image_type: Mapped[str | None]
    # Tekst od ucznia: opis rozwiązania albo pytanie w „Dopytaj się”.
    text: Mapped[str | None]
    # Odpowiedź modelu bez zmian: JSON oceny albo tekst rozwiązania czy odpowiedzi.
    reply: Mapped[str]
    model: Mapped[str]
    failed_models: Mapped[list] = mapped_column(JSONB)
    prompt_version: Mapped[int] = mapped_column(SmallInteger)
    input_tokens: Mapped[int]
    output_tokens: Mapped[int]
    cost: Mapped[float | None]
    seconds: Mapped[float]
    # Reakcja ucznia: zgoda z oceną albo czy rozwiązanie i odpowiedź pomogły.
    feedback: Mapped[str | None]
    feedback_comment: Mapped[str | None]
    # Punkty od korepetytora za to samo rozwiązanie, do porównania z oceną AI.
    tutor_points: Mapped[int | None] = mapped_column(SmallInteger)
    # Nazwa pliku na dysku właściciela, gdy zdjęcie zostało już pobrane i usunięte z bazy.
    image_file: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


# Karta powtórek FSRS: kiedy zadanie ma wrócić do ucznia. Warianty zadania to ta sama karta.
# Powstaje przy pierwszej ocenie trudności, a każda kolejna ocena, w każdym trybie, ją zmienia.
class ReviewCard(Base):
    __tablename__ = "review_card"
    __table_args__ = (
        CheckConstraint(
            "state in ('nauka', 'powtorka', 'ponowna-nauka')", name="review_card_state_valid"
        ),
        Index("review_card_due", "account_id", "due"),
    )

    account_id: Mapped[int] = mapped_column(
        ForeignKey("account.id", ondelete="CASCADE"), primary_key=True
    )
    task_id: Mapped[int] = mapped_column(ForeignKey("task.id", ondelete="CASCADE"), primary_key=True)
    # Pola karty z biblioteki fsrs, zapisane bez zmian, żeby dało się ją odtworzyć.
    state: Mapped[str]
    step: Mapped[int | None] = mapped_column(SmallInteger)
    stability: Mapped[float | None]
    difficulty: Mapped[float | None]
    due: Mapped[datetime]
    last_review: Mapped[datetime | None]
