"""zapytania do ai

Revision ID: 5d2f8a17c3e9
Revises: 3e8a94015e77
Create Date: 2026-10-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5d2f8a17c3e9'
down_revision: Union[str, Sequence[str], None] = '3e8a94015e77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('ai_request',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('account_id', sa.Integer(), nullable=False),
    sa.Column('task_id', sa.Integer(), nullable=False),
    sa.Column('solution_id', sa.Integer(), nullable=True),
    sa.Column('kind', sa.Text(), nullable=False),
    sa.Column('image', sa.LargeBinary(), nullable=True),
    sa.Column('image_type', sa.Text(), nullable=True),
    sa.Column('text', sa.Text(), nullable=True),
    sa.Column('reply', sa.Text(), nullable=False),
    sa.Column('model', sa.Text(), nullable=False),
    sa.Column('failed_models', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('prompt_version', sa.SmallInteger(), nullable=False),
    sa.Column('input_tokens', sa.Integer(), nullable=False),
    sa.Column('output_tokens', sa.Integer(), nullable=False),
    sa.Column('cost', sa.Float(), nullable=True),
    sa.Column('seconds', sa.Float(), nullable=False),
    sa.Column('feedback', sa.Text(), nullable=True),
    sa.Column('feedback_comment', sa.Text(), nullable=True),
    sa.Column('tutor_points', sa.SmallInteger(), nullable=True),
    sa.Column('image_file', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("kind in ('ocena', 'rozwiazanie', 'pytanie')", name='ai_request_kind_valid'),
    sa.CheckConstraint("feedback in ('zgadzam-sie', 'nie-zgadzam-sie', 'pomoglo', 'nie-pomoglo')", name='ai_request_feedback_valid'),
    sa.ForeignKeyConstraint(['account_id'], ['account.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['solution_id'], ['solution.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['task_id'], ['task.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ai_request_by_day', 'ai_request', ['account_id', 'created_at'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ai_request_by_day', table_name='ai_request')
    op.drop_table('ai_request')
