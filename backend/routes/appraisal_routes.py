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
# ROUTE: GET /appraisal/cycle/active
# Description: Returns the currently open appraisal cycle.
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/cycle/active", methods=["GET"])
def get_active_cycle():
    try:
        current_cycle = AppraisalCycle.query.filter_by(status="Open").first()
        if not current_cycle:
            return jsonify({
                "success": False,
                "message": "No active appraisal cycle found"
            }), 200

        return jsonify({
            "success": True,
            "cycle": {
                "id": current_cycle.id,
                "title": current_cycle.title,
                "appraisalYear": current_cycle.appraisal_year,
                "startDate": current_cycle.start_date.strftime("%Y-%m-%d"),
                "endDate": current_cycle.end_date.strftime("%Y-%m-%d"),
                "status": current_cycle.status
            }
        }), 200
    except Exception as error:
        return jsonify({"success": False, "message": str(error)}), 500


# --------------------------------------------------------------------------
# ROUTE: GET /appraisal/stats
# Description: Returns dashboard statistics for appraisals.
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/stats", methods=["GET"])
def get_appraisal_stats():
    try:
        total_employees = Employee.query.count()
        current_cycle = AppraisalCycle.query.filter_by(status="Open").first()
        pending_reviews = 0
        completed_reviews = 0
        average_score = 0.0

        if current_cycle:
            # All requests for current cycle
            requests = AppraisalRequest.query.filter_by(cycle_id=current_cycle.id).all()
            pending_reviews = sum(1 for req in requests if req.status == "Pending" or req.status == "In Progress")
            completed_reviews = sum(1 for req in requests if req.status == "Reviewed" or req.status == "Completed")
            
            # Calculate average score of reviewed
            scored_requests = [req.score for req in requests if req.score is not None]
            if scored_requests:
                average_score = round(sum(scored_requests) / len(scored_requests), 1)

        return jsonify({
            "success": True,
            "stats": {
                "totalEmployees": total_employees,
                "pendingReviews": pending_reviews,
                "completedReviews": completed_reviews,
                "averageScore": average_score
            }
        }), 200
    except Exception as error:
        return jsonify({"success": False, "message": str(error)}), 500


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
        existing_submission = AppraisalRequest.query.filter_by(
            employee_id=str(employee_id),
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

        # Create Appraisal Request
        role_name = employee.user.role.name if employee.user and employee.user.role else employee.designation or "Unknown"

        new_request = AppraisalRequest(
            cycle_id=cycle_id,
            employee_id=str(employee_id),
            employee_name=f"{employee.first_name} {employee.last_name}",
            role=role_name,
            reporting_manager=employee.reporting_manager if employee.reporting_manager else "Unknown Manager",
            status="Pending",
            submitted_at=datetime.utcnow()
        )
        db.session.add(new_request)
        db.session.flush() # To get the new_request.id

        # Save all answers linked to the request
        for answer_item in answers:
            new_answer = AppraisalAnswer(
                request_id=new_request.id,
                question_id=answer_item.get("question_id"),
                answer=answer_item.get("answer")
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

        # Batch fetch all data to avoid N+3 query loops
        all_employees = Employee.query.all()
        employee_map = {emp.id: emp for emp in all_employees}

        from models.appraisal import AppraisalCycle
        all_cycles = AppraisalCycle.query.all()
        cycle_map = {c.id: c for c in all_cycles}

        all_users = User.query.all()
        user_map = {u.id: u for u in all_users}

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

            employee = employee_map.get(record.employee_id)
            cycle = cycle_map.get(record.cycle_id)

            if not employee or not cycle:
                continue

            user = user_map.get(employee.user_id)

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

        # Fetch the most recent appraisal request for the employee
        request = AppraisalRequest.query.filter_by(
            employee_id=str(employee_id)
        ).order_by(AppraisalRequest.submitted_at.desc()).first()

        if not request:
            return jsonify({
                "success": False,
                "message": "No appraisal submission found for this employee"
            }), 200

        answers = AppraisalAnswer.query.filter_by(
            request_id=request.id
        ).all()

        cycle = AppraisalCycle.query.get(request.cycle_id)

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

        # Fetch manager review if it exists
        review = AppraisalRequest.query.filter_by(
            employee_id=str(employee_id),
            cycle_id=cycle.id if cycle else None
        ).first()
        
        manager_review = None
        if review and review.status == "Reviewed":
            manager_review = {
                "rating": review.rating,
                "score": review.score,
                "managerComment": review.manager_comment,
                "reviewedBy": review.reporting_manager,
                "reviewedDate": review.reviewed_at.strftime("%d %b %Y") if review.reviewed_at else None,
            }

        return jsonify({
            "success": True,
            "message": "Employee appraisal fetched successfully",
            "employee_id": employee.id,
            "employee_name": f"{employee.first_name} {employee.last_name}",
            "role": role_name,
            "department": employee.department,
            "cycle_id": cycle.id if cycle else None,
            "cycle_name": cycle.title if cycle else None,
            "cycle_year": cycle.appraisal_year if cycle else None,
            "answers": answer_list,
            "manager_review": manager_review
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
# --------------------------------------------------------------------------
# ROUTE: GET /appraisal/history/<employee_id>
# Description: Returns the completed/reviewed appraisal history for an employee.
# --------------------------------------------------------------------------
@appraisal_bp.route("/appraisal/history/<int:employee_id>", methods=["GET"])
def get_appraisal_history(employee_id):
    try:
        # Fetch all Reviewed appraisal requests for this employee
        requests = AppraisalRequest.query.filter_by(
            employee_id=str(employee_id)
        ).order_by(AppraisalRequest.reviewed_at.desc()).all()

        history_list = []
        for req in requests:
            cycle = AppraisalCycle.query.get(req.cycle_id)
            history_list.append({
                "id": req.id,
                "year": cycle.appraisal_year if cycle else None,
                "cycle": cycle.title if cycle else "Unknown",
                "rating": req.rating,
                "score": req.score,
                "status": req.status,
                "reviewedBy": req.reporting_manager,
                "reviewedDate": req.reviewed_at.strftime("%d %b %Y") if req.reviewed_at else None,
            })

        return jsonify({
            "success": True,
            "message": "Appraisal history fetched successfully",
            "history": history_list
        }), 200

    except SQLAlchemyError as db_error:
        return jsonify({
            "success": False,
            "message": f"Database error occurred: {str(db_error)}"
        }), 500
    except Exception as error:
        return jsonify({
            "success": False,
            "message": f"Something went wrong: {str(error)}"
        }), 500
