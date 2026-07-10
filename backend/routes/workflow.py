from flask import Blueprint, jsonify
from models.workflow import Workflow, WorkflowStage

workflow_bp = Blueprint('workflow', __name__)

# ==========================================
# GET ALL WORKFLOWS
# ==========================================
@workflow_bp.route('/', methods=['GET'])
def get_workflows():
    try:
        workflows = Workflow.query.filter_by(is_active=True).all()

        return jsonify({
            "workflows": [
                {
                    "id": workflow.id,
                    "name": workflow.name,
                    "description": workflow.description,
                    "is_active": workflow.is_active,
                    "created_at": workflow.created_at.isoformat() if workflow.created_at else None
                }
                for workflow in workflows
            ]
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ==========================================
# GET SINGLE WORKFLOW
# ==========================================
@workflow_bp.route('/<int:workflow_id>', methods=['GET'])
def get_workflow(workflow_id):
    try:
        workflow = Workflow.query.get(workflow_id)

        if not workflow:
            return jsonify({
                "error": "Workflow not found"
            }), 404

        return jsonify({
            "id": workflow.id,
            "name": workflow.name,
            "description": workflow.description,
            "is_active": workflow.is_active
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ==========================================
# GET WORKFLOW STAGES
# ==========================================
@workflow_bp.route('/<int:workflow_id>/stages', methods=['GET'])
def get_workflow_stages(workflow_id):
    try:
        workflow = Workflow.query.get(workflow_id)

        if not workflow:
            return jsonify({
                "error": "Workflow not found"
            }), 404

        stages = WorkflowStage.query.filter_by(
            workflow_id=workflow_id,
            is_active=True
        ).order_by(WorkflowStage.order).all()

        return jsonify({
            "workflow_id": workflow.id,
            "workflow_name": workflow.name,
            "stages": [stage.to_dict() for stage in stages]
        }), 200

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500