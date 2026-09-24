"""028_convert_kpi_evaluations_to_json_metrics

Updates kpi_evaluations table to store metrics_data as JSON per employee row,
along with team_id, team_name, employee_overall_score, and manager_score.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "028"
down_revision = "027"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    
    if "kpi_evaluations" in tables:
        columns = [c["name"] for c in inspector.get_columns("kpi_evaluations")]
        new_cols = [
            ("metrics_data", sa.JSON()),
            ("team_id", sa.String(100)),
            ("team_name", sa.String(255)),
            ("employee_overall_score", sa.Float()),
            ("manager_score", sa.Float()),
        ]
        for col_name, col_type in new_cols:
            if col_name not in columns:
                op.add_column("kpi_evaluations", sa.Column(col_name, col_type, nullable=True))
                print(f"[028] Added column '{col_name}' to 'kpi_evaluations'.")
        
        # Make performance_metrics nullable if it exists and was not nullable
        try:
            op.alter_column("kpi_evaluations", "performance_metrics", nullable=True)
        except Exception as e:
            print(f"[028] Alter column performance_metrics notice: {e}")

def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()
    if "kpi_evaluations" in tables:
        columns = [c["name"] for c in inspector.get_columns("kpi_evaluations")]
        for col_name in ["metrics_data", "team_id", "team_name", "employee_overall_score", "manager_score"]:
            if col_name in columns:
                op.drop_column("kpi_evaluations", col_name)
