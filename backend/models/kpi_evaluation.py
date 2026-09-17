from datetime import datetime
from models.database import db

class KpiEvaluation(db.Model):
    __tablename__ = "kpi_evaluations"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    form = db.Column(db.String(255), nullable=False)
    
    # Team & Department info
    team_id = db.Column(db.String(100), nullable=True)
    team_name = db.Column(db.String(255), nullable=True)

    # Full KPI Performance Metrics JSON Structure
    metrics_data = db.Column(db.JSON, nullable=True)
    
    # Fallback legacy fields (kept for backward compatibility)
    performance_metrics = db.Column(db.String(255), nullable=True, default="Assigned KPI Deliverables")
    description = db.Column(db.Text, nullable=True)
    target_score = db.Column(db.String(50), nullable=True)
    weightage = db.Column(db.String(50), nullable=True)
    target_from_manager = db.Column(db.String(100), nullable=True)
    actual_earned_mark = db.Column(db.String(100), nullable=True)
    earned_score = db.Column(db.String(50), nullable=True)
    
    # Summary Scores & Remarks
    employee_overall_score = db.Column(db.Float, nullable=True, default=0.0)
    employee_remark = db.Column(db.Text, nullable=True)
    manager_actual_pm = db.Column(db.String(100), nullable=True)
    manager_approve_score = db.Column(db.String(50), nullable=True)
    manager_score = db.Column(db.Float, nullable=True)
    manager_remark = db.Column(db.Text, nullable=True)
    service_manager_approve_status = db.Column(db.String(100), nullable=True, default="Pending")
    service_manager_score = db.Column(db.String(50), nullable=True)
    remark = db.Column(db.Text, nullable=True)
    
    # Employee & Manager Info
    employee_id = db.Column(db.String(100), nullable=True)
    employee_name = db.Column(db.String(255), nullable=True)
    reporting_manager = db.Column(db.String(255), nullable=True)
    reporting_manager_id = db.Column(db.String(100), nullable=True)
    manager_id = db.Column(db.String(100), nullable=True)
    service_manager = db.Column(db.String(255), nullable=True)
    service_manager_id = db.Column(db.String(100), nullable=True)
    
    # Frequency & Evaluation Period
    frequency = db.Column(db.String(50), nullable=True, default="quarterly") # 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    from_date = db.Column(db.Date, nullable=True)
    to_date = db.Column(db.Date, nullable=True)
    working_days = db.Column(db.Integer, nullable=True, default=0)
    leave_days = db.Column(db.Integer, nullable=True, default=0)
    holiday_days = db.Column(db.Integer, nullable=True, default=0)

    # Archival & Conversion (Option B: Soft Delete)
    is_archived = db.Column(db.Boolean, nullable=True, default=False)
    converted_to_id = db.Column(db.Integer, nullable=True)

    # Status & Timestamps
    status = db.Column(db.String(50), nullable=True, default="Draft")
    submitted_at = db.Column(db.DateTime, nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "form": self.form,
            "team_id": self.team_id,
            "team_name": self.team_name,
            "metrics_data": self.metrics_data,
            "performance_metrics": self.performance_metrics,
            "description": self.description,
            "target_score": self.target_score,
            "weightage": self.weightage,
            "target_from_manager": self.target_from_manager,
            "actual_earned_mark": self.actual_earned_mark,
            "earned_score": self.earned_score,
            "employee_overall_score": self.employee_overall_score,
            "employee_remark": self.employee_remark,
            "manager_actual_pm": self.manager_actual_pm,
            "manager_approve_score": self.manager_approve_score,
            "manager_score": self.manager_score,
            "manager_remark": self.manager_remark,
            "service_manager_approve_status": self.service_manager_approve_status,
            "service_manager_score": self.service_manager_score,
            "remark": self.remark,
            "employee_id": self.employee_id,
            "employee_name": self.employee_name,
            "reporting_manager": self.reporting_manager or self.manager_id,
            "reporting_manager_id": self.reporting_manager_id or self.manager_id,
            "manager_id": self.manager_id or self.reporting_manager_id,
            "service_manager": self.service_manager or self.service_manager_id,
            "service_manager_id": self.service_manager_id,
            "frequency": self.frequency or "quarterly",
            "from_date": self.from_date.isoformat() if self.from_date else None,
            "to_date": self.to_date.isoformat() if self.to_date else None,
            "working_days": self.working_days or 0,
            "leave_days": self.leave_days or 0,
            "holiday_days": self.holiday_days or 0,
            "status": self.status,
            "is_archived": bool(self.is_archived) if self.is_archived is not None else False,
            "converted_to_id": self.converted_to_id,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
