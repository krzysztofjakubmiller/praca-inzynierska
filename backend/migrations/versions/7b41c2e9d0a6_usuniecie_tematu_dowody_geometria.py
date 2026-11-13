"""usuniecie tematu dowody geometria

Revision ID: 7b41c2e9d0a6
Revises: e5e6dbe10baa
Create Date: 2026-11-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError

# revision identifiers, used by Alembic.
revision: str = '7b41c2e9d0a6'
down_revision: Union[str, Sequence[str], None] = 'e5e6dbe10baa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Dowody geometryczne należą teraz do planimetrii, więc temat znika z mapy. Usuwa się go
    # tylko wtedy, gdy nic na niego nie wskazuje: zadanie albo inny klucz obcy przerwie DELETE,
    # punkt zapisu cofnie samo usunięcie, a reszta wdrożenia pójdzie dalej.
    connection = op.get_bind()
    savepoint = connection.begin_nested()
    try:
        connection.execute(
            sa.text(
                "delete from topic where code = 'dowody-geometria' "
                "and exam_id = (select id from exam where code = 'matura-podstawowa')"
            )
        )
        savepoint.commit()
    except IntegrityError:
        savepoint.rollback()


def downgrade() -> None:
    """Downgrade schema."""
    # Bez przywracania: temat dodaje seed, jeśli wróci do listy tematów.
