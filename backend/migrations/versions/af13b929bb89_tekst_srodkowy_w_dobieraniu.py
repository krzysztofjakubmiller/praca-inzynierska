"""tekst środkowy w zadaniach z dobieraniem

Revision ID: af13b929bb89
Revises: 6ccdb0b17545
Create Date: 2026-10-11 21:28:23.007727

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'af13b929bb89'
down_revision: Union[str, Sequence[str], None] = '6ccdb0b17545'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('task', sa.Column('connector', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('task', 'connector')
