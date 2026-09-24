"""030_add_archived_to_kpi_evaluations

Adds is_archived and converted_to_id to kpi_evaluations to support Option B
(Soft Archiving daily evaluations into weekly rolled-up entries).
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "030"
down_revision = "029"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "kpi_evaluations" in tables:
        columns = [c["name"] for c in inspector.get_columns("kpi_evaluations")]
        if "is_archived" not in columns:
            op.add_column("kpi_evaluations", sa.Column("is_archived", sa.Boolean(), nullable=True, server_default=sa.text("false")))
            print("[030] Added column 'is_archived' to 'kpi_evaluations'.")
        if "converted_to_id" not in columns:
            op.add_column("kpi_evaluations", sa.Column("converted_to_id", sa.Integer(), nullable=True))
            print("[030] Added column 'converted_to_id' to 'kpi_evaluations'.")

def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "kpi_evaluations" in tables:
        columns = [c["name"] for c in inspector.get_columns("kpi_evaluations")]
        if "converted_to_id" in columns:
            op.drop_column("kpi_evaluations", "converted_to_id")
            print("[030] Dropped column 'converted_to_id' from 'kpi_evaluations'.")
        if "is_archived" in columns:
            op.drop_column("kpi_evaluations", "is_archived")
            print("[030] Dropped column 'is_archived' from 'kpi_evaluations'.")
