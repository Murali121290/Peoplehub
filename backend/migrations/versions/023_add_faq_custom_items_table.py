"""023_add_faq_custom_items_table

Adds faq_custom_items table to store HR-managed FAQ entries.
"""

from alembic import op
import sqlalchemy as sa


revision = "023"
down_revision = "022"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "faq_custom_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("question", sa.String(500), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("category", sa.String(50), nullable=False, server_default="support"),
        sa.Column("created_by", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.text("true")),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("faq_custom_items")
