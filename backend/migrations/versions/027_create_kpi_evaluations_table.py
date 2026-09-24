"""027_create_kpi_evaluations_table

Creates kpi_evaluations table for storing performance evaluation forms, metrics, targets, earned scores, reporting manager reviews, service manager approvals, and timestamps.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "027"
down_revision = "026"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    
    if "kpi_evaluations" not in tables:
        op.create_table(
            "kpi_evaluations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("form", sa.String(255), nullable=False),
            sa.Column("performance_metrics", sa.String(255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("target_score", sa.String(50), nullable=True),
            sa.Column("weightage", sa.String(50), nullable=True),
            sa.Column("target_from_manager", sa.String(100), nullable=True),
            sa.Column("actual_earned_mark", sa.String(100), nullable=True),
            sa.Column("earned_score", sa.String(50), nullable=True),
            sa.Column("employee_remark", sa.Text(), nullable=True),
            sa.Column("manager_actual_pm", sa.String(100), nullable=True),
            sa.Column("manager_approve_score", sa.String(50), nullable=True),
            sa.Column("manager_remark", sa.Text(), nullable=True),
            sa.Column("service_manager_approve_status", sa.String(100), nullable=True, server_default="Pending"),
            sa.Column("service_manager_score", sa.String(50), nullable=True),
            sa.Column("remark", sa.Text(), nullable=True),
            sa.Column("employee_id", sa.String(100), nullable=True),
            sa.Column("employee_name", sa.String(255), nullable=True),
            sa.Column("reporting_manager", sa.String(255), nullable=True),
            sa.Column("reporting_manager_id", sa.String(100), nullable=True),
            sa.Column("manager_id", sa.String(100), nullable=True),
            sa.Column("service_manager", sa.String(255), nullable=True),
            sa.Column("service_manager_id", sa.String(100), nullable=True),
            sa.Column("status", sa.String(50), nullable=True, server_default="Draft"),
            sa.Column("submitted_at", sa.DateTime(), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(), nullable=True),
            sa.Column("approved_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
        )
        print("[027] Created table 'kpi_evaluations'.")
    else:
        # If table already exists, ensure all columns exist
        columns = [c["name"] for c in inspector.get_columns("kpi_evaluations")]
        new_cols = [
            ("reporting_manager", sa.String(255)),
            ("reporting_manager_id", sa.String(100)),
            ("manager_id", sa.String(100)),
            ("service_manager", sa.String(255)),
            ("service_manager_id", sa.String(100)),
            ("submitted_at", sa.DateTime()),
            ("reviewed_at", sa.DateTime()),
            ("approved_at", sa.DateTime()),
            ("created_at", sa.DateTime()),
            ("updated_at", sa.DateTime())
        ]
        for col_name, col_type in new_cols:
            if col_name not in columns:
                op.add_column("kpi_evaluations", sa.Column(col_name, col_type, nullable=True))
                print(f"[027] Added column '{col_name}' to 'kpi_evaluations'.")

def downgrade():
    op.drop_table("kpi_evaluations")
