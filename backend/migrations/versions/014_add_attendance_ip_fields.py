"""add check_in_ip and check_out_ip to attendance table

Revision ID: 014
Revises: 013
Create Date: 2026-08-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '014'
down_revision: Union[str, None] = '013'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('attendance')]

    if 'check_in_ip' not in columns:
        op.add_column('attendance', sa.Column('check_in_ip', sa.String(length=45), nullable=True))

    if 'check_out_ip' not in columns:
        op.add_column('attendance', sa.Column('check_out_ip', sa.String(length=45), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('attendance')]

    if 'check_in_ip' in columns:
        op.drop_column('attendance', 'check_in_ip')

    if 'check_out_ip' in columns:
        op.drop_column('attendance', 'check_out_ip')
