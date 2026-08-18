"""add supportive_document to shift_requests

Revision ID: 019
Revises: 018
Create Date: 2026-08-18 13:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '019'
down_revision: Union[str, None] = '018'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add supportive_document column to shift_requests if it doesn't exist
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    columns = [c['name'] for c in sa_inspector.get_columns('shift_requests')]

    if 'supportive_document' not in columns:
        op.add_column(
            'shift_requests',
            sa.Column('supportive_document', sa.Text(), nullable=True)
        )
        print("[019] Added column 'supportive_document' to shift_requests.")
    else:
        print("[019] Column 'supportive_document' already exists in shift_requests — skipping.")


def downgrade() -> None:
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    columns = [c['name'] for c in sa_inspector.get_columns('shift_requests')]

    if 'supportive_document' in columns:
        op.drop_column('shift_requests', 'supportive_document')
        print("[019] Dropped column 'supportive_document' from shift_requests.")
