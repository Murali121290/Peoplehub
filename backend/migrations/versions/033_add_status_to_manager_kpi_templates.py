"""033_add_status_to_manager_kpi_templates

Adds status column to manager_kpi_templates table with default 'draft'.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "033"
down_revision = "032"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "manager_kpi_templates" in tables:
        columns = [c["name"] for c in inspector.get_columns("manager_kpi_templates")]
        if "status" not in columns:
            op.add_column("manager_kpi_templates", sa.Column("status", sa.String(50), nullable=True, server_default="draft"))
            print("[033] Added column 'status' to 'manager_kpi_templates'.")
        else:
            print("[033] Column 'status' already exists in 'manager_kpi_templates'.")

def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "manager_kpi_templates" in tables:
        columns = [c["name"] for c in inspector.get_columns("manager_kpi_templates")]
        if "status" in columns:
            op.drop_column("manager_kpi_templates", "status")
            print("[033] Dropped column 'status' from 'manager_kpi_templates'.")
