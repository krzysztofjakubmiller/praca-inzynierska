"""usuniecie oceny probnej

Revision ID: 7c2e5b90a1d4
Revises: 10491f11ade8
Create Date: 2026-11-14 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7c2e5b90a1d4'
down_revision: Union[str, Sequence[str], None] = '10491f11ade8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Ocena wpisana przy sprawdzaniu ankiety, nie od ankietowanego.
    op.execute(
        "delete from survey_answer "
        "where page = 'b' and looks = 10 and lower(btrim(comment)) = 'test test test'"
    )


def downgrade() -> None:
    """Downgrade schema."""
