"""add indexes on leave_requests/shift_requests employee_id and status

Revision ID: 015
Revises: 014
Create Date: 2026-08-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '015'
down_revision: Union[str, None] = '014'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEXES = [
    ("ix_leave_requests_employee_id", "leave_requests", ["employee_id"]),
    ("ix_leave_requests_status", "leave_requests", ["status"]),
    ("ix_leave_requests_employee_id_status", "leave_requests", ["employee_id", "status"]),
    ("ix_shift_requests_employee_id", "shift_requests", ["employee_id"]),
    ("ix_shift_requests_status", "shift_requests", ["status"]),
    ("ix_shift_requests_employee_id_status", "shift_requests", ["employee_id", "status"]),
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    for index_name, table_name, columns in INDEXES:
        existing = {ix["name"] for ix in inspector.get_indexes(table_name)}
        if index_name not in existing:
            op.create_index(index_name, table_name, columns)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    for index_name, table_name, _columns in INDEXES:
        existing = {ix["name"] for ix in inspector.get_indexes(table_name)}
        if index_name in existing:
            op.drop_index(index_name, table_name=table_name)
