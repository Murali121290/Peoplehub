from utils.compat import Blueprint, request, jsonify
from utils.jwt_helper import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
from sqlalchemy import or_

from werkzeug.security import check_password_hash
from werkzeug.security import generate_password_hash

from models.employee import Employee
from models.user import User
from models.database import db
from datetime import datetime

auth_bp = Blueprint('auth', __name__)

import os
import ipaddress

def is_mobile_device(user_agent):
    if not user_agent:
        return False
    ua = user_agent.lower()
    mobile_keywords = ["mobi", "android", "iphone", "ipad", "ipod", "blackberry", "iemobile", "opera mini", "webos"]
    return any(keyword in ua for keyword in mobile_keywords)

def is_local_ip(ip_str):
    if not ip_str:
        return False
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private or ip.is_loopback
    except ValueError:
        clean_ip = ip_str.lower()
        if clean_ip in ("localhost", "::1"):
            return True
        for prefix in ("192.168.", "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.2", "172.30.", "172.31."):
            if clean_ip.startswith(prefix):
                return True
        return False

def check_ip_allowed(ip_str):
    if not ip_str:
        return False
    if is_local_ip(ip_str):
        return True
    allowed_ips_env = os.environ.get("ALLOWED_LOCAL_IPS", "")
    if allowed_ips_env:
        allowed_list = [ip.strip() for ip in allowed_ips_env.split(",") if ip.strip()]
        for allowed in allowed_list:
            if "/" in allowed:
                try:
                    if ipaddress.ip_address(ip_str) in ipaddress.ip_network(allowed, strict=False):
                        return True
                except ValueError:
                    pass
            else:
                if ip_str == allowed:
                    return True
    return False

def get_client_ip():
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip.strip()
    from utils.compat import _request_var
    req = _request_var.get()
    if req and req.client:
        return req.client.host
    return None




# =========================
# LOGIN
# =========================

