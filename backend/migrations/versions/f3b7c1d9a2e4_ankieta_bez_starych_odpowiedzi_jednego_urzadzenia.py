"""ankieta bez starych odpowiedzi jednego urzadzenia

Revision ID: f3b7c1d9a2e4
Revises: e8a3d6f1b2c7
Create Date: 2026-11-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f3b7c1d9a2e4'
down_revision: Union[str, Sequence[str], None] = 'e8a3d6f1b2c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Poprzednia migracja rozpoznawała to urządzenie po rozmiarze ekranu, który zmienia się
    # po obróceniu telefonu, więc trafiła tylko w jedną z jego ocen. Brak odpowiedzi o zaufanie
    # oznacza ocenę z pierwszej wersji ankiety, czyli jakość przepisaną ze starego pytania.
    op.execute(
        "update survey_answer set quality = null "
        "where device_id = 'd424168e-775f-4912-a552-8a76c02120b5' and trust is null"
    )


def downgrade() -> None:
    """Downgrade schema."""
