"""sekcje cke przy zadaniu i trudnosci w profilu

Revision ID: e5e6dbe10baa
Revises: 5d2f8a17c3e9
Create Date: 2026-11-06 11:13:24.301894

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e5e6dbe10baa'
down_revision: Union[str, Sequence[str], None] = '5d2f8a17c3e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('profile', sa.Column('learning_difficulties', sa.Text(), server_default='brak', nullable=False))
    op.create_check_constraint(
        'profile_learning_difficulties_valid',
        'profile',
        "learning_difficulties in ('brak', 'specyficzne', 'dyskalkulia')",
    )
    op.add_column('task', sa.Column('solutions', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('task', sa.Column('specific_difficulties', sa.Text(), nullable=True))
    op.add_column('task', sa.Column('dyscalculia', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_check_constraint(
        'task_cke_sections_only_open',
        'task',
        "answer_format = 'otwarte' or "
        "(solutions is null and specific_difficulties is null and dyscalculia is null)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('task_cke_sections_only_open', 'task', type_='check')
    op.drop_column('task', 'dyscalculia')
    op.drop_column('task', 'specific_difficulties')
    op.drop_column('task', 'solutions')
    op.drop_constraint('profile_learning_difficulties_valid', 'profile', type_='check')
    op.drop_column('profile', 'learning_difficulties')
