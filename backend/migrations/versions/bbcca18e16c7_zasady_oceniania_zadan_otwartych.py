"""zasady oceniania zadan otwartych

Revision ID: bbcca18e16c7
Revises: dd3d9c81a7a3
Create Date: 2026-10-26 00:01:27.382003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'bbcca18e16c7'
down_revision: Union[str, Sequence[str], None] = 'dd3d9c81a7a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('task', sa.Column('scoring', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_check_constraint(
        'task_scoring_only_open', 'task', "scoring is null or answer_format = 'otwarte'"
    )
    op.add_column('solution', sa.Column('open_answer', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('solution', 'open_answer')
    op.drop_constraint('task_scoring_only_open', 'task', type_='check')
    op.drop_column('task', 'scoring')
