"""data akceptacji regulaminu

Revision ID: 854c518ecd6f
Revises: e9e7e6d816ac
Create Date: 2026-10-16 12:01:48.750773

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '854c518ecd6f'
down_revision: Union[str, Sequence[str], None] = 'e9e7e6d816ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('account', sa.Column('terms_accepted_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('account', 'terms_accepted_at')
