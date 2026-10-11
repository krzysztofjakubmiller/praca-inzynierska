"""rysunki w zadaniach

Revision ID: 582b125cd965
Revises: c553e377e29a
Create Date: 2026-10-11 11:59:05.277414

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '582b125cd965'
down_revision: Union[str, Sequence[str], None] = 'c553e377e29a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('task', sa.Column('figures', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    # Zadania zaimportowane z samym znacznikiem rysunku czekają na uzupełnienie.
    op.execute("""update task set figures = '{"content": {"type": "nieznany"}}' where has_figure""")
    op.create_check_constraint('task_has_figure_matches', 'task', 'has_figure = (figures is not null)')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('task_has_figure_matches', 'task', type_='check')
    op.drop_column('task', 'figures')
