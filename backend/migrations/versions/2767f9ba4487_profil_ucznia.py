"""profil ucznia

Revision ID: 2767f9ba4487
Revises: 6685c2e61129
Create Date: 2026-10-16 13:35:54.460276

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2767f9ba4487'
down_revision: Union[str, Sequence[str], None] = '6685c2e61129'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('profile',
    sa.Column('account_id', sa.Integer(), nullable=False),
    sa.Column('level', sa.Text(), nullable=False),
    sa.Column('exam_year', sa.SmallInteger(), nullable=False),
    sa.Column('target_percent', sa.SmallInteger(), nullable=True),
    sa.Column('theme', sa.Text(), nullable=False),
    sa.Column('dark_shade', sa.Text(), nullable=False),
    sa.Column('daily_reviews', sa.Text(), nullable=False),
    sa.CheckConstraint("daily_reviews in ('malo', 'srednio', 'duzo')", name='profile_daily_reviews_valid'),
    sa.CheckConstraint("dark_shade in ('grey', 'black')", name='profile_dark_shade_valid'),
    sa.CheckConstraint("level in ('podstawowa', 'rozszerzona')", name='profile_level_valid'),
    sa.CheckConstraint("theme in ('light', 'dark')", name='profile_theme_valid'),
    sa.CheckConstraint('target_percent between 1 and 100', name='profile_target_percent_valid'),
    sa.ForeignKeyConstraint(['account_id'], ['account.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('account_id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('profile')
