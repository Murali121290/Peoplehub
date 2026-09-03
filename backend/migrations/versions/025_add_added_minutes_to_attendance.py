"""025_add_added_minutes_to_attendance

Adds added_minutes column to attendance table for manager minute adjustments.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "025"
down_revision = "024"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [c["name"] for c in inspector.get_columns("attendance")]
    if "added_minutes" not in columns:
        op.add_column("attendance", sa.Column("added_minutes", sa.Integer(), nullable=True, server_default="0"))
        print("[025] Added column 'added_minutes' to 'attendance' table.")

def downgrade():
    op.drop_column("attendance", "added_minutes")
