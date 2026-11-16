"""granatowy odcien ciemnego motywu

Revision ID: a7d2c5e9f1b3
Revises: f3b7c1d9a2e4
Create Date: 2026-11-16 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a7d2c5e9f1b3'
down_revision: Union[str, Sequence[str], None] = 'f3b7c1d9a2e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_constraint('profile_dark_shade_valid', 'profile', type_='check')
    op.create_check_constraint(
        'profile_dark_shade_valid', 'profile', "dark_shade in ('grey', 'black', 'navy')"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("update profile set dark_shade = 'grey' where dark_shade = 'navy'")
    op.drop_constraint('profile_dark_shade_valid', 'profile', type_='check')
    op.create_check_constraint(
        'profile_dark_shade_valid', 'profile', "dark_shade in ('grey', 'black')"
    )
