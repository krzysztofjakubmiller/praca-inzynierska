import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Domyślnie lokalna baza z compose.yaml. Na serwerze adres przychodzi w zmiennej środowiskowej.
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://matma:matma@localhost:5432/matma"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(engine)


def get_session():
    with SessionLocal() as session:
        yield session
