"""
appraisal_routes.py

FastAPI APIRouter for the Employee Appraisal Module.
Handles appraisal cycles, question fetching, employee answer submission,
manager review, and appraisal reporting.

Follows the same coding conventions as attendance_routes.py:
- Blueprint based routing
- jsonify() responses
- try/except around every route
- db.session.commit() / db.session.rollback()
- Proper HTTP status codes
"""

from utils.compat import Blueprint, request, jsonify
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError

from models.database import db
from models.appraisal import (
    AppraisalCycle,
    AppraisalQuestion,
    AppraisalAnswer,
    AppraisalRequest

)
from models.notification import Notification
from models.user import User
from models.employee import Employee


# --------------------------------------------------------------------------
# Blueprint Initialization
# --------------------------------------------------------------------------
appraisal_bp = Blueprint(
    "appraisal",
    __name__
)


# --------------------------------------------------------------------------
# ROUTE: GET /appraisal/questions/<role>
# Description: Returns active appraisal questions for a given role,
#              filtered to the currently open appraisal cycle/year.
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/questions/<string:role>", methods=["GET"])
def get_appraisal_questions(role):
    try:
        # Find the currently open appraisal cycle
        current_cycle = AppraisalCycle.query.filter_by(status="Open").first()

        if not current_cycle:
            return jsonify({
                "success": False,
                "message": "No active appraisal cycle found"
            }), 404

        # Normalize role to supported appraisal categories
        normalized_role = role.strip().lower()
        if "production" in normalized_role or "project manager" in normalized_role:
            normalized_role = "Production"
        elif "editor" in normalized_role:
            normalized_role = "Editor"
        elif "copy" in normalized_role:
            normalized_role = "Copywriter"
        else:
            normalized_role = role

        # Fetch active questions for the normalized role and current cycle year
        questions = AppraisalQuestion.query.filter_by(
            role_name=normalized_role,
            appraisal_year=current_cycle.appraisal_year,
            is_active=True
        ).all()

        if not questions:
            # Fallback: return any active questions from the current cycle
            questions = AppraisalQuestion.query.filter_by(
                appraisal_year=current_cycle.appraisal_year,
                is_active=True
            ).all()

        if not questions:
            return jsonify({
                "success": False,
                "message": f"No appraisal questions found for role: {role}"
            }), 404

        # Build response payload
        question_list = [
            {
                "question_id": question.id,
                "question_text": question.question
            }
            for question in questions
        ]

        return jsonify({
            "success": True,
            "message": "Appraisal questions fetched successfully",
            "cycle_id": current_cycle.id,
            "cycle_name": current_cycle.title,
            "role": role,
            "questions": question_list
        }), 200

    except SQLAlchemyError as db_error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Database error occurred: {str(db_error)}"
        }), 500

    except Exception as error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Something went wrong: {str(error)}"
        }), 500


# --------------------------------------------------------------------------
# ROUTE: POST /appraisal/submit
# Description: Allows an employee to submit answers for an appraisal cycle.
#              Prevents duplicate submissions and enforces minimum answers.
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/submit", methods=["POST"])
def submit_appraisal():
    try:
        data = request.get_json()

        # Basic payload validation
        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        employee_id = data.get("employee_id")
        cycle_id = data.get("cycle_id")
        answers = data.get("answers")

        # Validate required fields
        if not employee_id:
            return jsonify({
                "success": False,
                "message": "employee_id is required"
            }), 400

        if not cycle_id:
            return jsonify({
                "success": False,
                "message": "cycle_id is required"
            }), 400

        if not answers or not isinstance(answers, list):
            return jsonify({
                "success": False,
                "message": "answers list is required"
            }), 400

        if len(answers) < 5:
            return jsonify({
                "success": False,
                "message": "Minimum 5 answers are required"
            }), 400

        # Validate employee exists
        employee = Employee.query.get(employee_id)

        if not employee:
            return jsonify({
                "success": False,
                "message": "Employee not found"
            }), 404

        # Validate appraisal cycle exists
        cycle = AppraisalCycle.query.get(cycle_id)
        if not cycle:
            return jsonify({
                "success": False,
                "message": "Appraisal cycle not found"
            }), 404

        # Prevent duplicate submission for the same cycle
        existing_submission = AppraisalAnswer.query.filter_by(
            employee_id=employee_id,
            cycle_id=cycle_id
        ).first()

        if existing_submission:
            return jsonify({
                "success": False,
                "message": "Appraisal already submitted for this cycle"
            }), 409

        # Validate each answer entry and question existence
        for answer_item in answers:
            question_id = answer_item.get("question_id")
            answer_text = answer_item.get("answer")

            if not question_id or not answer_text:
                return jsonify({
                    "success": False,
                    "message": "Each answer must have question_id and answer"
                }), 400

            question = AppraisalQuestion.query.get(question_id)
            if not question:
                return jsonify({
                    "success": False,
                    "message": f"Invalid question_id: {question_id}"
                }), 404

        # Save all answers
        for answer_item in answers:
            new_answer = AppraisalAnswer(
                employee_id=employee_id,
                cycle_id=cycle_id,
                question_id=answer_item.get("question_id"),
                answer=answer_item.get("answer"),
                status="Pending Review",
                submitted_at=datetime.utcnow()
            )
            db.session.add(new_answer)

        if employee.reporting_manager:
            notification = Notification(
                receiver_name=employee.reporting_manager,
                title="Appraisal Submitted",
                message=(
                    f"{employee.first_name} {employee.last_name} "
                    f"submitted appraisal for {cycle.title}."
                ),
                is_read=False
            )
            db.session.add(notification)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Appraisal submitted successfully"
        }), 201

    except SQLAlchemyError as db_error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Database error occurred: {str(db_error)}"
        }), 500

    except Exception as error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Something went wrong: {str(error)}"
        }), 500


