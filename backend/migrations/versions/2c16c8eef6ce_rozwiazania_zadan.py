"""rozwiazania zadan

Revision ID: 2c16c8eef6ce
Revises: 2767f9ba4487
Create Date: 2026-10-25 17:08:56.385408

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c16c8eef6ce'
down_revision: Union[str, Sequence[str], None] = '2767f9ba4487'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('solution',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('account_id', sa.Integer(), nullable=False),
    sa.Column('task_id', sa.Integer(), nullable=False),
    sa.Column('mode', sa.Text(), nullable=False),
    sa.Column('answer', sa.Text(), nullable=True),
    sa.Column('points', sa.SmallInteger(), nullable=False),
    sa.Column('rating', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("mode in ('cwiczenie', 'losowe', 'powtorka')", name='solution_mode_valid'),
    sa.CheckConstraint("rating in ('latwy', 'sredni', 'trudny', 'bardzo-trudny')", name='solution_rating_valid'),
    sa.CheckConstraint('points >= 0', name='solution_points_not_negative'),
    sa.ForeignKeyConstraint(['account_id'], ['account.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['task_id'], ['task.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('solution_by_day', 'solution', ['account_id', 'created_at'], unique=False)
    op.create_index('solution_by_task', 'solution', ['account_id', 'task_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('solution_by_task', table_name='solution')
    op.drop_index('solution_by_day', table_name='solution')
    op.drop_table('solution')
