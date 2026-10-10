import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app import panel
from app.access import require_password
from app.db import get_session

app = FastAPI()
app.include_router(panel.router)

# Na serwerze frontend i API mają różne adresy, więc przeglądarka przyjmie odpowiedzi API tylko
# dla stron z tej listy. Lokalnie lista jest pusta, bo Vite przekazuje /api pod tym samym adresem.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin for origin in os.environ.get("FRONTEND_ORIGINS", "").split(",") if origin],
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type"],
)


# Frontend sprawdza tu hasło wpisane na stronie wejścia, zanim zapamięta je w przeglądarce.
@app.get("/api/access", status_code=204, dependencies=[Depends(require_password)])
def check_access():
    pass


@app.get("/api/health")
def health(session: Session = Depends(get_session)):
    session.execute(text("select 1"))
    return {"status": "ok"}
