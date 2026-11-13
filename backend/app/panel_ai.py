import json

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.access import require_panel_password
from app.db import get_session
from app.models import Account, AiRequest, ReviewCard, Solution, Task

router = APIRouter(prefix="/api/panel/ai", dependencies=[Depends(require_panel_password)])

# Najnowsze oceny trudności; starsze nie są potrzebne do bieżącego sprawdzania.
RATINGS_LIMIT = 300


class TutorPoints(BaseModel):
    points: int


def load_grade(session: Session, request_id: int) -> AiRequest:
    request = session.get(AiRequest, request_id)
    if request is None or request.kind != "ocena":
        raise HTTPException(status_code=404, detail=["nie ma takiej oceny AI"])
    return request


# Oceny AI, najnowsze najpierw, do porównania z oceną korepetytora.
@router.get("/grades")
def grades(session: Session = Depends(get_session)):
    rows = session.execute(
        select(AiRequest, Task)
        .join(Task, Task.id == AiRequest.task_id)
        .where(AiRequest.kind == "ocena")
        .order_by(AiRequest.created_at.desc())
    ).all()
    result = []
    for request, task in rows:
        reply = json.loads(request.reply)
        result.append(
            {
                "id": request.id,
                "created_at": request.created_at.isoformat(),
                "task_id": task.id,
                "content": task.content,
                "max_points": task.max_points,
                "model": request.model,
                # Przy nieczytelnym zdjęciu AI nie przyznaje punktów.
                "ai_points": min(reply["points"], task.max_points) if reply["readable"] else None,
                "reading": reply["reading"],
                "explanation": reply["explanation"],
                "text": request.text,
                "has_image": request.image is not None,
                "image_file": request.image_file,
                "tutor_points": request.tutor_points,
                "feedback": request.feedback,
                "feedback_comment": request.feedback_comment,
            }
        )
    return result


@router.get("/grades/{request_id}/image")
def grade_image(request_id: int, session: Session = Depends(get_session)):
    request = load_grade(session, request_id)
    if request.image is None:
        raise HTTPException(status_code=404, detail=["zdjęcia nie ma w bazie"])
    return Response(request.image, media_type=request.image_type)


@router.put("/grades/{request_id}/tutor-points", status_code=204)
def set_tutor_points(request_id: int, body: TutorPoints, session: Session = Depends(get_session)):
    request = load_grade(session, request_id)
    max_points = session.get(Task, request.task_id).max_points
    if not 0 <= body.points <= max_points:
        raise HTTPException(status_code=422, detail=[f"punkty od 0 do {max_points}"])
    request.tutor_points = body.points
    session.commit()


# Oceny trudności: co wybrał uczeń, co trafiło do FSRS i kiedy zadanie wróci. Ocena końcowa
# różni się od oceny ucznia, gdy uczeń korzystał z pomocy AI (practice.rate_solution).
@router.get("/ratings")
def ratings(changed: bool = False, session: Session = Depends(get_session)):
    query = (
        select(Solution, Account.email, AiRequest.reply, ReviewCard.due)
        .join(Account, Account.id == Solution.account_id)
        .outerjoin(
            AiRequest,
            and_(AiRequest.solution_id == Solution.id, AiRequest.kind == "ocena-trudnosci"),
        )
        .outerjoin(
            ReviewCard,
            and_(
                ReviewCard.account_id == Solution.account_id,
                ReviewCard.task_id == Solution.task_id,
            ),
        )
        .where(Solution.rating.is_not(None))
        .order_by(Solution.created_at.desc())
        .limit(RATINGS_LIMIT)
    )
    if changed:
        query = query.where(Solution.rating != Solution.student_rating)
    return [
        {
            "solution_id": solution.id,
            "task_id": solution.task_id,
            "email": email,
            "created_at": solution.created_at.isoformat(),
            "student_rating": solution.student_rating,
            "rating": solution.rating,
            "reason": json.loads(reply)["reason"] if reply else None,
            "due": due.isoformat() if due else None,
        }
        for solution, email, reply, due in session.execute(query)
    ]
