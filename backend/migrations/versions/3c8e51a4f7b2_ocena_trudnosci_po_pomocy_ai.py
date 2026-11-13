"""ocena trudnosci po pomocy ai

Revision ID: 3c8e51a4f7b2
Revises: 7b41c2e9d0a6
Create Date: 2026-11-09 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c8e51a4f7b2'
down_revision: Union[str, Sequence[str], None] = '7b41c2e9d0a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('solution', sa.Column('student_rating', sa.Text(), nullable=True))
    op.create_check_constraint(
        'solution_student_rating_valid',
        'solution',
        "student_rating in ('latwy', 'sredni', 'trudny', 'bardzo-trudny')",
    )
    # Dotąd ocena końcowa była zawsze oceną ucznia.
    op.execute("update solution set student_rating = rating")
    op.drop_constraint('ai_request_kind_valid', 'ai_request', type_='check')
    op.create_check_constraint(
        'ai_request_kind_valid',
        'ai_request',
        "kind in ('ocena', 'rozwiazanie', 'pytanie', 'ocena-trudnosci')",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("delete from ai_request where kind = 'ocena-trudnosci'")
    op.drop_constraint('ai_request_kind_valid', 'ai_request', type_='check')
    op.create_check_constraint(
        'ai_request_kind_valid', 'ai_request', "kind in ('ocena', 'rozwiazanie', 'pytanie')"
    )
    op.drop_constraint('solution_student_rating_valid', 'solution', type_='check')
    op.drop_column('solution', 'student_rating')
