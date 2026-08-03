"""add indexes on hot filter columns for attendance and employees

Revision ID: 008
Revises: 007
Create Date: 2026-08-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008'
down_revision: Union[str, None] = '007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    attendance_indexes = {ix['name'] for ix in inspector.get_indexes('attendance')}
    if 'ix_attendance_user_id' not in attendance_indexes:
        op.create_index('ix_attendance_user_id', 'attendance', ['user_id'])
    if 'ix_attendance_attendance_date' not in attendance_indexes:
        op.create_index('ix_attendance_attendance_date', 'attendance', ['attendance_date'])
    if 'ix_attendance_user_id_attendance_date' not in attendance_indexes:
        op.create_index('ix_attendance_user_id_attendance_date', 'attendance', ['user_id', 'attendance_date'])

    employees_indexes = {ix['name'] for ix in inspector.get_indexes('employees')}
    if 'ix_employees_user_id' not in employees_indexes:
        op.create_index('ix_employees_user_id', 'employees', ['user_id'])
    if 'ix_employees_status' not in employees_indexes:
        op.create_index('ix_employees_status', 'employees', ['status'])
    if 'ix_employees_employee_id' not in employees_indexes:
        op.create_index('ix_employees_employee_id', 'employees', ['employee_id'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    attendance_indexes = {ix['name'] for ix in inspector.get_indexes('attendance')}
    if 'ix_attendance_user_id_attendance_date' in attendance_indexes:
        op.drop_index('ix_attendance_user_id_attendance_date', table_name='attendance')
    if 'ix_attendance_attendance_date' in attendance_indexes:
        op.drop_index('ix_attendance_attendance_date', table_name='attendance')
    if 'ix_attendance_user_id' in attendance_indexes:
        op.drop_index('ix_attendance_user_id', table_name='attendance')

    employees_indexes = {ix['name'] for ix in inspector.get_indexes('employees')}
    if 'ix_employees_employee_id' in employees_indexes:
        op.drop_index('ix_employees_employee_id', table_name='employees')
    if 'ix_employees_status' in employees_indexes:
        op.drop_index('ix_employees_status', table_name='employees')
    if 'ix_employees_user_id' in employees_indexes:
        op.drop_index('ix_employees_user_id', table_name='employees')
