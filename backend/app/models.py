from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
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
    choices: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    answer: Mapped[str | None]
    max_points: Mapped[int] = mapped_column(SmallInteger)

    review_status: Mapped[str] = mapped_column(default="do-sprawdzenia")
    read_method: Mapped[str]
    read_model: Mapped[str | None]
    ai_content: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    reviewed_at: Mapped[datetime | None]
