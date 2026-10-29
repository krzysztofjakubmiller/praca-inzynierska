from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.access import require_panel_password
from app.db import get_session
from app.equivalence import Unreadable
from app.models import TaskTemplate
from app.panel import load_task
from app.variants import Template, check_template, draw_values, render, shuffled

router = APIRouter(prefix="/api/panel", dependencies=[Depends(require_panel_password)])

# Tyle wariantów do obejrzenia obok oryginału przy akceptacji.
PREVIEW_SEEDS = (1, 2, 3)


class TemplateBody(BaseModel):
    body: dict


def preview(body: dict) -> list[dict]:
    # Oryginał i kilka wariantów tak, jak zobaczy je uczeń, razem z tasowaniem A–D.
    try:
        template = Template.model_validate(body)
        shown = [{"variant": None, **render(template, template.original)}]
    except (ValueError, Unreadable):
        return []
    for seed in PREVIEW_SEEDS:
        variant = draw_values(template, seed)
        if variant and all(item["variant"] != variant for item in shown):
            shown.append({"variant": variant, **shuffled(render(template, variant), variant)})
    return shown


def template_details(row: TaskTemplate) -> dict:
    return {
        "body": row.body,
        "ai_body": row.ai_body,
        "read_method": row.read_method,
        "read_model": row.read_model,
        "review_status": row.review_status,
        "check_result": row.check_result,
        "preview": preview(row.body),
    }


def load_template(session: Session, task_id: int) -> TaskTemplate:
    row = session.get(TaskTemplate, load_task(session, task_id).id)
    if row is None:
        raise HTTPException(status_code=404, detail=["zadanie nie ma szablonu"])
    return row


@router.get("/tasks/{task_id}/template")
def get_template(task_id: int, session: Session = Depends(get_session)):
    row = session.get(TaskTemplate, load_task(session, task_id).id)
    return template_details(row) if row else None


# Poprawka w panelu: szablon wraca do sprawdzenia, a kopia od AI zostaje do pomiaru.
@router.put("/tasks/{task_id}/template")
def save_template(task_id: int, data: TemplateBody, session: Session = Depends(get_session)):
    task = load_task(session, task_id)
    row = session.get(TaskTemplate, task.id)
    if row is None:
        row = TaskTemplate(task_id=task.id, read_method="recznie")
        session.add(row)
    row.body = data.body
    row.check_result = check_template(task, data.body)
    row.review_status = "do-sprawdzenia"
    row.reviewed_at = None
    session.commit()
    return template_details(row)


# Sprawdzenie od nowa, bo zadanie mogło się zmienić od ostatniego sprawdzenia szablonu.
@router.post("/tasks/{task_id}/template/accept")
def accept_template(task_id: int, session: Session = Depends(get_session)):
    row = load_template(session, task_id)
    row.check_result = check_template(load_task(session, task_id), row.body)
    if not row.check_result["passed"]:
        session.commit()
        raise HTTPException(status_code=422, detail=row.check_result["problems"])
    row.review_status = "sprawdzone"
    row.reviewed_at = datetime.now(UTC)
    session.commit()
    return template_details(row)


@router.delete("/tasks/{task_id}/template", status_code=204)
def delete_template(task_id: int, session: Session = Depends(get_session)):
    session.delete(load_template(session, task_id))
    session.commit()
