from flask import Blueprint, jsonify
from models.project import Project
from models.client import Client
from models.user import User
from middleware.auth import auth_required

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
@auth_required
def get_dashboard_stats():

    total_projects = Project.query.count()
    total_clients = Client.query.count()
    total_users = User.query.count()

    active_projects = Project.query.filter_by(
        status='active'
    ).count()

    completed_projects = Project.query.filter_by(
        status='completed'
    ).count()

    return jsonify({
        'total_projects': total_projects,
        'active_projects': active_projects,
        'completed_projects': completed_projects,
        'total_clients': total_clients,
        'total_users': total_users
    }), 200


@dashboard_bp.route('/workflow-stats', methods=['GET'])
@auth_required
def get_workflow_stats():

    pre_editing = Project.query.filter_by(
        current_stage='Pre-Editing'
    ).count()

    copywriting = Project.query.filter_by(
        current_stage='Copywriting'
    ).count()

    qa = Project.query.filter_by(
        current_stage='QA'
    ).count()

    completed = Project.query.filter_by(
        status='completed'
    ).count()

    return jsonify({
        'pre_editing': pre_editing,
        'copywriting': copywriting,
        'qa': qa,
        'completed': completed
    }), 200