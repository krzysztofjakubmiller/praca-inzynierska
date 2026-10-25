"""karty powtorek

Revision ID: dd3d9c81a7a3
Revises: 2c16c8eef6ce
Create Date: 2026-10-25 17:24:18.935605

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dd3d9c81a7a3'
down_revision: Union[str, Sequence[str], None] = '2c16c8eef6ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('review_card',
    sa.Column('account_id', sa.Integer(), nullable=False),
    sa.Column('task_id', sa.Integer(), nullable=False),
    sa.Column('state', sa.Text(), nullable=False),
    sa.Column('step', sa.SmallInteger(), nullable=True),
    sa.Column('stability', sa.Double(), nullable=True),
    sa.Column('difficulty', sa.Double(), nullable=True),
    sa.Column('due', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_review', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("state in ('nauka', 'powtorka', 'ponowna-nauka')", name='review_card_state_valid'),
    sa.ForeignKeyConstraint(['account_id'], ['account.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['task_id'], ['task.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('account_id', 'task_id')
    )
    op.create_index('review_card_due', 'review_card', ['account_id', 'due'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('review_card_due', table_name='review_card')
    op.drop_table('review_card')