@auth_bp.route("/login", methods=["POST"])
def login():

    try:

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "error": "Request body is missing"
            }), 400

        login_id = data.get("email")
        password = data.get("password")

        if not login_id or not password:
            return jsonify({
                "success": False,
                "error": "Username and Password are required"
            }), 400


        # Find user strictly by company email or employee ID
        user = User.query.filter(User.company_email == login_id).first()
        
        if not user:
            employee = Employee.query.filter(Employee.employee_id == login_id).first()
            if employee:
                user = User.query.filter(User.id == employee.user_id).first()


        if not user:
            return jsonify({
                "success": False,
                "error": "Invalid Email or Password"
            }), 401

        # Verify password
        if not user.check_password(password):
            return jsonify({
                "success": False,
                "error": "Invalid Email or Password"
            }), 401

        # Check for default password to force change
        if password == "Welcome_PeopleHub":
            return jsonify({
                "success": True,
                "require_password_change": True,
                "user_id": user.id,
                "message": "Please change your default password to continue."
            }), 200

        # Check active
        if not user.is_active:
            return jsonify({
                "success": False,
                "error": "Account is Deactivated"
            }), 403

        # Employee record
        employee = Employee.query.filter_by(
            user_id=user.id
        ).first()

        # SHIFT-BASED DEVICE & IP RESTRICTION VALIDATION
        role_name = (user.role.name or "").lower() if user.role else ""
        access_level = (user.access_level or "").lower()
        is_excluded = (
            role_name in ("admin", "manager") or
            access_level in ("admin", "manager", "team_lead", "team lead", "service_manager", "service manager", "lead") or
            "manager" in access_level or "lead" in access_level or
            "manager" in role_name or "lead" in role_name
        )

        if employee:
            from zoneinfo import ZoneInfo
            from models.shift_request import ShiftRequest
            
            # Determine today's date in Asia/Kolkata
            tz = ZoneInfo("Asia/Kolkata")
            today_date = datetime.now(tz).date()

            # Check if there is an approved shift request for today
            search_emp_ids = [employee.id]
            if employee.employee_id:
                try:
                    search_emp_ids.append(int(employee.employee_id))
                except (ValueError, TypeError):
                    pass

            approved_request = ShiftRequest.query.filter(
                ShiftRequest.employee_id.in_(search_emp_ids),
                ShiftRequest.status == "Approved",
                ShiftRequest.from_date <= today_date,
                ShiftRequest.to_date >= today_date
            ).first()

            is_wfh = False
            is_general_shift = False

            if approved_request:
                req_type = (approved_request.request_type or "").strip().upper()
                shift_name = (approved_request.requested_shift or "").strip().lower()
                if approved_request.requested_work_mode == "WFH" or req_type == "WFH":
                    is_wfh = True
                if "general shift" in shift_name or "genetral shift" in shift_name:
                    is_general_shift = True
            else:
                is_wfh = (employee.work_mode == "WFH")
                shift_name = (employee.shift_timing or "").strip().lower()
                if "general shift" in shift_name or "general shift" in shift_name or not shift_name:
                    is_general_shift = True

            # Enforce machine (desktop/laptop only, not mobile) for General Shift or WFH
            # Note: No role exclusions (even admin/manager) can bypass the mobile restriction
            if is_general_shift or is_wfh:
                user_agent = request.headers.get("User-Agent", "")
                if is_mobile_device(user_agent):
                    return jsonify({
                        "success": False,
                        "error": "Login restricted to desktop/laptop devices only."
                    }), 403

            # Enforce local IP check for General Shift
            # Exclude managers and admins from IP check
            if is_general_shift and not is_excluded:
                client_ip = get_client_ip()
                if not check_ip_allowed(client_ip):
                    return jsonify({
                        "success": False,
                        "error": f"Login is restricted to the local office network only (Your IP: {client_ip})."
                    }), 403


        # Update login time (IST, matching checkin_monitor.py)
        from zoneinfo import ZoneInfo
        user.last_login = datetime.now(ZoneInfo("Asia/Kolkata"))
        db.session.commit()

        # JWT Tokens
        access_token = create_access_token(
            identity=str(user.id)
        )

        refresh_token = create_refresh_token(
            identity=str(user.id)
        )

        return jsonify({

            "success": True,

            "message": "Login Successful",

            "access_token": access_token,
            "refresh_token": refresh_token,

            "user_id": user.id,

            "employee_id": (
                employee.id
                if employee
                else None
            ),

            "role": (
                user.role.name
                if user.role
                else None
            ),

            "profile_completed": (
                employee.profile_completed
                if employee
                else False
            ),

            "is_first_login": (
                employee.is_first_login
                if employee
                else True
            ),

            "user": user.to_dict(),

            "shift_timing": (
                employee.shift_timing
                if employee
                else None
            ),

        }), 200

    except Exception as e:

        print("LOGIN ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================
# CURRENT USER
# =========================
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():

    try:
        user_id = get_jwt_identity()

        user = User.query.get(int(user_id))

        if not user:
            return jsonify({
                'error': 'User not found'
            }), 404

        return jsonify({
            'user': user.to_dict(),
            'role': user.role.name if user.role else None,
            'team': user.team.name if user.team else None
        }), 200

    except Exception as e:

        print("ME ERROR:", str(e))

        return jsonify({
            'error': str(e)
        }), 500


# =========================
# LOGOUT
# =========================
@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():

    return jsonify({
        'message': 'Logged out successfully'
    }), 200


@auth_bp.route("/change-password", methods=["POST"])
def change_password():

    try:

        data = request.json

        user = User.query.get(
            data["user_id"]
        )

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        if not user.check_password(
            data["current_password"]
        ):
            return jsonify({
                "success": False,
                "message": "Current password incorrect"
            }), 400

        user.password_hash = generate_password_hash(
            data["new_password"]
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Password updated successfully"
        })

    except Exception as e:

        db.session.rollback()

        print("CHANGE PASSWORD ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@auth_bp.route("/forgot-password/request-otp", methods=["POST"])
def request_otp():
    try:
        from models.otp import OTPToken
        from services.request_email_service import send_email_via_smtp
        from services.email_templates import get_otp_email_html
        import random
        from datetime import timedelta
        
        data = request.json
        email = data.get("email")

        if not email:
            return jsonify({
                "success": False,
                "message": "Email is required"
            }), 400

        user = User.query.filter(User.company_email == email).first()
        if not user:
            return jsonify({
                "success": False,
                "message": "No account found with this email"
            }), 404

        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        
        # Save to DB
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        otp_token = OTPToken(email=email, otp_code=otp_code, expires_at=expires_at)
        db.session.add(otp_token)
        db.session.commit()

        # Send email
        html_content = get_otp_email_html(otp_code)
        send_email_via_smtp(email, "Password Reset OTP", html_content)

        return jsonify({
            "success": True,
            "message": "OTP sent to your email"
        })

    except Exception as e:
        db.session.rollback()
        print("REQUEST OTP ERROR:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@auth_bp.route("/forgot-password/reset-with-otp", methods=["POST"])
def reset_with_otp():
    try:
        from models.otp import OTPToken
        
        data = request.json
        email = data.get("email")
        otp_code = data.get("otp")
        new_password = data.get("new_password")

        if not email or not otp_code or not new_password:
            return jsonify({
                "success": False,
                "message": "Email, OTP, and new password are required"
            }), 400

        # Validate OTP
        token = OTPToken.query.filter_by(email=email, otp_code=otp_code).order_by(OTPToken.created_at.desc()).first()
        
        if not token:
            return jsonify({
                "success": False,
                "message": "Invalid OTP"
            }), 400
            
        if token.expires_at < datetime.utcnow():
            return jsonify({
                "success": False,
                "message": "OTP has expired"
            }), 400

        # Find user
        user = User.query.filter(User.company_email == email).first()
        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # Update password
        user.password_hash = generate_password_hash(new_password)
        
        # Delete used OTP
        db.session.delete(token)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Password reset successfully"
        })

    except Exception as e:
        db.session.rollback()
        print("RESET WITH OTP ERROR:", str(e))
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500