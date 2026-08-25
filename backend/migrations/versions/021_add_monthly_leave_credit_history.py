"""add leave_credit_history

Revision ID: 021
Revises: 020
Create Date: 2026-08-25 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '021'
down_revision: Union[str, None] = '020'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table already exists
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    tables = sa_inspector.get_table_names()

    if 'leave_credit_history' not in tables:
        op.create_table(
            'leave_credit_history',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('run_date', sa.DateTime(), nullable=True),
            sa.Column('month', sa.Integer(), nullable=False),
            sa.Column('year', sa.Integer(), nullable=False),
            sa.Column('credit_type', sa.String(length=20), server_default="month", nullable=False),
            sa.Column('employees_updated', sa.Integer(), nullable=True),
            sa.Column('employee_details_json', sa.Text(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        print("[021] Created table leave_credit_history.")
    else:
        print("[021] Table leave_credit_history already exists — skipping.")


def downgrade() -> None:
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    tables = sa_inspector.get_table_names()

    if 'leave_credit_history' in tables:
        op.drop_table('leave_credit_history')
        print("[021] Dropped table leave_credit_history.")