# --------------------------------------------------------------------------
# ROUTE: GET /appraisal/pending
# Description: Returns list of employees whose appraisal status is
#              "Pending Review" for managers to review.
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/pending", methods=["GET"])
def get_pending_appraisals():
    try:
        # Fetch distinct employees with pending review answers
        pending_answers = AppraisalAnswer.query.filter_by(
            status="Pending Review"
        ).all()

        if not pending_answers:
            return jsonify({
                "success": True,
                "message": "No pending appraisals found",
                "data": []
            }), 200

        # Group by employee + cycle to avoid duplicate rows
        seen = set()
        pending_list = []

        for record in pending_answers:
            key = (record.employee_id, record.cycle_id)
            if key in seen:
                continue
            seen.add(key)

            employee = Employee.query.get(record.employee_id)
            cycle = AppraisalCycle.query.get(record.cycle_id)

            if not employee or not cycle:
                continue

            user = User.query.get(employee.user_id)

            role_name = (
                user.role.name
                if user and user.role
                else "-"
            )

            pending_list.append({
                "employee_id": employee.id,
                "employee_name": f"{employee.first_name} {employee.last_name}",
                "role": role_name,
                "cycle_id": cycle.id,
                "cycle_name": cycle.title,
                "submission_date": record.submitted_at.strftime("%Y-%m-%d %H:%M:%S")
                if record.submitted_at else None
            })

        return jsonify({
            "success": True,
            "message": "Pending appraisals fetched successfully",
            "data": pending_list
        }), 200

    except SQLAlchemyError as db_error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Database error occurred: {str(db_error)}"
        }), 500

    except Exception as error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Something went wrong: {str(error)}"
        }), 500


# --------------------------------------------------------------------------
# ROUTE: GET /appraisal/employee/<employee_id>
# Description: Returns questions and answers submitted by an employee
#              for the manager to review.
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/employee/<int:employee_id>", methods=["GET"])
def get_employee_appraisal(employee_id):
    try:
        # Validate employee exists
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                "success": False,
                "message": "Employee not found"
            }), 404

        # Fetch all answers submitted by the employee
        answers = AppraisalAnswer.query.filter_by(
            employee_id=employee_id
        ).all()

        if not answers:
            return jsonify({
                "success": False,
                "message": "No appraisal submission found for this employee"
            }), 404

        # Assume all fetched answers belong to the same active cycle
        cycle = AppraisalCycle.query.get(answers[0].cycle_id)

        answer_list = []
        for answer in answers:
            question = AppraisalQuestion.query.get(answer.question_id)
            answer_list.append({
                "question_id": answer.question_id,
                "question_text": question.question if question else None,
                "answer": answer.answer
            })

            user = User.query.get(employee.user_id)

            role_name = (
                user.role.name
                if user and user.role
                else "-"
    )

        return jsonify({
            "success": True,
            "message": "Employee appraisal fetched successfully",
            "employee_id": employee.id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "role": role_name,
            "cycle_id": cycle.id if cycle else None,
            "cycle_name": cycle.title if cycle else None,
            "answers": answer_list
        }), 200

    except SQLAlchemyError as db_error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Database error occurred: {str(db_error)}"
        }), 500

    except Exception as error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Something went wrong: {str(error)}"
        }), 500


