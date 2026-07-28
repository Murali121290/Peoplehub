"""add clarification_history, remove obsolete columns, and expand manager_status in attendance

Revision ID: 5b9f0c2d8e3f
Revises: 18c479933b1e
Create Date: 2026-07-28 09:52:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b9f0c2d8e3f'
down_revision: Union[str, None] = '18c479933b1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('attendance')]

    if 'clarification_history' not in columns:
        op.add_column('attendance', sa.Column('clarification_history', sa.JSON(), nullable=True))

    if 'rejection_reason' in columns:
        op.drop_column('attendance', 'rejection_reason')

    if 'employee_reply' in columns:
        op.drop_column('attendance', 'employee_reply')

    op.alter_column('attendance', 'manager_status', type_=sa.String(length=100), existing_type=sa.String(length=20))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('attendance')]

    if 'clarification_history' in columns:
        op.drop_column('attendance', 'clarification_history')

    if 'rejection_reason' not in columns:
        op.add_column('attendance', sa.Column('rejection_reason', sa.String(length=255), nullable=True))

    if 'employee_reply' not in columns:
        op.add_column('attendance', sa.Column('employee_reply', sa.String(length=255), nullable=True))

    op.alter_column('attendance', 'manager_status', type_=sa.String(length=20), existing_type=sa.String(length=100))
