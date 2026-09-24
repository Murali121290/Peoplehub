"""029_add_frequency_and_dates_to_kpi_evaluations

Adds frequency, from_date, to_date, working_days, leave_days, and holiday_days
to kpi_evaluations to support Daily, Weekly, Monthly, and Quarterly evaluations
with automatic rolling aggregation and lean cleanup.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "029"
down_revision = "028"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "kpi_evaluations" in tables:
        columns = [c["name"] for c in inspector.get_columns("kpi_evaluations")]
        new_cols = [
            ("frequency", sa.String(50), sa.text("'quarterly'")),
            ("from_date", sa.Date(), None),
            ("to_date", sa.Date(), None),
            ("working_days", sa.Integer(), sa.text("0")),
            ("leave_days", sa.Integer(), sa.text("0")),
            ("holiday_days", sa.Integer(), sa.text("0")),
        ]
        for col_name, col_type, default_val in new_cols:
            if col_name not in columns:
                if default_val is not None:
                    op.add_column("kpi_evaluations", sa.Column(col_name, col_type, nullable=True, server_default=default_val))
                else:
                    op.add_column("kpi_evaluations", sa.Column(col_name, col_type, nullable=True))
                print(f"[029] Added column '{col_name}' to 'kpi_evaluations'.")

def downgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    tables = inspector.get_table_names()

    if "kpi_evaluations" in tables:
        columns = [c["name"] for c in inspector.get_columns("kpi_evaluations")]
        for col_name in ["frequency", "from_date", "to_date", "working_days", "leave_days", "holiday_days"]:
            if col_name in columns:
                op.drop_column("kpi_evaluations", col_name)
                print(f"[029] Dropped column '{col_name}' from 'kpi_evaluations'.")
