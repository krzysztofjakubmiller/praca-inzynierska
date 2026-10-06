from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import panel
from app.db import get_session

app = FastAPI()
app.include_router(panel.router)


@app.get("/api/health")
def health(session: Session = Depends(get_session)):
    session.execute(text("select 1"))
    return {"status": "ok"}
