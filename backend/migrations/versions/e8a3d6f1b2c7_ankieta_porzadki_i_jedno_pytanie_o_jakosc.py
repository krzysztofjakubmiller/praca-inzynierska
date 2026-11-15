"""ankieta porzadki i jedno pytanie o jakosc

Revision ID: e8a3d6f1b2c7
Revises: 7c2e5b90a1d4
Create Date: 2026-11-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e8a3d6f1b2c7'
down_revision: Union[str, Sequence[str], None] = '7c2e5b90a1d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Urządzenia z mniej niż trzema ocenami nie porównały stron między sobą.
    op.execute(
        "delete from survey_answer where device_id in ("
        "select device_id from survey_answer group by device_id having count(*) < 3)"
    )
    op.execute(
        "delete from survey_podium where device_id not in (select device_id from survey_answer)"
    )
    # Jeden oceniający zrozumiał „drogo” jako wysoką cenę, więc jego odpowiedzi na to pytanie
    # nie przechodzą do pytania o jakość.
    op.execute(
        "update survey_answer set expensive = null "
        "where details->>'model' = 'moto g77' and details->>'screen' = '856x393@2.75'"
    )
    # Pozostałe odpowiedzi na „drogo” znaczyły to samo co nowe pytanie o wysoką jakość.
    op.execute(
        "update survey_answer set quality = expensive "
        "where quality is null and expensive is not null"
    )
    op.drop_column('survey_answer', 'expensive')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('survey_answer', sa.Column('expensive', sa.SmallInteger(), nullable=True))
    op.create_check_constraint(
        'survey_answer_expensive_valid', 'survey_answer', 'expensive between 1 and 5'
    )
