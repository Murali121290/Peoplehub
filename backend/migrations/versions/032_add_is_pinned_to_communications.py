"""032_add_is_pinned_to_communications

Adds is_pinned column to communications table.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "032"
down_revision = "031"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "communications" in tables:
        columns = [c["name"] for c in inspector.get_columns("communications")]
        if "is_pinned" not in columns:
            op.add_column("communications", sa.Column("is_pinned", sa.Boolean(), nullable=True, server_default=sa.text("false")))
            print("[032] Added column 'is_pinned' to 'communications'.")
        else:
            print("[032] Column 'is_pinned' already exists in 'communications'.")

def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "communications" in tables:
        columns = [c["name"] for c in inspector.get_columns("communications")]
        if "is_pinned" in columns:
            op.drop_column("communications", "is_pinned")
            print("[032] Dropped column 'is_pinned' from 'communications'.")