# --------------------------------------------------------------------------
# ROUTE: POST /appraisal/review
# Description: Allows a manager to submit a review (rating, score, comment)
#              for an employee's appraisal. Prevents duplicate reviews and
#              updates the appraisal status to "Reviewed".
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/review", methods=["POST"])
def submit_appraisal_review():
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        employee_id = data.get("employee_id")
        cycle_id = data.get("cycle_id")
        manager_id = data.get("manager_id")
        rating = data.get("rating")
        score = data.get("score")
        manager_comment = data.get("manager_comment")

        # Validate required fields
        if not employee_id:
            return jsonify({
                "success": False,
                "message": "employee_id is required"
            }), 400

        if not cycle_id:
            return jsonify({
                "success": False,
                "message": "cycle_id is required"
            }), 400

        if not manager_id:
            return jsonify({
                "success": False,
                "message": "manager_id is required"
            }), 400

        valid_ratings = ["Excellent", "Good", "Average", "Needs Improvement"]
        if rating not in valid_ratings:
            return jsonify({
                "success": False,
                "message": f"rating must be one of {valid_ratings}"
            }), 400

        if score is None:
            return jsonify({
                "success": False,
                "message": "score is required"
            }), 400

        if not manager_comment:
            return jsonify({
                "success": False,
                "message": "manager_comment is required"
            }), 400

        # Validate employee exists
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                "success": False,
                "message": "Employee not found"
            }), 404

        # Validate cycle exists
        cycle = AppraisalCycle.query.get(cycle_id)
        if not cycle:
            return jsonify({
                "success": False,
                "message": "Appraisal cycle not found"
            }), 404

        # Validate manager exists
        manager = User.query.get(manager_id)
        if not manager:
            return jsonify({
                "success": False,
                "message": "Manager not found"
            }), 404

        # Prevent duplicate review for same employee and cycle
        existing_review = AppraisalRequest.query.filter_by(
            employee_id=employee_id,
            cycle_id=cycle_id
        ).first()

        if existing_review:
            return jsonify({
                "success": False,
                "message": "Review already submitted for this employee and cycle"
            }), 409

        # Ensure employee has actually submitted their appraisal first
        submitted_answers = AppraisalAnswer.query.filter_by(
            employee_id=employee_id,
            cycle_id=cycle_id
        ).first()

        if not submitted_answers:
            return jsonify({
                "success": False,
                "message": "Employee has not submitted appraisal answers yet"
            }), 400

        # Save the review
        new_review = AppraisalRequest(
            employee_id=employee_id,
            cycle_id=cycle_id,
            manager_id=manager_id,
            rating=rating,
            score=score,
            manager_comment=manager_comment,
            reviewed_at=datetime.utcnow()
        )
        db.session.add(new_review)

        # Update status of all related answers to "Reviewed"
        AppraisalAnswer.query.filter_by(
            employee_id=employee_id,
            cycle_id=cycle_id
        ).update({"status": "Reviewed"})

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Appraisal review submitted successfully"
        }), 201

    except SQLAlchemyError as db_error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Database error occurred: {str(db_error)}"
        }), 500

    except Exception as error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Something went wrong: {str(error)}"
        }), 500


# --------------------------------------------------------------------------
# ROUTE: GET /appraisal/report/<employee_id>
# Description: Returns the complete appraisal report for an employee,
#              including questions, answers, rating, score, manager
#              comment, and review date.
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/report/<int:employee_id>", methods=["GET"])
def get_appraisal_report(employee_id):
    try:
        # Validate employee exists
        employee = Employee.query.get(employee_id)
        if not employee:
            return jsonify({
                "success": False,
                "message": "Employee not found"
            }), 404

        # Fetch the most recent review for this employee
        review = AppraisalRequest.query.filter_by(
            employee_id=employee_id
        ).order_by(AppraisalRequest.reviewed_at.desc()).first()

        if not review:
            return jsonify({
                "success": False,
                "message": "No completed review found for this employee"
            }), 404

        # Fetch cycle details
        cycle = AppraisalCycle.query.get(review.cycle_id)

        # Fetch answers tied to the reviewed cycle
        answers = AppraisalAnswer.query.filter_by(
            employee_id=employee_id,
            cycle_id=review.cycle_id
        ).all()

        answer_list = []
        for answer in answers:
            question = AppraisalQuestion.query.get(answer.question_id)
            answer_list.append({
                "question_id": answer.question_id,
                "question_text": question.question if question else None,
                "answer": answer.answer
            })

            user = User.query.get(employee.user_id)

            role_name = (
                user.role.name
                if user and user.role
                else "-"
            )

        return jsonify({
            "success": True,
            "message": "Appraisal report fetched successfully",
            "employee_id": employee.id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "role": role_name,
            "cycle_id": cycle.id if cycle else None,
            "cycle_name": cycle.title if cycle else None,
            "answers": answer_list,
            "rating": review.rating,
            "score": review.score,
            "manager_comment": review.manager_comment,
            "reviewed_date": review.reviewed_at.strftime("%Y-%m-%d %H:%M:%S")
            if review.reviewed_at else None
        }), 200

    except SQLAlchemyError as db_error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Database error occurred: {str(db_error)}"
        }), 500

    except Exception as error:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Something went wrong: {str(error)}"
        }), 500