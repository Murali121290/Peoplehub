from functools import wraps
from flask import jsonify
from flask_jwt_extended import (
    verify_jwt_in_request,
    get_jwt_identity
)

from models.user import User


def auth_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            # Verify JWT Token
            verify_jwt_in_request()

            # Get user id from token
            user_id = get_jwt_identity()

            # Find user
            user = User.query.get(int(user_id))

            if not user:
                return jsonify({
                    'error': 'User not found'
                }), 404

            # Check active status
            if not user.is_active:
                return jsonify({
                    'error': 'User account is inactive'
                }), 403

            return f(*args, **kwargs)

        except Exception as e:
            print("AUTH ERROR:", str(e))

            return jsonify({
                'error': str(e)
            }), 422

    return wrapper


def role_required(*allowed_roles):
    def decorator(f):

        @wraps(f)
        def wrapper(*args, **kwargs):

            try:
                # Verify JWT
                verify_jwt_in_request()

                # Get user id
                user_id = get_jwt_identity()

                # Find user
                user = User.query.get(int(user_id))

                if not user:
                    return jsonify({
                        'error': 'User not found'
                    }), 404

                # Check active
                if not user.is_active:
                    return jsonify({
                        'error': 'User account is inactive'
                    }), 403

                # Check role exists
                if not user.role:
                    return jsonify({
                        'error': 'Role not assigned'
                    }), 403

                # Check permissions
                if allowed_roles and user.role.name not in allowed_roles:
                    return jsonify({
                        'error': 'Insufficient permissions'
                    }), 403

                return f(*args, **kwargs)

            except Exception as e:
                print("ROLE ERROR:", str(e))

                return jsonify({
                    'error': str(e)
                }), 422

        return wrapper

    return decorator

def access_level_required(*allowed_levels):
    def decorator(f):

        @wraps(f)
        def wrapper(*args, **kwargs):

            try:
                verify_jwt_in_request()

                user_id = get_jwt_identity()

                user = User.query.get(int(user_id))

                if not user:
                    return jsonify({
                        "error": "User not found"
                    }), 404

                if not user.is_active:
                    return jsonify({
                        "error": "User account is inactive"
                    }), 403

                if not user.access_level:
                    return jsonify({
                        "error": "Access level not assigned"
                    }), 403

                if (
                    allowed_levels and
                    user.access_level.lower() not in
                    [level.lower() for level in allowed_levels]
                ):
                    return jsonify({
                        "error": "Insufficient permissions"
                    }), 403

                return f(*args, **kwargs)

            except Exception as e:

                print("ACCESS LEVEL ERROR:", str(e))

                return jsonify({
                    "error": str(e)
                }), 422

        return wrapper

    return decorator