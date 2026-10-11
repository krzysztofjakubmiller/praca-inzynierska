"""zakres osi liczbowej z podpisów

Revision ID: 6ccdb0b17545
Revises: 582b125cd965
Create Date: 2026-10-11 12:45:41.795942

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6ccdb0b17545'
down_revision: Union[str, Sequence[str], None] = '582b125cd965'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        update task set figures = (
            select jsonb_object_agg(
                place,
                case when figure ->> 'type' = 'os-liczbowa' then figure - 'min' - 'max' else figure end
            )
            from jsonb_each(figures) as each(place, figure)
        )
        where figures is not null
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Usuniętego zakresu nie da się odtworzyć.
    pass
