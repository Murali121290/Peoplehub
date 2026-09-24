"""031_create_manager_kpi_templates_table

Creates manager_kpi_templates table for storing custom manager deliverables and targets
supporting multi-team / multi-form presets (Form 1, Form 2, Form 3, Form 4) in PostgreSQL.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "031"
down_revision = "030"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "manager_kpi_templates" not in tables:
        op.create_table(
            "manager_kpi_templates",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("manager_id", sa.String(100), nullable=False),
            sa.Column("manager_name", sa.String(255), nullable=True),
            sa.Column("template_key", sa.String(50), nullable=False, server_default="form_1"),
            sa.Column("template_name", sa.String(255), nullable=False, server_default="Form 1"),
            sa.Column("team_id", sa.String(100), nullable=True),
            sa.Column("team_name", sa.String(255), nullable=True),
            sa.Column("categories", sa.JSON(), nullable=True),
            sa.Column("is_default", sa.Boolean(), nullable=True, server_default=sa.text("false")),
            sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("manager_id", "template_key", name="uq_manager_template")
        )
        op.create_index("idx_mgr_template_mgr_id", "manager_kpi_templates", ["manager_id"])
        op.create_index("idx_mgr_template_key", "manager_kpi_templates", ["template_key"])
        print("[031] Created table 'manager_kpi_templates'.")
    else:
        # If table was already created by create_all, ensure columns, constraint, and indexes exist
        columns = [c["name"] for c in inspector.get_columns("manager_kpi_templates")]
        if "template_key" not in columns:
            op.add_column("manager_kpi_templates", sa.Column("template_key", sa.String(50), nullable=False, server_default="form_1"))
        if "template_name" not in columns:
            op.add_column("manager_kpi_templates", sa.Column("template_name", sa.String(255), nullable=False, server_default="Form 1"))
        if "categories" not in columns:
            op.add_column("manager_kpi_templates", sa.Column("categories", sa.JSON(), nullable=True))
        if "is_default" not in columns:
            op.add_column("manager_kpi_templates", sa.Column("is_default", sa.Boolean(), nullable=True, server_default=sa.text("false")))

        existing_indexes = [idx["name"] for idx in inspector.get_indexes("manager_kpi_templates")]
        if "idx_mgr_template_mgr_id" not in existing_indexes and "ix_manager_kpi_templates_manager_id" not in existing_indexes:
            op.create_index("idx_mgr_template_mgr_id", "manager_kpi_templates", ["manager_id"])
        if "idx_mgr_template_key" not in existing_indexes and "ix_manager_kpi_templates_template_key" not in existing_indexes:
            op.create_index("idx_mgr_template_key", "manager_kpi_templates", ["template_key"])

        print("[031] Table 'manager_kpi_templates' verified/updated.")

def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "manager_kpi_templates" in tables:
        op.drop_table("manager_kpi_templates")
        print("[031] Dropped table 'manager_kpi_templates'.")
