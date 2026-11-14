"""ankieta siedem stron

Revision ID: d41f7a9c2b6e
Revises: cca688c5b6ec
Create Date: 2026-11-14 12:00:00.000000

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd41f7a9c2b6e'
down_revision: Union[str, Sequence[str], None] = 'cca688c5b6ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Z ankiety wypadły trzy strony, a pozostałe dostały litery od a do g.
REMOVED = ('c', 'h', 'i')
RENAMED = (('d', 'c'), ('e', 'd'), ('j', 'e'))


def upgrade() -> None:
    """Upgrade schema."""
    connection = op.get_bind()
    connection.execute(
        sa.text("delete from survey_answer where page in :pages").bindparams(
            sa.bindparam("pages", REMOVED, expanding=True)
        )
    )
    # Kolejność ma znaczenie: litera musi być wolna, zanim dostanie ją następna strona.
    for old, new in RENAMED:
        connection.execute(
            sa.text("update survey_answer set page = :new where page = :old"),
            {"old": old, "new": new},
        )

    names = dict(RENAMED)
    podiums = connection.execute(sa.text("select device_id, pages from survey_podium")).all()
    for device_id, pages in podiums:
        kept = [names.get(page, page) for page in pages if page not in REMOVED]
        if kept:
            connection.execute(
                sa.text(
                    "update survey_podium set pages = cast(:pages as jsonb) where device_id = :id"
                ),
                {"pages": json.dumps(kept), "id": device_id},
            )
        else:
            connection.execute(
                sa.text("delete from survey_podium where device_id = :id"), {"id": device_id}
            )


def downgrade() -> None:
    """Downgrade schema."""
    connection = op.get_bind()
    # Usuniętych ocen nie da się odtworzyć; wracają tylko litery.
    for old, new in reversed(RENAMED):
        connection.execute(
            sa.text("update survey_answer set page = :old where page = :new"),
            {"old": old, "new": new},
        )
