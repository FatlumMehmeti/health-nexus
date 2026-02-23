"""merge_heads

Revision ID: a3abb85a42fa
Revises: b2c3d4e5f6a7, f8a7a307dd99
Create Date: 2026-02-23 12:59:54.452039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3abb85a42fa'
down_revision: Union[str, Sequence[str], None] = ('b2c3d4e5f6a7', 'f8a7a307dd99')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
