from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.access import require_panel_password
from app.db import get_session
from app.models import SurveyAnswer, SurveyPodium

# Ankietę wizytówek wypełniają osoby bez hasła dostępu, więc zapis jest otwarty.
# Odczyt wyników wymaga hasła panelu.
router = APIRouter(prefix="/api")

Page = Literal["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]


class Details(BaseModel):
    user_agent: str = Field(max_length=400)
    model: str | None = Field(default=None, max_length=80)
    system: str | None = Field(default=None, max_length=80)
    screen: str = Field(max_length=24)
    viewport: str = Field(max_length=24)
    language: str = Field(max_length=24)
    touch: bool
    # Którą z kolei ocenianą stroną była ta dla tego urządzenia.
    order: int = Field(ge=1, le=100)
    opened_by: Literal["klik", "koniec-strony"]
    tried_task: bool
    # Kliknięcia w przyciski prowadzące do aplikacji, której oceniający nie może otworzyć.
    blocked_clicks: int = Field(ge=0, le=1000)


class AnswerIn(BaseModel):
    device_id: UUID
    looks: int = Field(ge=1, le=10)
    expensive: int = Field(ge=1, le=5)
    buying: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)
    scrolled: int = Field(ge=0, le=100)
    seconds: int = Field(ge=0, le=86400)
    device: Literal["telefon", "tablet", "komputer"]
    details: Details


class PodiumIn(BaseModel):
    device_id: UUID
    pages: list[Page] = Field(min_length=1, max_length=3)

    @field_validator("pages")
    @classmethod
    def pages_differ(cls, pages: list[str]) -> list[str]:
        if len(set(pages)) != len(pages):
            raise ValueError("ta sama strona na dwóch miejscach")
        return pages


@router.put("/survey/answers/{page}", status_code=204)
def save_answer(page: Page, body: AnswerIn, session: Session = Depends(get_session)):
    values = body.model_dump(exclude={"device_id"})
    values["comment"] = (body.comment or "").strip() or None
    statement = insert(SurveyAnswer).values(device_id=str(body.device_id), page=page, **values)
    session.execute(
        statement.on_conflict_do_update(
            index_elements=["device_id", "page"], set_=values | {"updated_at": func.now()}
        )
    )
    session.commit()


@router.put("/survey/podium", status_code=204)
def save_podium(body: PodiumIn, session: Session = Depends(get_session)):
    statement = insert(SurveyPodium).values(device_id=str(body.device_id), pages=body.pages)
    session.execute(
        statement.on_conflict_do_update(
            index_elements=["device_id"], set_={"pages": body.pages, "updated_at": func.now()}
        )
    )
    session.commit()


@router.get("/panel/survey", dependencies=[Depends(require_panel_password)])
def results(session: Session = Depends(get_session)):
    answers = session.scalars(select(SurveyAnswer).order_by(SurveyAnswer.updated_at.desc())).all()
    podiums = session.scalars(select(SurveyPodium).order_by(SurveyPodium.updated_at.desc())).all()
    return {
        "answers": [
            {
                "device_id": answer.device_id,
                "page": answer.page,
                "looks": answer.looks,
                "expensive": answer.expensive,
                "buying": answer.buying,
                "comment": answer.comment,
                "scrolled": answer.scrolled,
                "seconds": answer.seconds,
                "device": answer.device,
                "details": answer.details,
                "updated_at": answer.updated_at,
            }
            for answer in answers
        ],
        "podiums": [{"device_id": podium.device_id, "pages": podium.pages} for podium in podiums],
    }
