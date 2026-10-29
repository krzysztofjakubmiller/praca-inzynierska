"""szablony zadan

Revision ID: 3e8a94015e77
Revises: bbcca18e16c7
Create Date: 2026-10-26 00:14:02.531813

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3e8a94015e77'
down_revision: Union[str, Sequence[str], None] = 'bbcca18e16c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('task_template',
    sa.Column('task_id', sa.Integer(), nullable=False),
    sa.Column('body', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('ai_body', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('read_method', sa.Text(), nullable=False),
    sa.Column('read_model', sa.Text(), nullable=True),
    sa.Column('review_status', sa.Text(), nullable=False),
    sa.Column('check_result', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("read_method in ('recznie', 'gemini', 'inne-ai')", name='task_template_read_method_valid'),
    sa.CheckConstraint("review_status in ('do-sprawdzenia', 'sprawdzone')", name='task_template_review_status_valid'),
    sa.ForeignKeyConstraint(['task_id'], ['task.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('task_id')
    )
    op.add_column('solution', sa.Column('variant', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('solution', 'variant')
    op.drop_table('task_template')
