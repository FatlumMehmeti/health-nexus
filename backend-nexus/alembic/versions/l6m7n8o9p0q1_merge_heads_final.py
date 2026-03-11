"""merge terminal heads

Revision ID: l6m7n8o9p0q1
Revises: d4e5f6a7b8c9, eb76b54cb0a0
Create Date: 2026-03-11

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "l6m7n8o9p0q1"
down_revision: Union[str, Sequence[str], None] = ("d4e5f6a7b8c9", "eb76b54cb0a0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
