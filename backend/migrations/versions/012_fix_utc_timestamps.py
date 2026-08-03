"""fix utc timestamps in leave requests

Revision ID: 012
Revises: 011
Create Date: 2026-07-31 17:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '012'
down_revision: Union[str, None] = '011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Subtract 5 hours and 30 minutes from any created_at values that are not at exactly midnight
    # (i.e. those created in IST local time by the previous migration)
    op.execute(
        "UPDATE leave_requests "
        "SET created_at = created_at - INTERVAL '5 hours 30 minutes' "
        "WHERE EXTRACT(HOUR FROM created_at) <> 0 OR EXTRACT(MINUTE FROM created_at) <> 0 OR EXTRACT(SECOND FROM created_at) <> 0"
    )


def downgrade() -> None:
    pass
