from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

from app.db import DATABASE_URL
from app.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Testy podają tu adres bazy testowej, w pozostałych przypadkach to ta sama baza co aplikacji.
url = config.get_main_option("sqlalchemy.url") or DATABASE_URL

engine = create_engine(url)
with engine.connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata)
    with context.begin_transaction():
        context.run_migrations()
engine.dispose()
