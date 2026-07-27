"""add rejection_reason to attendance

Revision ID: 4a8e9b1c7d2e
Revises: 399fee761905
Create Date: 2026-07-27 15:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a8e9b1c7d2e'
down_revision: Union[str, None] = '399fee761905'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('attendance')]
    if 'rejection_reason' not in columns:
        op.add_column('attendance', sa.Column('rejection_reason', sa.String(length=255), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('attendance')]
    if 'rejection_reason' in columns:
        op.drop_column('attendance', 'rejection_reason')
