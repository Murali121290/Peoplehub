"""add cancelled_dates to leave_requests

Revision ID: 020
Revises: 019
Create Date: 2026-08-20 14:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '020'
down_revision: Union[str, None] = '019'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add cancelled_dates column to leave_requests if it doesn't exist
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    columns = [c['name'] for c in sa_inspector.get_columns('leave_requests')]

    if 'cancelled_dates' not in columns:
        op.add_column(
            'leave_requests',
            sa.Column('cancelled_dates', sa.JSON(), nullable=True)
        )
        print("[020] Added column 'cancelled_dates' to leave_requests.")
    else:
        print("[020] Column 'cancelled_dates' already exists in leave_requests — skipping.")


def downgrade() -> None:
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    columns = [c['name'] for c in sa_inspector.get_columns('leave_requests')]

    if 'cancelled_dates' in columns:
        op.drop_column('leave_requests', 'cancelled_dates')
        print("[020] Dropped column 'cancelled_dates' from leave_requests.")
