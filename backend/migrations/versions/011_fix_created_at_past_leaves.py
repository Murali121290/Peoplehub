"""fix created_at for past leaves with future dates

Revision ID: 011
Revises: 010
Create Date: 2026-07-31 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011'
down_revision: Union[str, None] = '010'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update created_at to UTC timezone now() for all leave requests where it was set to a future date
    op.execute("UPDATE leave_requests SET created_at = timezone('utc', now()) WHERE created_at > timezone('utc', now())")


def downgrade() -> None:
    pass
