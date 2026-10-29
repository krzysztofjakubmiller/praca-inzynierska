import json

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.access import require_panel_password
from app.db import get_session
from app.models import AiRequest, Task

router = APIRouter(prefix="/api/panel/ai", dependencies=[Depends(require_panel_password)])


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
