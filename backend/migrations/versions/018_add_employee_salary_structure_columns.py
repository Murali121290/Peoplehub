"""add employee salary structure columns

Revision ID: 018
Revises: 017
Create Date: 2026-08-18 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '018'
down_revision: Union[str, None] = '017'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table columns already exist (for safety)
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    columns = [c['name'] for c in sa_inspector.get_columns('employees')]
    
    if 'basic' not in columns:
        op.add_column('employees', sa.Column('basic', sa.Float(), nullable=True))
    if 'hra' not in columns:
        op.add_column('employees', sa.Column('hra', sa.Float(), nullable=True))
    if 'lta' not in columns:
        op.add_column('employees', sa.Column('lta', sa.Float(), nullable=True))
    if 'other_allowance' not in columns:
        op.add_column('employees', sa.Column('other_allowance', sa.Float(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    columns = [c['name'] for c in sa_inspector.get_columns('employees')]
    
    if 'basic' in columns:
        op.drop_column('employees', 'basic')
    if 'hra' in columns:
        op.drop_column('employees', 'hra')
    if 'lta' in columns:
        op.drop_column('employees', 'lta')
    if 'other_allowance' in columns:
        op.drop_column('employees', 'other_allowance')
