"""limit prób

Revision ID: 6685c2e61129
Revises: 854c518ecd6f
Create Date: 2026-10-16 12:46:54.187848

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6685c2e61129'
down_revision: Union[str, Sequence[str], None] = '854c518ecd6f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('attempt',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('kind', sa.Text(), nullable=False),
    sa.Column('key', sa.Text(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("kind in ('logowanie', 'mail')", name='attempt_kind_valid'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('attempt_lookup', 'attempt', ['kind', 'key', 'created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('attempt_lookup', table_name='attempt')
    op.drop_table('attempt')
