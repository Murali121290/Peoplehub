"""add work_mode and shift_request work_mode columns

Revision ID: fd6878f9f344
Revises: 5b9f0c2d8e3f
Create Date: 2026-07-30 14:42:29.654515

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fd6878f9f344'
down_revision: Union[str, None] = '5b9f0c2d8e3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Work Mode & Shift Request Work Mode Columns
    op.execute("ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_mode VARCHAR(50)")
    op.execute("ALTER TABLE shift_requests ADD COLUMN IF NOT EXISTS current_work_mode VARCHAR(50)")
    op.execute("ALTER TABLE shift_requests ADD COLUMN IF NOT EXISTS requested_work_mode VARCHAR(50)")
    op.execute("ALTER TABLE shift_requests ALTER COLUMN current_shift DROP NOT NULL")
    op.execute("ALTER TABLE shift_requests ALTER COLUMN requested_shift DROP NOT NULL")
    op.execute("ALTER TABLE attendance DROP COLUMN IF EXISTS tea_count")

    # Telecom Directory Legacy Columns
    op.execute(
        "ALTER TABLE telecom_directory "
        "ADD COLUMN IF NOT EXISTS designation VARCHAR(150), "
        "ADD COLUMN IF NOT EXISTS location VARCHAR(100)"
    )
    # Users Legacy Columns
    op.execute(
        "ALTER TABLE users "
        "ADD COLUMN IF NOT EXISTS seen_announcement_ids JSONB DEFAULT '[]'::jsonb"
    )
    # Leave Requests Legacy Columns
    op.execute(
        "ALTER TABLE leave_requests "
        "ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200), "
        "ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP, "
        "ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(200), "
        "ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP, "
        "ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(200), "
        "ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP, "
        "ADD COLUMN IF NOT EXISTS cancellation_reason TEXT"
    )
    # Shift Requests Legacy Columns
    op.execute(
        "ALTER TABLE shift_requests "
        "ADD COLUMN IF NOT EXISTS approved_by VARCHAR(200), "
        "ADD COLUMN IF NOT EXISTS rejected_by VARCHAR(200)"
    )
    # Attendance Legacy Columns
    op.execute(
        "ALTER TABLE attendance "
        "ADD COLUMN IF NOT EXISTS total_gap_minutes INTEGER DEFAULT 0, "
        "ADD COLUMN IF NOT EXISTS card_check_in TIMESTAMP, "
        "ADD COLUMN IF NOT EXISTS card_check_out TIMESTAMP, "
        "ADD COLUMN IF NOT EXISTS card_working_hours DOUBLE PRECISION DEFAULT 0.0, "
        "ADD COLUMN IF NOT EXISTS tea_count INTEGER DEFAULT 0, "
        "ADD COLUMN IF NOT EXISTS is_regularization BOOLEAN DEFAULT FALSE, "
        "ADD COLUMN IF NOT EXISTS regularization_reason TEXT, "
        "ADD COLUMN IF NOT EXISTS regularization_submitted_at TIMESTAMP, "
        "ADD COLUMN IF NOT EXISTS is_lop BOOLEAN DEFAULT FALSE, "
        "ADD COLUMN IF NOT EXISTS leave_type VARCHAR(100)"
    )


def downgrade() -> None:
    pass
