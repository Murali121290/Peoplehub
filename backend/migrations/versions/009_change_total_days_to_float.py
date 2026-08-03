"""change total_days to float

Revision ID: 009
Revises: fd6878f9f344
Create Date: 2026-07-31 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009'
down_revision: Union[str, None] = '008'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Update existing NULL values to 0 before altering to avoid nullable=False violation
    op.execute("UPDATE leave_requests SET total_days = 0 WHERE total_days IS NULL")

    # Change total_days from integer to double precision (sa.Float())
    op.alter_column('leave_requests', 'total_days',
               existing_type=sa.Integer(),
               type_=sa.Float(),
               nullable=False,
               postgresql_using='COALESCE(total_days, 0)::double precision')


def downgrade() -> None:
    # Revert total_days to integer
    op.alter_column('leave_requests', 'total_days',
               existing_type=sa.Float(),
               type_=sa.Integer(),
               nullable=True,
               postgresql_using='total_days::integer')
