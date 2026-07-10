from flask import Blueprint, request, jsonify
from models.user import User, Role, Team
from middleware.auth import auth_required, access_level_required
from models.database import db
from datetime import datetime
from models.employee import Employee

users_bp = Blueprint('users', __name__)

# =========================================
# GET ALL USERS
# =========================================
@users_bp.route('/', methods=['GET'])
@auth_required
@access_level_required('admin')
def get_users():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        role_filter = request.args.get('role')
        status_filter = request.args.get('status')
        search = request.args.get('search')

        query = User.query

        # Filter by role
        if role_filter:
            role = Role.query.filter_by(name=role_filter).first()
            if role:
                query = query.filter_by(role_id=role.id)

        # Filter by status
        if status_filter:
            query = query.filter_by(status=status_filter)

        # Search
        if search:
            query = query.filter(
                User.full_name.ilike(f'%{search}%') |
                User.email.ilike(f'%{search}%')
            )

        users = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        return jsonify({
            'users': [user.to_dict() for user in users.items],
            'pagination': {
                'page': users.page,
                'per_page': users.per_page,
                'total': users.total,
                'pages': users.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =========================================
# CREATE USER
# =========================================
@users_bp.route('/', methods=['POST'])
@auth_required
@access_level_required('admin')
def create_user():
    try:
        data = request.get_json()

        print("REQUEST DATA:", data)

        required_fields = [
            'full_name',
            'email',
            'company_email',
            'password',
            'role_id'
        ]

        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "error": f"{field} is required"
                }), 400

        # Check personal email
        existing_email = User.query.filter_by(
            email=data['email']
        ).first()

        if existing_email:
            return jsonify({
                "error": "Email already exists"
            }), 400

        # Check company email
        existing_company_email = User.query.filter_by(
            company_email=data['company_email']
        ).first()

        if existing_company_email:
            return jsonify({
                "error": "Company email already exists"
            }), 400

        # Validate role
        role = Role.query.get(data['role_id'])

        if not role:
            return jsonify({
                "error": "Invalid role"
            }), 400

        # Validate team
        team_id = data.get('team_id')

        if team_id:
            team = Team.query.get(team_id)

            if not team:
                return jsonify({
                    "error": "Invalid team"
                }), 400

        user = User(
            full_name=data['full_name'],
            email=data['email'],
            company_email=data['company_email'],
            role_id=data['role_id'],
            team_id=data.get('team_id'),
            access_level=data.get('access_level', 'standard'),
            status=data.get('status', 'active')
        )

        user.set_password(data['password'])

        db.session.add(user)
        db.session.commit()
        employee_id = data.get("employee_id")

        if employee_id:
            employee = Employee.query.get(employee_id)
            if employee:
                employee.user_id = user.id
                db.session.commit()

        return jsonify({
            "message": "User created successfully",
            "user": user.to_dict()
        }), 201

    except Exception as e:
        import traceback

        traceback.print_exc()

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500

# =========================================
# UPDATE USER
# =========================================
@users_bp.route('/<int:user_id>', methods=['PUT'])
@auth_required
@access_level_required('admin')
def update_user(user_id):
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({
                'error': 'User not found'
            }), 404

        data = request.get_json()

        if 'full_name' in data:
            user.full_name = data['full_name']

        if 'email' in data:
            existing = User.query.filter_by(
                email=data['email']
            ).first()

            if existing and existing.id != user_id:
                return jsonify({
                    'error': 'Email already exists'
                }), 400

            user.email = data['email']

        if 'role_id' in data:
            role = Role.query.get(data['role_id'])

            if not role:
                return jsonify({
                    'error': 'Invalid role'
                }), 400

            user.role_id = data['role_id']

        if 'team_id' in data:
            if data['team_id']:
                team = Team.query.get(data['team_id'])

                if not team:
                    return jsonify({
                        'error': 'Invalid team'
                    }), 400

            user.team_id = data['team_id']

        if 'access_level' in data:
            user.access_level = data['access_level']

        if 'status' in data:
            user.status = data['status']

        if 'password' in data and data['password']:
            user.set_password(data['password'])

        db.session.commit()

        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# =========================================
# DELETE USER
# =========================================
@users_bp.route('/<int:user_id>', methods=['DELETE'])
@auth_required
@access_level_required('admin')
def delete_user(user_id):
    try:
        user = User.query.get(user_id)

        if not user:
            return jsonify({
                'error': 'User not found'
            }), 404

        user.is_active = False
        user.status = 'inactive'

        db.session.commit()

        return jsonify({
            'message': 'User deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# =========================================
# GET ROLES
# =========================================
@users_bp.route('/roles', methods=['GET'])
@auth_required
def get_roles():
    try:
        roles = Role.query.all()

        return jsonify({
            'roles': [
                {
                    'id': role.id,
                    'name': role.name,
                    'description': role.description
                }
                for role in roles
            ]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =========================================
# GET TEAMS
# =========================================
@users_bp.route('/teams', methods=['GET'])
@auth_required
def get_teams():
    try:
        teams = Team.query.all()

        return jsonify({
            'teams': [
                {
                    'id': team.id,
                    'name': team.name,
                    'workflow_stage': team.workflow_stage
                }
                for team in teams
            ]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@users_bp.route('/roles/<int:team_id>', methods=['GET'])
@auth_required
def get_roles_by_team(team_id):

    try:
        roles = Role.query.filter_by(
            team_id=team_id
        ).all()

        return jsonify({
            "roles": [
                {
                    "id": role.id,
                    "name": role.name
                }
                for role in roles
            ]
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500
    
@users_bp.route(
    "/search",
    methods=["GET"]
)
def search_users():

    query = request.args.get(
        "q",
        ""
    )

    users = User.query.filter(
        User.first_name.ilike(
            f"%{query}%"
        )
    ).all()

    return jsonify([
        {
            "id": user.id,
            "name": user.first_name,
            "email": user.company_email
        }
        for user in users
    ])