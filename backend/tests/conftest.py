from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.db import get_session
from app.main import app
from app.seed import seed

LOCAL_DATABASE_URL = "postgresql+psycopg://matma:matma@localhost:5432/matma"
TEST_DATABASE_URL = "postgresql+psycopg://matma:matma@localhost:5432/matma_test"


@pytest.fixture(scope="session")
def engine():
    # Przy każdym uruchomieniu testów świeża baza, zbudowana tymi samymi migracjami co prawdziwa.
    admin = create_engine(LOCAL_DATABASE_URL, isolation_level="AUTOCOMMIT")
    with admin.connect() as connection:
        connection.execute(text("drop database if exists matma_test with (force)"))
        connection.execute(text("create database matma_test"))
    admin.dispose()

    config = Config(Path(__file__).parent.parent / "alembic.ini")
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    command.upgrade(config, "head")

    engine = create_engine(TEST_DATABASE_URL)
    with Session(engine) as session:
        seed(session)
        session.commit()
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    # Każdy test działa w transakcji cofanej na końcu, więc nie zostawia po sobie danych.
    with engine.connect() as connection:
        transaction = connection.begin()
        with Session(connection, join_transaction_mode="create_savepoint") as session:
            yield session
        transaction.rollback()


@pytest.fixture
def client(session, monkeypatch):
    monkeypatch.setenv("ACCESS_PASSWORD", "haslo-testowe")
    app.dependency_overrides[get_session] = lambda: session
    yield TestClient(app, headers={"Authorization": "Bearer haslo-testowe"})
    app.dependency_overrides.clear()
