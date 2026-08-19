"""create payment_details table

Revision ID: 017
Revises: 016
Create Date: 2026-08-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '017'
down_revision: Union[str, None] = '016'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table already exists (for safety)
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    tables = sa_inspector.get_table_names()
    
    if 'payment_details' not in tables:
        op.create_table(
            'payment_details',
            sa.Column('id', sa.Integer(), nullable=False, primary_key=True),
            sa.Column('employee_id', sa.Integer(), sa.ForeignKey('employees.id', ondelete='CASCADE'), nullable=False),
            sa.Column('payroll_period_start', sa.Date(), nullable=False),
            sa.Column('payroll_period_end', sa.Date(), nullable=False),
            sa.Column('payroll_month', sa.Integer(), nullable=False),
            sa.Column('payroll_year', sa.Integer(), nullable=False),
            sa.Column('no_of_days', sa.Integer(), nullable=False),
            sa.Column('days_payable', sa.Integer(), nullable=False),
            
            # Salary structure
            sa.Column('basic', sa.Float(), nullable=False),
            sa.Column('hra', sa.Float(), nullable=False),
            sa.Column('lta', sa.Float(), nullable=False),
            sa.Column('other_allowance', sa.Float(), nullable=False),
            sa.Column('gross_salary', sa.Float(), nullable=False),
            
            # Earned salary
            sa.Column('earned_basic', sa.Float(), nullable=False),
            sa.Column('earned_hra', sa.Float(), nullable=False),
            sa.Column('earned_lta', sa.Float(), nullable=False),
            sa.Column('earned_other_allowance', sa.Float(), nullable=False),
            sa.Column('earned_actual_gross', sa.Float(), nullable=False),
            sa.Column('attendance_bonus', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('odw', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('total', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('internet_charges', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('gross_earned_salary', sa.Float(), nullable=False),
            
            # Deductions
            sa.Column('earned_pf_wages', sa.Float(), nullable=False),
            sa.Column('pf_ded_employee', sa.Float(), nullable=False),
            sa.Column('vpf', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('pf_vpf_ded_employee', sa.Float(), nullable=False),
            sa.Column('esi_ded_employee', sa.Float(), nullable=False),
            sa.Column('salary_advance', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('tds', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('lwf', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('pt', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('other_deduction', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('total_deduction', sa.Float(), nullable=False),
            sa.Column('net_transfer', sa.Float(), nullable=False),
            
            # Employer contributions
            sa.Column('pf_wage', sa.Float(), nullable=False),
            sa.Column('pf', sa.Float(), nullable=False),
            sa.Column('eps_wage', sa.Float(), nullable=False),
            sa.Column('pf_8_33', sa.Float(), nullable=False),
            sa.Column('pf_3_67', sa.Float(), nullable=False),
            sa.Column('pf_0_50_pf_wage', sa.Float(), nullable=False),
            sa.Column('pf_0_50_eps_wage', sa.Float(), nullable=False),
            sa.Column('pf_0_01', sa.Float(), nullable=True, server_default='0.0'),
            sa.Column('esi_ded_employer', sa.Float(), nullable=False),
            
            # CTC & Bonus
            sa.Column('bonus', sa.Float(), nullable=False),
            sa.Column('actual_monthly_ctc', sa.Float(), nullable=False),
            sa.Column('earned_monthly_ctc', sa.Float(), nullable=False),
            
            # Bank Details
            sa.Column('account_number', sa.String(length=50), nullable=True),
            sa.Column('ifsc_code', sa.String(length=20), nullable=True),
            sa.Column('branch_code', sa.String(length=50), nullable=True),
            
            # Payment Status
            sa.Column('payment_status', sa.String(length=20), nullable=False, server_default='Pending'),
            
            # Metadata & Overrides
            sa.Column('overrides', sa.JSON(), nullable=True),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
            sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=True),
            
            sa.UniqueConstraint('employee_id', 'payroll_period_start', 'payroll_period_end', name='uq_employee_payroll_period')
        )


def downgrade() -> None:
    conn = op.get_bind()
    sa_inspector = sa.inspect(conn)
    tables = sa_inspector.get_table_names()
    if 'payment_details' in tables:
        op.drop_table('payment_details')
