from utils.compat import Blueprint, request, jsonify, current_app, Response
from models.database import db
from models.leave import LeaveRequest
from models.shift_request import ShiftRequest
from models.employee import Employee
from models.notification import Notification
from extensions import socketio
from datetime import datetime
from services.request_email_service import (
    verify_request_token,
    send_employee_status_email
)

requests_bp = Blueprint("requests", __name__)

from services.response_templates import make_html_response, make_rejection_form

def serialize_leave(leave):
    return {
        "id": leave.id,
        "employee_id": leave.employee_id,
        "employee_name": leave.employee_name,
        "leave_type": leave.leave_type,
        "from_date": str(leave.from_date) if leave.from_date else None,
        "to_date": str(leave.to_date) if leave.to_date else None,
        "total_days": leave.total_days,
        "reporting_manager": leave.reporting_manager,
        "handover_to": leave.handover_to,
        "emergency_contact": leave.emergency_contact,
        "reason": leave.reason,
        "status": leave.status,
        "request_type": leave.request_type,
        "permission_date": str(leave.permission_date) if leave.permission_date else None,
        "from_time": str(leave.from_time) if leave.from_time else None,
        "to_time": str(leave.to_time) if leave.to_time else None,
        "approved_by": leave.approved_by,
        "approved_at": leave.approved_at.isoformat() if leave.approved_at else None,
        "rejected_by": leave.rejected_by,
        "rejected_at": leave.rejected_at.isoformat() if leave.rejected_at else None,
        "manager_comment": leave.manager_comment,
    }

