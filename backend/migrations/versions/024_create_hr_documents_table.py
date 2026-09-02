"""024_create_hr_documents_table

Creates hr_documents table for storing uploaded corporate policies, handbooks, and templates.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    if "hr_documents" not in inspector.get_table_names():
        op.create_table(
            "hr_documents",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("category", sa.String(100), nullable=True, server_default="Policy"),
            sa.Column("filename", sa.String(255), nullable=False),
            sa.Column("file_path", sa.String(500), nullable=False),
            sa.Column("file_size", sa.String(50), nullable=True),
            sa.Column("uploaded_by", sa.String(100), nullable=True, server_default="HR Department"),
            sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
        )
        print("[024] Created table 'hr_documents'.")
    else:
        print("[024] Table 'hr_documents' already exists — skipping.")

def downgrade():
    op.drop_table("hr_documents")
