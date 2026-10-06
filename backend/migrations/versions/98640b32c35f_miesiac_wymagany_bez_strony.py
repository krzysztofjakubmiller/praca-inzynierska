"""miesiąc wymagany, bez strony

Revision ID: 98640b32c35f
Revises: c5ffa72655a0
Create Date: 2026-10-06 23:19:26.009450

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '98640b32c35f'
down_revision: Union[str, Sequence[str], None] = 'c5ffa72655a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('task', 'month',
               existing_type=sa.SMALLINT(),
               nullable=False)
    op.drop_column('task', 'page')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('task', sa.Column('page', sa.SMALLINT(), autoincrement=False, nullable=True))
    op.alter_column('task', 'month',
               existing_type=sa.SMALLINT(),
               nullable=True)
