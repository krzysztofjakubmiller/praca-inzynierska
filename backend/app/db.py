import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Domyślnie lokalna baza z compose.yaml. Na serwerze adres przychodzi w zmiennej środowiskowej.
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://matma:matma@localhost:5432/matma"
)
# Render podaje adres jako postgresql://..., a przy takim SQLAlchemy szuka sterownika psycopg2
# zamiast zainstalowanego psycopg.
DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(engine)


def get_session():
    with SessionLocal() as session:
        yield session
