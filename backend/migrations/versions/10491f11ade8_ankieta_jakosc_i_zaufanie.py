"""ankieta jakosc i zaufanie

Revision ID: 10491f11ade8
Revises: d41f7a9c2b6e
Create Date: 2026-11-14 22:22:50.729470

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '10491f11ade8'
down_revision: Union[str, Sequence[str], None] = 'd41f7a9c2b6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('survey_answer', sa.Column('quality', sa.SmallInteger(), nullable=True))
    op.add_column('survey_answer', sa.Column('trust', sa.SmallInteger(), nullable=True))
    op.alter_column('survey_answer', 'expensive',
               existing_type=sa.SMALLINT(),
               nullable=True)
    op.create_check_constraint('survey_answer_quality_valid', 'survey_answer', 'quality between 1 and 5')
    op.create_check_constraint('survey_answer_trust_valid', 'survey_answer', 'trust between 1 and 5')


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('survey_answer', 'expensive',
               existing_type=sa.SMALLINT(),
               nullable=False)
    op.drop_column('survey_answer', 'trust')
    op.drop_column('survey_answer', 'quality')
