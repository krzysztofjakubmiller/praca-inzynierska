"""tabele treści

Revision ID: c5ffa72655a0
Revises: 
Create Date: 2026-10-06 22:56:44.771410

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c5ffa72655a0'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('exam',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('code', sa.Text(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )
    op.create_table('source_kind',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('exam_id', sa.Integer(), nullable=False),
    sa.Column('code', sa.Text(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.ForeignKeyConstraint(['exam_id'], ['exam.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('exam_id', 'code'),
    sa.UniqueConstraint('exam_id', 'id')
    )
    op.create_table('topic',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('exam_id', sa.Integer(), nullable=False),
    sa.Column('code', sa.Text(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.ForeignKeyConstraint(['exam_id'], ['exam.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('exam_id', 'code'),
    sa.UniqueConstraint('exam_id', 'id')
    )
    op.create_table('task',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('exam_id', sa.Integer(), nullable=False),
    sa.Column('topic_id', sa.Integer(), nullable=False),
    sa.Column('source_kind_id', sa.Integer(), nullable=False),
    sa.Column('year', sa.SmallInteger(), nullable=False),
    sa.Column('month', sa.SmallInteger(), nullable=True),
    sa.Column('number', sa.SmallInteger(), nullable=False),
    sa.Column('subnumber', sa.SmallInteger(), nullable=True),
    sa.Column('page', sa.SmallInteger(), nullable=True),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('has_figure', sa.Boolean(), nullable=False),
    sa.Column('answer_format', sa.Text(), nullable=False),
    sa.Column('choices', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('answer', sa.Text(), nullable=True),
    sa.Column('max_points', sa.SmallInteger(), nullable=False),
    sa.Column('review_status', sa.Text(), nullable=False),
    sa.Column('read_method', sa.Text(), nullable=False),
    sa.Column('read_model', sa.Text(), nullable=True),
    sa.Column('ai_content', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    sa.CheckConstraint("answer_format in ('wielokrotny-wybor', 'prawda-falsz', 'dobieranie', 'otwarte')", name='task_answer_format_valid'),
    sa.CheckConstraint("read_method in ('recznie', 'gemini', 'inne-ai')", name='task_read_method_valid'),
    sa.CheckConstraint("review_status <> 'sprawdzone' or answer is not null", name='task_reviewed_has_answer'),
    sa.CheckConstraint("review_status in ('do-sprawdzenia', 'sprawdzone')", name='task_review_status_valid'),
    sa.CheckConstraint('max_points > 0', name='task_max_points_positive'),
    sa.CheckConstraint('month between 1 and 12', name='task_month_valid'),
    sa.ForeignKeyConstraint(['exam_id', 'source_kind_id'], ['source_kind.exam_id', 'source_kind.id'], name='task_source_kind_same_exam'),
    sa.ForeignKeyConstraint(['exam_id', 'topic_id'], ['topic.exam_id', 'topic.id'], name='task_topic_same_exam'),
    sa.ForeignKeyConstraint(['exam_id'], ['exam.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('source_kind_id', 'year', 'month', 'number', 'subnumber', name='task_source_unique', postgresql_nulls_not_distinct=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('task')
    op.drop_table('topic')
    op.drop_table('source_kind')
    op.drop_table('exam')
