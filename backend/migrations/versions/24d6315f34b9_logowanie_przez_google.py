"""logowanie przez google

Revision ID: 24d6315f34b9
Revises: af13b929bb89
Create Date: 2026-10-12 23:01:56.073054

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '24d6315f34b9'
down_revision: Union[str, Sequence[str], None] = 'af13b929bb89'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('account', sa.Column('google_id', sa.Text(), nullable=True))
    op.alter_column('account', 'password_hash',
               existing_type=sa.TEXT(),
               nullable=True)
    op.create_unique_constraint('account_google_id_key', 'account', ['google_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('account_google_id_key', 'account', type_='unique')
    op.alter_column('account', 'password_hash',
               existing_type=sa.TEXT(),
               nullable=False)
    op.drop_column('account', 'google_id')