@requests_bp.route("/email-action", methods=["GET", "POST"])
def email_action():
    token = request.args.get("token") or request.form.get("token")
    if not token:
        return make_html_response("Invalid Request", "Authorization token is missing.", False), 400
        
    data = verify_request_token(token)
    if not data:
        return make_html_response("Link Expired or Invalid", "This action link is invalid or has expired.", False), 400
        
    req_id = data.get("req_id")
    req_type = data.get("req_type")
    action = data.get("action")
    
    manager_email = data.get("manager_email") or "selvabharath@s4carlisle.com"
    
    if req_type in ("Leave", "Permission"):
        req = LeaveRequest.query.get(req_id)
        if not req:
            return make_html_response("Request Not Found", "The requested leave or permission record could not be found in the database.", False), 404
            
        if req.status != "Pending":
            return make_html_response("Already Processed", "This request has already been processed.", False), 200
            
        # Strictly check against the custom employee_id field (string)
        employee = Employee.query.filter_by(employee_id=str(req.employee_id)).first()
        
        if not employee:
            return make_html_response("Employee Not Found", "The employee record associated with this request could not be found.", False), 404
            
        if action == "approve":
            req.status = "Approved"
            req.approved_by = manager_email
            req.approved_at = datetime.utcnow()
            
            # Apply Leave / Permission Specific Balances Deductions
            if req_type == "Leave":
                leave_type = (req.leave_type or "").strip().lower()
                leave_days = req.total_days or 0
                
                if leave_type == "sick leave":
                    employee.sick_leave = max(0, (employee.sick_leave or 0) - leave_days)
                elif leave_type == "casual leave":
                    employee.casual_leave = max(0, (employee.casual_leave or 0) - leave_days)
                elif leave_type in ["earned leave", "privilege leave"]:
                    employee.privilege_leave = max(0, (employee.privilege_leave or 0) - leave_days)
            elif req_type == "Permission":
                from models.leave import EmployeeLeaveBalance
                from routes.leaves import get_permission_cycle_range
                from sqlalchemy import func
                from datetime import timedelta

                cycle_start, cycle_end = get_permission_cycle_range(req.permission_date)
                emp_ids = [str(employee.employee_id)]
                if employee.id:
                    emp_ids.append(str(employee.id))

                other_approved = LeaveRequest.query.filter(
                    LeaveRequest.employee_id.in_(emp_ids),
                    LeaveRequest.request_type == "Permission",
                    LeaveRequest.permission_date >= cycle_start,
                    LeaveRequest.permission_date <= cycle_end,
                    LeaveRequest.status == "Approved",
                    LeaveRequest.id != req.id
                ).all()

                already_approved_hours = 0.0
                for o in other_approved:
                    if o.from_time and o.to_time:
                        o_from = datetime.combine(o.permission_date, o.from_time)
                        o_to = datetime.combine(o.permission_date, o.to_time)
                        if o_to < o_from:
                            o_to += timedelta(days=1)
                        already_approved_hours += (o_to - o_from).total_seconds() / 3600.0

                this_perm_hours = 0.0
                if req.from_time and req.to_time:
                    dt_from = datetime.combine(req.permission_date, req.from_time)
                    dt_to = datetime.combine(req.permission_date, req.to_time)
                    if dt_to < dt_from:
                        dt_to += timedelta(days=1)
                    this_perm_hours = (dt_to - dt_from).total_seconds() / 3600.0

                perm_bal = EmployeeLeaveBalance.query.filter(
                    EmployeeLeaveBalance.employee_id == employee.id,
                    func.lower(EmployeeLeaveBalance.leave_type) == "permission"
                ).first()
                if perm_bal:
                    perm_bal.available = max(0.0, 2.0 - (already_approved_hours + this_perm_hours))

            # Recalculate attendance status if attendance record exists for this date
            from models.attendance import Attendance
            from routes.attendance import calculate_attendance_status

            target_dates = []
            if req_type == "Permission" and req.permission_date:
                target_dates = [req.permission_date]
            elif req_type == "Leave" and req.from_date and req.to_date:
                curr = req.from_date
                from datetime import timedelta
                while curr <= req.to_date:
                    target_dates.append(curr)
                    curr += timedelta(days=1)

            # Commit request and balance changes first so attendance calculation sees the approved request
            db.session.commit()

            for t_date in target_dates:
                att = Attendance.query.filter_by(
                    user_id=employee.user_id,
                    attendance_date=t_date
                ).first()
                if att:
                    calculate_attendance_status(att)

            db.session.commit()
                    
            # Save Notification for employee
            notification = Notification(
                receiver_name=f"{employee.first_name} {employee.last_name}",
                title=f"✅ {req_type} Approved",
                message=f"Your {req_type} request has been approved by your reporting head.",
                related_id=employee.id,
                related_type="leave_approved",
                notification_type="status_update",
                status="Completed",
                action_required=False,
                resolved=True,
                resolved_at=datetime.utcnow()
            )
            db.session.add(notification)
            db.session.commit()
            
            # Send Notification Email to Employee
            send_employee_status_email(req, employee, "Approved", req_type)
            
            # Emit socket update to frontend
            try:
                socketio.emit("leave_update", serialize_leave(req))
            except Exception as socket_err:
                print("Failed to emit leave update socket:", str(socket_err))
                
            return make_html_response("Request Approved", f"{req_type} request has been successfully approved.", True)
            
        elif action == "reject":
            if request.method == "GET":
                return make_rejection_form("Reject Request", token)
                
            reason = request.form.get("reason")
            req.status = "Rejected"
            req.rejected_by = manager_email
            req.rejected_at = datetime.utcnow()
            req.manager_comment = reason
            
            # Save Notification for employee
            notification = Notification(
                receiver_name=f"{employee.first_name} {employee.last_name}",
                title=f"❌ {req_type} Rejected",
                message=f"Your {req_type} request has been rejected by your reporting head.",
                related_id=employee.id,
                related_type="leave_rejected",
                notification_type="status_update",
                status="Completed",
                action_required=False,
                resolved=True,
                resolved_at=datetime.utcnow()
            )
            db.session.add(notification)
            db.session.commit()
            
            # Send Notification Email to Employee
            send_employee_status_email(req, employee, "Rejected", req_type)
            
            # Emit socket update to frontend
            try:
                socketio.emit("leave_update", serialize_leave(req))
            except Exception as socket_err:
                print("Failed to emit leave update socket:", str(socket_err))
                
            return make_html_response("Request Rejected", f"{req_type} request has been rejected.", True)
            
    elif req_type in ("Shift", "WFH", "Office"):
        req = ShiftRequest.query.get(req_id)
        if not req:
            return make_html_response("Request Not Found", "The requested shift/WFH record could not be found.", False), 404
            
        if req.status != "Pending":
            return make_html_response("Already Processed", "This request has already been processed.", False), 200
            
        # Strictly check against the custom employee_id field (string)
        employee = Employee.query.filter_by(employee_id=str(req.employee_id)).first()
        
        resolved_user_id = employee.user_id if employee else None
        if not employee:
            return make_html_response("Employee Not Found", "The employee record associated with this request could not be found.", False), 404
            
        if action == "approve":
            req.status = "Approved"
            req.approved_by = manager_email
            req.approved_at = datetime.utcnow()
            
            # Shift Specific Attendance updates
            from datetime import timedelta
            from models.attendance import Attendance
            start_date = req.from_date or req.shift_date
            end_date = req.to_date or start_date
            
            if start_date:
                current_date = start_date
                while current_date <= end_date:
                    attendance = Attendance.query.filter_by(
                        user_id=resolved_user_id,
                        attendance_date=current_date
                    ).first()
                    
                    if attendance and attendance.check_in is not None:
                        attendance.shift_timing = req.requested_shift
                        
                    current_date += timedelta(days=1)
                    
            # Delete manager alerts for "New Shift Request"
            try:
                Notification.query.filter(
                    Notification.title == "New Shift Request",
                    Notification.message.like(f"%{req.employee_name} submitted a shift request.%")
                ).delete(synchronize_session=False)
            except Exception as delete_err:
                print("Failed to delete new shift request notification:", str(delete_err))
                
            # Create employee alert notification
            notification = Notification(
                receiver_name=req.employee_name,
                title=f"✅ {req_type} Request Approved",
                message=f"Your {req_type} request has been approved by your reporting head.",
                related_id=employee.id,
                related_type="shift_approved",
                notification_type="status_update",
                status="Completed",
                action_required=False,
                resolved=True,
                resolved_at=datetime.utcnow()
            )
            db.session.add(notification)
            db.session.commit()
            
            # Send Notification Email to Employee
            send_employee_status_email(req, employee, "Approved", req_type)
            
            # Emit socket update to frontend
            try:
                socketio.emit("shift_update", req.to_dict())
            except Exception as socket_err:
                print("Failed to emit shift update socket:", str(socket_err))
                
            return make_html_response("Request Approved", f"{req_type} request has been successfully approved.", True)
            
        elif action == "reject":
            if request.method == "GET":
                return make_rejection_form("Reject Request", token)
                
            reason = request.form.get("reason")
            req.status = "Rejected"
            req.rejected_by = manager_email
            req.rejected_at = datetime.utcnow()
            req.manager_comment = reason
            
            # Delete manager alerts for "New Shift Request"
            try:
                Notification.query.filter(
                    Notification.title == "New Shift Request",
                    Notification.message.like(f"%{req.employee_name} submitted a shift request.%")
                ).delete(synchronize_session=False)
            except Exception as delete_err:
                print("Failed to delete new shift request notification:", str(delete_err))
                
            # Create employee alert notification
            notification = Notification(
                receiver_name=req.employee_name,
                title=f"❌ {req_type} Request Rejected",
                message=f"Your {req_type} request has been rejected by your reporting head.",
                related_id=employee.id,
                related_type="shift_rejected",
                notification_type="status_update",
                status="Completed",
                action_required=False,
                resolved=True,
                resolved_at=datetime.utcnow()
            )
            db.session.add(notification)
            db.session.commit()
            
            # Send Notification Email to Employee
            send_employee_status_email(req, employee, "Rejected", req_type)
            
            # Emit socket update to frontend
            try:
                socketio.emit("shift_update", req.to_dict())
            except Exception as socket_err:
                print("Failed to emit shift update socket:", str(socket_err))
                
            return make_html_response("Request Rejected", f"{req_type} request has been rejected.", True)
            
    return make_html_response("Invalid Request Type", "The request type is not supported.", False), 400
