"""026_add_remarks_to_attendance

Adds remarks column to attendance table for edit reasons and manager notes.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "026"
down_revision = "025"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [c["name"] for c in inspector.get_columns("attendance")]
    if "remarks" not in columns:
        op.add_column("attendance", sa.Column("remarks", sa.Text(), nullable=True))
        print("[026] Added column 'remarks' to 'attendance' table.")

def downgrade():
    op.drop_column("attendance", "remarks")
