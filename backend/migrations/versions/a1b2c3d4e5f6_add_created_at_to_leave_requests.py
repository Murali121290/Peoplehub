"""add created_at to leave_requests

Revision ID: a1b2c3d4e5f6
Revises: 9e8a765e4321
Create Date: 2026-07-31 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9e8a765e4321'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add created_at column as nullable first
    op.add_column('leave_requests', sa.Column('created_at', sa.DateTime(), nullable=True))
    
    # Update existing records to default to UTC timezone now()
    op.execute("UPDATE leave_requests SET created_at = timezone('utc', now()) WHERE created_at IS NULL")
    
    # Alter column to be NOT NULL and default to timezone('utc', now())
    op.alter_column('leave_requests', 'created_at',
               existing_type=sa.DateTime(),
               nullable=False,
               server_default=sa.text("timezone('utc', now())"))


def downgrade() -> None:
    op.drop_column('leave_requests', 'created_at')
