"""ankieta wizytowek

Revision ID: cca688c5b6ec
Revises: 3c8e51a4f7b2
Create Date: 2026-11-14 02:23:56.552065

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'cca688c5b6ec'
down_revision: Union[str, Sequence[str], None] = '3c8e51a4f7b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('survey_answer',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('device_id', sa.Text(), nullable=False),
    sa.Column('page', sa.Text(), nullable=False),
    sa.Column('looks', sa.SmallInteger(), nullable=False),
    sa.Column('expensive', sa.SmallInteger(), nullable=False),
    sa.Column('buying', sa.SmallInteger(), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('scrolled', sa.SmallInteger(), nullable=False),
    sa.Column('seconds', sa.Integer(), nullable=False),
    sa.Column('device', sa.Text(), nullable=False),
    sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint("device in ('telefon', 'tablet', 'komputer')", name='survey_answer_device_valid'),
    sa.CheckConstraint('buying between 1 and 5', name='survey_answer_buying_valid'),
    sa.CheckConstraint('expensive between 1 and 5', name='survey_answer_expensive_valid'),
    sa.CheckConstraint('looks between 1 and 10', name='survey_answer_looks_valid'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('device_id', 'page')
    )
    op.create_table('survey_podium',
    sa.Column('device_id', sa.Text(), nullable=False),
    sa.Column('pages', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('device_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('survey_podium')
    op.drop_table('survey_answer')
