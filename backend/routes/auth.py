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

        print("================================")
        print("LOGIN ID:", login_id)
        print("USER FOUND:", user)

        if user:
            print("DB EMAIL:", user.email)
            print("COMPANY EMAIL:", user.company_email)
            print("HASH:", user.password_hash)
            print("PASSWORD MATCH:", user.check_password(password))
        else:
            print("USER NOT FOUND")
        print("================================")

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

            "user": user.to_dict()

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