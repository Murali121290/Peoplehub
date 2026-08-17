"""add regularization fields to attendance table

Revision ID: 016
Revises: 015
Create Date: 2026-08-14 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '016'
down_revision: Union[str, None] = '015'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    columns = [col['name'] for col in sa_inspector.get_columns('attendance')]

    if 'regularization_check_in' not in columns:
        op.add_column('attendance', sa.Column('regularization_check_in', sa.DateTime(), nullable=True))

    if 'regularization_check_out' not in columns:
        op.add_column('attendance', sa.Column('regularization_check_out', sa.DateTime(), nullable=True))

    if 'regularization_total_hours' not in columns:
        op.add_column('attendance', sa.Column('regularization_total_hours', sa.Float(), nullable=True, server_default='0.0'))


def downgrade() -> None:
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    columns = [col['name'] for col in sa_inspector.get_columns('attendance')]

    if 'regularization_check_in' in columns:
        op.drop_column('attendance', 'regularization_check_in')

    if 'regularization_check_out' in columns:
        op.drop_column('attendance', 'regularization_check_out')

    if 'regularization_total_hours' in columns:
        op.drop_column('attendance', 'regularization_total_hours')
