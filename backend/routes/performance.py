import os
import json
import shutil
from datetime import datetime
from sqlalchemy import or_, func
from utils.compat import Blueprint, request, jsonify
from utils.uploads import get_uploads_dir
from models.database import db
from models.employee import Employee
from models.performance import EmployeePerformance
from models.kpi_evaluation import KpiEvaluation
from models.manager_kpi_template import ManagerKpiTemplate
from middleware.auth import auth_required, access_level_required
from services.kpi_evaluation_rollup_service import calculate_evaluation_working_days

performance_bp = Blueprint("performance", __name__)

@performance_bp.route("/", methods=["GET"])
@auth_required
@access_level_required("admin", "hr")
def get_performance_records():
    try:
        records = EmployeePerformance.query.order_by(EmployeePerformance.created_at.desc()).all()
        return jsonify({"records": [r.to_dict() for r in records]}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/", methods=["POST"])
@auth_required
@access_level_required("admin", "hr")
def create_performance_record():
    try:
        data = request.get_json()
        new_record = EmployeePerformance(
            name=data.get("name", ""),
            department=data.get("department", ""),
            designation=data.get("designation", ""),
            review_period=data.get("reviewPeriod", ""),
            efficiency=data.get("efficiency", 0),
            quality=data.get("quality", 0),
            productivity=data.get("productivity", 0),
            attendance=data.get("attendance", 0),
            rating=data.get("rating", "Good"),
            goals=data.get("goals", ""),
            feedback=data.get("feedback", ""),
            reviewer=data.get("reviewer", ""),
            review_date=data.get("reviewDate", "")
        )
        db.session.add(new_record)
        db.session.commit()
        return jsonify({"success": True, "record": new_record.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/<int:id>", methods=["PUT"])
@auth_required
@access_level_required("admin", "hr")
def update_performance_record(id):
    try:
        record = EmployeePerformance.query.get(id)
        if not record:
            return jsonify({"error": "Performance record not found"}), 404

        data = request.get_json()
        record.name = data.get("name", record.name)
        record.department = data.get("department", record.department)
        record.designation = data.get("designation", record.designation)
        record.review_period = data.get("reviewPeriod", record.review_period)
        record.efficiency = data.get("efficiency", record.efficiency)
        record.quality = data.get("quality", record.quality)
        record.productivity = data.get("productivity", record.productivity)
        record.attendance = data.get("attendance", record.attendance)
        record.rating = data.get("rating", record.rating)
        record.goals = data.get("goals", record.goals)
        record.feedback = data.get("feedback", record.feedback)
        record.reviewer = data.get("reviewer", record.reviewer)
        record.review_date = data.get("reviewDate", record.review_date)

        db.session.commit()
        return jsonify({"success": True, "record": record.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/<int:id>", methods=["DELETE"])
@auth_required
@access_level_required("admin", "hr")
def delete_performance_record(id):
    try:
        record = EmployeePerformance.query.get(id)
        if not record:
            return jsonify({"error": "Performance record not found"}), 404

        db.session.delete(record)
        db.session.commit()
        return jsonify({"success": True, "message": "Performance record deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# =========================================================================
# EVALUATION & REPORT MODULE (POSTGRESQL KPI_EVALUATIONS INTEGRATION)
# =========================================================================
import json
import os
from utils.uploads import get_uploads_dir
from models.employee import Employee
from models.user import User

DEFAULT_RATING_SCALE = [
    {
        "grade": "A",
        "letterGrade": "A",
        "scoreRangeText": "91 to 100",
        "name": "Outstanding",
        "minScore": 91,
        "maxScore": 100,
        "stars": 5,
        "description": "Outstanding - the highest possible performance rating given to an employee who consistently exceeds expectations on all evaluations."
    },
    {
        "grade": "B",
        "letterGrade": "B",
        "scoreRangeText": "81 to 90",
        "name": "Exceeds Expectations",
        "minScore": 81,
        "maxScore": 90.99,
        "stars": 4,
        "description": "Exceeds Expectation - the performance rating given to employees who exhibit high overall performance, routinely go beyond what is expected in order to substantially surpass all of their key performance expectations/goals and will have met or exceeded expectations on the Competencies."
    },
    {
        "grade": "C",
        "letterGrade": "C",
        "scoreRangeText": "66 to 80",
        "name": "Meets Expectations",
        "minScore": 66,
        "maxScore": 80.99,
        "stars": 3,
        "description": "Meets Expectation - the performance rating given to employees who (1) are fully successful in meeting all of the performance expectations/goals that are important to his or her job and (2) will have demonstrated a satisfactory performance."
    },
    {
        "grade": "D",
        "letterGrade": "D",
        "scoreRangeText": "51 to 65",
        "name": "Needs Improvement",
        "minScore": 51,
        "maxScore": 65.99,
        "stars": 2,
        "description": "Needs Improvement - the performance rating given to employees who sometimes perform at an acceptable level but are not consistent and need improvement to meet expectations."
    },
    {
        "grade": "E",
        "letterGrade": "E",
        "scoreRangeText": "Below 50",
        "name": "Does Not Meet Expectation",
        "minScore": 0,
        "maxScore": 50.99,
        "stars": 1,
        "description": "Does Not Meet Expectation - the performance rating given to employees who fail to achieve any one or more key performance expectations/goals or cannot demonstrate proficiency in the Competencies needed for the job."
    }
]

def get_employee_eval_dir(employee_id: str) -> str:
    uploads_dir = get_uploads_dir()
    clean_emp = str(employee_id or "").strip().lower().replace("emp-", "").replace("emp_", "")
    emp_dir = os.path.join(uploads_dir, "employees", clean_emp)
    os.makedirs(emp_dir, exist_ok=True)
    return emp_dir


def get_employee_eval_path(employee_id: str) -> str:
    emp_dir = get_employee_eval_dir(employee_id)
    return os.path.join(emp_dir, "evaluation.json")


def read_employee_evaluations(employee_id: str) -> list:
    """Reads all evaluation responses for a specific employee from their evaluation.json file."""
    if not employee_id:
        return []
    clean_emp = str(employee_id).strip().lower().replace("emp-", "").replace("emp_", "")
    path = get_employee_eval_path(clean_emp)
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            if isinstance(data, dict):
                return data.get("responses", [])
            return []
    except Exception:
        return []


def write_employee_evaluations(employee_id: str, responses: list):
    """Writes evaluation responses for a specific employee into their evaluation.json file."""
    if not employee_id:
        return
    clean_emp = str(employee_id).strip().lower().replace("emp-", "").replace("emp_", "")
    path = get_employee_eval_path(clean_emp)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({
            "employee_id": clean_emp,
            "updated_at": datetime.utcnow().isoformat(),
            "responses": responses
        }, f, ensure_ascii=False, indent=2)


def read_all_employee_evaluations() -> list:
    """Scans data/uploads/employees/*/evaluation.json and aggregates all employee responses."""
    uploads_dir = get_uploads_dir()
    emp_root = os.path.join(uploads_dir, "employees")
    all_responses = []
    if not os.path.exists(emp_root):
        return all_responses
    try:
        for entry in os.scandir(emp_root):
            if entry.is_dir():
                eval_file = os.path.join(entry.path, "evaluation.json")
                if os.path.exists(eval_file):
                    try:
                        with open(eval_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            resps = data if isinstance(data, list) else (data.get("responses", []) if isinstance(data, dict) else [])
                            all_responses.extend(resps)
                    except Exception:
                        pass
    except Exception:
        pass
    return all_responses


def read_eval_store():
    return {
        "cycles": [],
        "responses": read_all_employee_evaluations(),
        "ratingScale": DEFAULT_RATING_SCALE
    }


def write_eval_store(data):
    if not isinstance(data, dict):
        return
    if "responses" in data and isinstance(data["responses"], list):
        emp_groups = {}
        for r in data["responses"]:
            emp_id = str(r.get("employeeCode") or r.get("employeeId") or r.get("employee_id") or "").strip()
            if emp_id:
                emp_groups.setdefault(emp_id, []).append(r)
        for emp_id, resps in emp_groups.items():
            write_employee_evaluations(emp_id, resps)


def clean_legacy_evaluations_dir():
    """Removes obsolete data/uploads/evaluations directory."""
    try:
        uploads_dir = get_uploads_dir()
        eval_dir = os.path.join(uploads_dir, "evaluations")
        legacy_file = os.path.join(uploads_dir, "evaluations", "evaluation_store.json")
        if os.path.exists(legacy_file):
            migrated_backup = legacy_file + ".migrated"
            shutil.move(legacy_file, migrated_backup)
        if os.path.exists(eval_dir):
            shutil.rmtree(eval_dir, ignore_errors=True)
    except Exception as err:
        print(f"Migration error from legacy evaluation_store.json: {err}")


def sync_postgres_kpi_to_store_and_back():
    """
    Storage Architecture:
    - Authoritative Evaluation Cycles, Templates, and Milestones are stored directly in PostgreSQL (kpi_evaluations & manager_kpi_templates).
    - Per-employee JSON records are stored in data/uploads/employees/<employee_id>/evaluation.json.
    - If a record is deleted from PostgreSQL, it is immediately synchronized and purged.
    """
    try:
        # Query PostgreSQL strictly for Monthly, Quarterly, and Yearly evaluations
        eval_records = KpiEvaluation.query.filter(
            or_(KpiEvaluation.is_archived == False, KpiEvaluation.is_archived.is_(None)),
            or_(
                KpiEvaluation.frequency.in_(["monthly", "quarterly", "yearly"]),
                KpiEvaluation.frequency.is_(None)
            )
        ).order_by(KpiEvaluation.id.desc()).all()

        valid_db_ids = {r.id for r in eval_records} if eval_records else set()

        # Migrate any daily/weekly records that were accidentally stored in PostgreSQL → move to JSON store
        try:
            daily_db_records = KpiEvaluation.query.filter(
                or_(KpiEvaluation.is_archived == False, KpiEvaluation.is_archived.is_(None)),
                KpiEvaluation.frequency.in_(["daily", "weekly"])
            ).all()
            if daily_db_records:
                for rec in daily_db_records:
                    emp_id = str(rec.employee_id or "").strip()
                    if not emp_id:
                        continue
                    metrics = rec.metrics_data or {}
                    cats = metrics.get("categories", []) if isinstance(metrics, dict) else (metrics if isinstance(metrics, list) else [])
                    milestone_freq = metrics.get("milestone_frequency") if isinstance(metrics, dict) else None
                    if rec.frequency in ["daily", "weekly"]:
                        milestone_freq = None
                    daily_recs = metrics.get("daily_records", []) if isinstance(metrics, dict) else []
                    weekly_recs = metrics.get("weekly_records", []) if isinstance(metrics, dict) else []
                    period_label = ""
                    if rec.description and "(" in rec.description and ")" in rec.description:
                        period_label = rec.description.split("(", 1)[1].rsplit(")", 1)[0].strip()
                    from_str = rec.from_date.isoformat() if rec.from_date else ""
                    to_str = rec.to_date.isoformat() if rec.to_date else ""
                    emp_json_resps = read_employee_evaluations(emp_id)
                    existing_in_json = next((
                        r for r in emp_json_resps
                        if (r.get("form") == rec.form or r.get("performance_metrics") == rec.form) and
                           r.get("frequency") == rec.frequency and
                           r.get("startDate") == from_str and r.get("endDate") == to_str
                    ), None)
                    if not existing_in_json:
                        migrated_resp = {
                            "id": f"resp_json_{abs(hash(f'{emp_id}_{rec.form}_{period_label}_{rec.id}')) % 10000000}",
                            "cycleId": f"cycle_json_{abs(hash(f'{rec.team_name}_{rec.form}_{rec.frequency}_{from_str}_{to_str}_{period_label}')) % 1000000}",
                            "teamId": str(rec.team_id or "General"),
                            "teamName": rec.team_name or "General",
                            "employeeId": emp_id,
                            "employeeCode": emp_id,
                            "employeeName": rec.employee_name or f"Employee {emp_id}",
                            "form": rec.form or rec.performance_metrics or "",
                            "performance_metrics": rec.performance_metrics or rec.form or "",
                            "periodName": period_label or rec.form or "",
                            "description": rec.description or "",
                            "status": rec.status or "Assigned to Employee",
                            "employeeOverallScore": float(rec.employee_overall_score or 0),
                            "employeeRemarks": rec.employee_remark or "",
                            "managerScore": rec.manager_score,
                            "managerRemarks": rec.manager_remark or "",
                            "serviceManagerScore": float(rec.service_manager_score) if (rec.service_manager_score and rec.service_manager_score.replace('.','',1).isdigit()) else None,
                            "reportingManager": rec.reporting_manager or "",
                            "reporting_manager": rec.reporting_manager or "",
                            "reporting_manager_id": str(rec.reporting_manager_id or rec.manager_id or ""),
                            "serviceManager": rec.service_manager or "",
                            "service_manager": rec.service_manager or "",
                            "service_manager_id": str(rec.service_manager_id or ""),
                            "frequency": rec.frequency or "daily",
                            "startDate": from_str,
                            "endDate": to_str,
                            "categories": cats,
                            "metrics_data": cats,
                            "daily_records": daily_recs,
                            "weekly_records": weekly_recs,
                            "milestone_frequency": milestone_freq,
                            "kpiResponses": {},
                            "createdAt": rec.created_at.isoformat() if rec.created_at else None,
                            "updatedAt": rec.updated_at.isoformat() if rec.updated_at else None,
                        }
                        emp_json_resps.append(migrated_resp)
                        write_employee_evaluations(emp_id, emp_json_resps)
                    # Delete from Postgres
                    db.session.delete(rec)
                db.session.commit()
        except Exception as migrate_err:
            db.session.rollback()
            print(f"Non-blocking: daily/weekly Postgres→JSON migration error: {migrate_err}")

        # Clean legacy evaluations directory if present
        clean_legacy_evaluations_dir()

        # Synchronize and clean up any dangling/deleted DB records across all employees
        uploads_dir = get_uploads_dir()
        emp_root = os.path.join(uploads_dir, "employees")
        if os.path.exists(emp_root):
            for entry in os.scandir(emp_root):
                if entry.is_dir():
                    emp_id = entry.name
                    emp_resps = read_employee_evaluations(emp_id)
                    if emp_resps:
                        cleaned = []
                        modified = False
                        for r in emp_resps:
                            r_id_str = str(r.get("id") or "")
                            r_db_id = r.get("db_id")
                            freq = str(r.get("frequency") or "").lower()
                            is_db_entry = bool(r_db_id or (r_id_str.startswith("resp_") and r_id_str.replace("resp_", "").isdigit()))
                            if is_db_entry and freq not in ["daily", "weekly"]:
                                db_pk = int(r_db_id) if r_db_id else int(r_id_str.replace("resp_", ""))
                                if db_pk not in valid_db_ids:
                                    modified = True
                                    continue
                            cleaned.append(r)
                        if modified:
                            write_employee_evaluations(emp_id, cleaned)

        store = read_eval_store()
        return eval_records, store
    except Exception as e:
        print(f"Error syncing KPI records: {e}")
        db.session.rollback()
        fallback_store = read_eval_store()
        return None, fallback_store

def merge_kpi_responses_into_categories(categories, responses_dict):
    if not categories or not isinstance(categories, list) or not responses_dict or not isinstance(responses_dict, dict):
        return categories
    
    updated_categories = []
    for cat in categories:
        if not isinstance(cat, dict):
            updated_categories.append(cat)
            continue
        new_cat = dict(cat)
        if "kpis" in new_cat and isinstance(new_cat["kpis"], list):
            new_kpis = []
            for kpi in new_cat["kpis"]:
                if not isinstance(kpi, dict):
                    new_kpis.append(kpi)
                    continue
                new_k = dict(kpi)
                k_id = str(new_k.get("id") or "")
                k_name = str(new_k.get("name") or "").strip().lower()
                
                resp = None
                if k_id and k_id in responses_dict:
                    resp = responses_dict[k_id]
                elif new_k.get("name") and new_k["name"] in responses_dict:
                    resp = responses_dict[new_k["name"]]
                else:
                    for rk, rv in responses_dict.items():
                        if isinstance(rv, dict) and (str(rv.get("kpiId") or "") == k_id or str(rv.get("name") or "").strip().lower() == k_name or str(rk).strip().lower() == k_name):
                            resp = rv
                            break
                
                if isinstance(resp, dict):
                    if resp.get("actualValue") is not None and resp.get("actualValue") != "":
                        new_k["actualValue"] = resp.get("actualValue")
                        new_k["actual_value"] = resp.get("actualValue")
                    if resp.get("achievementPercentage") is not None:
                        new_k["achievementPercentage"] = resp.get("achievementPercentage")
                    if resp.get("earnedScore") is not None:
                        new_k["earnedScore"] = resp.get("earnedScore")
                        new_k["earned_score"] = resp.get("earnedScore")
                    if resp.get("employeeRemarks") is not None and resp.get("employeeRemarks") != "":
                        new_k["employeeRemarks"] = resp.get("employeeRemarks")
                        new_k["employee_remark"] = resp.get("employeeRemarks")
                    if resp.get("isInsufficient") is not None:
                        new_k["isInsufficient"] = bool(resp.get("isInsufficient"))
                        new_k["is_insufficient"] = bool(resp.get("isInsufficient"))
                    elif resp.get("is_insufficient") is not None:
                        new_k["isInsufficient"] = bool(resp.get("is_insufficient"))
                        new_k["is_insufficient"] = bool(resp.get("is_insufficient"))
                    if resp.get("managerActualValue") is not None and resp.get("managerActualValue") != "":
                        new_k["managerActualValue"] = resp.get("managerActualValue")
                        new_k["manager_actual_pm"] = resp.get("managerActualValue")
                    if resp.get("managerScore") is not None:
                        new_k["managerScore"] = resp.get("managerScore")
                        new_k["manager_score"] = resp.get("managerScore")
                    if resp.get("managerRemarks") is not None and resp.get("managerRemarks") != "":
                        new_k["managerRemarks"] = resp.get("managerRemarks")
                        new_k["manager_remark"] = resp.get("managerRemarks")
                
                new_kpis.append(new_k)
            new_cat["kpis"] = new_kpis
        updated_categories.append(new_cat)
    return updated_categories

def extract_kpi_responses_from_metrics_data(metrics_data):
    if not metrics_data:
        return {}
    if isinstance(metrics_data, dict):
        if "responses" in metrics_data and isinstance(metrics_data["responses"], dict):
            return metrics_data["responses"]
        if "kpiResponses" in metrics_data and isinstance(metrics_data["kpiResponses"], dict):
            return metrics_data["kpiResponses"]
        # If it's a dictionary of KPI response items
        sample_val = next(iter(metrics_data.values()), None)
        if isinstance(sample_val, dict) and ("actualValue" in sample_val or "actual_value" in sample_val or "earnedScore" in sample_val or "earned_score" in sample_val):
            return metrics_data
        if "categories" in metrics_data and isinstance(metrics_data["categories"], list):
            return extract_kpi_responses_from_metrics_data(metrics_data["categories"])
    if isinstance(metrics_data, list):
        res = {}
        for cat in metrics_data:
            if isinstance(cat, dict) and "kpis" in cat and isinstance(cat["kpis"], list):
                for kpi in cat["kpis"]:
                    if isinstance(kpi, dict):
                        k_id = str(kpi.get("id") or kpi.get("name") or "")
                        if k_id:
                            actual_val = kpi.get("actualValue", kpi.get("actual_value", ""))
                            earned_sc = kpi.get("earnedScore", kpi.get("earned_score", 0))
                            emp_rem = kpi.get("employeeRemarks", kpi.get("employee_remarks", kpi.get("employee_remark", "")))
                            is_insufficient = bool(kpi.get("isInsufficient", kpi.get("is_insufficient", False)))
                            mgr_act = kpi.get("managerActualValue", kpi.get("manager_actual_pm", ""))
                            mgr_sc = kpi.get("managerScore", kpi.get("manager_score"))
                            mgr_rem = kpi.get("managerRemarks", kpi.get("manager_remark", ""))
                            item_obj = {
                                "kpiId": k_id,
                                "name": kpi.get("name", ""),
                                "actualValue": actual_val,
                                "achievementPercentage": kpi.get("achievementPercentage", kpi.get("achievement_percentage", 0)),
                                "earnedScore": earned_sc,
                                "employeeRemarks": emp_rem,
                                "isInsufficient": is_insufficient,
                                "is_insufficient": is_insufficient,
                                "managerActualValue": mgr_act,
                                "managerScore": mgr_sc,
                                "managerRemarks": mgr_rem
                            }
                            res[k_id] = item_obj
                            if kpi.get("name"):
                                res[kpi.get("name")] = item_obj
        return res
    return {}


@performance_bp.route("/evaluation/monthly-productivity-export", methods=["GET"])
@auth_required
def export_monthly_productivity():
    try:
        from models.attendance import Attendance
        from models.employee import Employee
        from models.user import User
        from models.kpi_evaluation import KpiEvaluation
        from utils.jwt_helper import get_jwt_identity
        import calendar

        jwt_uid = get_jwt_identity()
        current_user_id = int(jwt_uid) if jwt_uid else getattr(request, "user_id", None)
        curr_user = User.query.get(current_user_id) if current_user_id else None
        curr_emp = Employee.query.filter_by(user_id=current_user_id).first() if current_user_id else None

        is_hr_or_admin = False
        if curr_user and curr_user.role and curr_user.role.name in ["Admin", "HR", "Super Admin"]:
            is_hr_or_admin = True

        manager_names = []
        manager_emp_ids = []
        if curr_emp:
            full_name = f"{curr_emp.first_name or ''} {curr_emp.last_name or ''}".strip()
            if full_name:
                manager_names.append(full_name.lower())
            if curr_emp.employee_id:
                manager_emp_ids.append(str(curr_emp.employee_id).strip())
        if curr_user:
            user_fn = getattr(curr_user, "full_name", None) or getattr(curr_user, "name", None)
            if user_fn:
                manager_names.append(str(user_fn).strip().lower())

        period_type = (request.args.get("period_type") or "monthly").strip().lower()
        month_str = request.args.get("month")
        year_str = request.args.get("year")
        week_str = request.args.get("week")
        quarter_str = request.args.get("quarter")

        now = datetime.now()
        month = int(month_str) if month_str and month_str.isdigit() else now.month
        year = int(year_str) if year_str and year_str.isdigit() else now.year
        week = int(week_str) if week_str and week_str.isdigit() else 1
        quarter = int(quarter_str) if quarter_str and quarter_str.isdigit() else (1 if month in [4,5,6] else 2 if month in [7,8,9] else 3 if month in [10,11,12] else 4)

        from datetime import date, timedelta
        import calendar

        if period_type == "weekly":
            num_days = calendar.monthrange(year, month)[1]
            w_starts = [1, 8, 15, 22, 29]
            w_ends = [7, 14, 21, 28, num_days]
            w_idx = min(max(week - 1, 0), len(w_starts) - 1)
            start_date = date(year, month, w_starts[w_idx])
            end_date = date(year, month, min(w_ends[w_idx], num_days))
            period_label = f"Week {week} ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m/%Y')})"
        elif period_type == "quarterly":
            if quarter == 1:
                start_date, end_date, period_label = date(year, 4, 1), date(year, 6, 30), f"Q1 (Apr - Jun) {year}"
            elif quarter == 2:
                start_date, end_date, period_label = date(year, 7, 1), date(year, 9, 30), f"Q2 (Jul - Sep) {year}"
            elif quarter == 3:
                start_date, end_date, period_label = date(year, 10, 1), date(year, 12, 31), f"Q3 (Oct - Dec) {year}"
            else:
                start_date, end_date, period_label = date(year + 1, 1, 1), date(year + 1, 3, 31), f"Q4 (Jan - Mar) {year + 1}"
        elif period_type == "yearly":
            start_date, end_date, period_label = date(year, 4, 1), date(year + 1, 3, 31), f"FY {year}-{year+1}"
        else: # monthly
            num_days = calendar.monthrange(year, month)[1]
            start_date = date(year, month, 1)
            end_date = date(year, month, num_days)
            period_label = f"{calendar.month_name[month]} {year}"

        month_name = calendar.month_name[month]

        # Query all evaluations
        all_evals = KpiEvaluation.query.all()
        scoped_evals = []
        for ev in all_evals:
            if is_hr_or_admin:
                scoped_evals.append(ev)
                continue
            rep_mgr = (ev.reporting_manager or "").strip().lower()
            mgr_id = str(ev.reporting_manager_id or ev.manager_id or "").strip()
            if any(m in rep_mgr for m in manager_names if m) or (mgr_id and mgr_id in manager_emp_ids):
                scoped_evals.append(ev)

        emp_ids = list({ev.employee_id for ev in scoped_evals if ev.employee_id})
        emp_records = Employee.query.filter(Employee.employee_id.in_(emp_ids)).all() if emp_ids else []
        emp_map = {e.employee_id: e for e in emp_records}
        user_ids = [e.user_id for e in emp_records if e.user_id]

        att_records = Attendance.query.filter(
            Attendance.user_id.in_(user_ids),
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date
        ).all() if user_ids else []

        att_by_user = {}
        for a in att_records:
            att_by_user.setdefault(a.user_id, []).append(a)

        # Build team-wise report
        from models.holiday import Holiday
        from models.leave import LeaveRequest
        from datetime import date, timedelta

        def is_date_week_off(d):
            if d.weekday() == 6:
                return True
            if d.weekday() == 5:
                sat_count = 0
                for day_num in range(1, d.day + 1):
                    if date(d.year, d.month, day_num).weekday() == 5:
                        sat_count += 1
                return sat_count in [2, 4]
            return False

        hols = Holiday.query.filter(Holiday.date >= start_date, Holiday.date <= end_date).all()
        holiday_dates = {h.date for h in hols}

        week_off_dates = set()
        cur_d = start_date
        while cur_d <= end_date:
            if is_date_week_off(cur_d) and cur_d not in holiday_dates:
                week_off_dates.add(cur_d)
            cur_d += timedelta(days=1)

        total_holidays = len(holiday_dates)
        total_weekoffs = len(week_off_dates)

        teams_data = {}
        for ev in scoped_evals:
            t_name = (ev.team_name or "General Team").strip()
            emp = emp_map.get(ev.employee_id)
            user_id = emp.user_id if emp else None

            # Calculate present days and absent days (including approved leaves)
            user_atts = att_by_user.get(user_id, [])
            present_days = 0.0
            absent_days = 0.0
            recorded_dates = set()

            for a in user_atts:
                recorded_dates.add(a.attendance_date)
                st = (a.status or "").strip().lower()
                if st == "present":
                    present_days += 1.0
                elif st in ["half day", "half-day", "halfday"]:
                    present_days += 0.5
                    absent_days += 0.5
                elif st in ["absent", "lop", "leave", "pl", "cl", "sl", "cl/sl"]:
                    absent_days += 1.0

            # Include approved leaves from LeaveRequest for any unrecorded days in attendance
            if emp:
                leaves = LeaveRequest.query.filter(
                    LeaveRequest.employee_id == str(emp.employee_id),
                    LeaveRequest.from_date <= end_date,
                    LeaveRequest.to_date >= start_date,
                    LeaveRequest.status.ilike("%approve%")
                ).all()

                for l in leaves:
                    cur_l = max(l.from_date, start_date)
                    end_l = min(l.to_date, end_date)
                    while cur_l <= end_l:
                        if cur_l not in holiday_dates and not is_date_week_off(cur_l):
                            if cur_l not in recorded_dates:
                                absent_days += float(l.total_days if l.from_date == l.to_date else 1.0)
                                recorded_dates.add(cur_l)
                        cur_l += timedelta(days=1)

            m_data = ev.metrics_data or {}
            cats = m_data.get("categories", [])
            daily_records = m_data.get("daily_records", [])
            weekly_records = m_data.get("weekly_records", [])

            period_daily = [d for d in daily_records if d.get("date") and start_date <= date.fromisoformat(d.get("date")) <= end_date]
            period_weekly = [w for w in weekly_records if w.get("startDate") and w.get("endDate") and date.fromisoformat(w.get("startDate")) <= end_date and date.fromisoformat(w.get("endDate")) >= start_date]

            # Find name frequency across categories to disambiguate duplicates
            all_kpi_names = []
            for c in cats:
                for k in c.get("kpis", []):
                    kn = (k.get("name") or "").strip()
                    if kn:
                        all_kpi_names.append(kn)
            name_counts = {n: all_kpi_names.count(n) for n in all_kpi_names}

            # Helper to extract actual number
            def extract_num(val):
                if val is None or val == "":
                    return 0.0
                try:
                    return float(val)
                except (ValueError, TypeError):
                    s = str(val).strip().rstrip("%").lstrip("<>=")
                    try:
                        return float(s)
                    except Exception:
                        return 0.0

            deliverables_map = {}
            for c in cats:
                c_name = (c.get("name") or "").strip()
                for k in c.get("kpis", []):
                    k_id = k.get("id")
                    k_name = (k.get("name") or "").strip()
                    if not k_name:
                        continue

                    label = f"{c_name} - {k_name}" if name_counts.get(k_name, 0) > 1 else k_name
                    raw_tgt = str(k.get("targetFromManager") or k.get("targetValue") or "0").strip()
                    base_num = extract_num(raw_tgt)

                    # Determine multiplier for target in this period
                    if period_daily:
                        multiplier = present_days if present_days > 0 else float(len(period_daily))
                    elif period_weekly:
                        multiplier = float(len(period_weekly))
                    else:
                        if period_type == "weekly":
                            multiplier = 1.0
                        elif period_type == "monthly":
                            multiplier = 4.0
                        elif period_type == "quarterly":
                            multiplier = 13.0
                        else:
                            multiplier = 52.0

                    total_tgt = round(base_num * multiplier, 1)

                    # Sum completed across the period
                    completed_val = 0.0
                    if period_daily:
                        for d in period_daily:
                            entries = d.get("kpiEntries") or {}
                            entry = entries.get(k_id) or entries.get(k_name) or {}
                            v = entry.get("managerActualValue")
                            if v is None or v == "":
                                v = entry.get("manager_actual_pm")
                            if v is None or v == "":
                                v = entry.get("actualValue", entry.get("actual_value", 0))
                            completed_val += extract_num(v)
                    elif period_weekly:
                        for w in period_weekly:
                            entries = w.get("kpiEntries") or {}
                            entry = entries.get(k_id) or entries.get(k_name) or {}
                            v = entry.get("managerActualValue")
                            if v is None or v == "":
                                v = entry.get("manager_actual_pm")
                            if v is None or v == "":
                                v = entry.get("actualValue", entry.get("actual_value", 0))
                            completed_val += extract_num(v)

                    deliverables_map[label] = {
                        "name": k_name,
                        "category": c_name,
                        "unit": k.get("unit", ""),
                        "total": total_tgt,
                        "completed": round(completed_val, 1),
                        "actual": round(completed_val, 1)
                    }

            # Calculate average score for this period
            scores_list = []
            if period_daily:
                for d in period_daily:
                    s = d.get("managerScore")
                    if s is None or s == "":
                        s = d.get("employeeScore")
                    if s is not None and s != "":
                        try:
                            scores_list.append(float(str(s).rstrip("%")))
                        except Exception:
                            pass
            elif period_weekly:
                for w in period_weekly:
                    s = w.get("managerScore")
                    if s is None or s == "":
                        s = w.get("employeeScore")
                    if s is not None and s != "":
                        try:
                            scores_list.append(float(str(s).rstrip("%")))
                        except Exception:
                            pass

            if scores_list:
                emp_avg_score = round(sum(scores_list) / len(scores_list), 1)
            else:
                fallback_s = ev.manager_score or ev.earned_score or ev.employee_overall_score or 0
                try:
                    emp_avg_score = round(float(fallback_s), 1)
                except Exception:
                    emp_avg_score = 0.0

            emp_row = {
                "employee_id": ev.employee_id or "",
                "employee_name": ev.employee_name or (f"{emp.first_name} {emp.last_name}" if emp else "Unknown"),
                "designation": emp.designation or "Team Member" if emp else "Team Member",
                "team_name": t_name,
                "month_name": month_name,
                "year": year,
                "period_label": period_label,
                "present_days": present_days,
                "absent_days": absent_days,
                "week_off_days": total_weekoffs,
                "holiday_days": total_holidays,
                "deliverables": deliverables_map,
                "all_deliverables": deliverables_map,
                "average_score": emp_avg_score
            }

            teams_data.setdefault(t_name, []).append(emp_row)

        format_type = request.args.get("format", "excel")
        if format_type == "json":
            return jsonify({
                "success": True,
                "period_type": period_type,
                "period_label": period_label,
                "month": month,
                "month_name": month_name,
                "year": year,
                "teams": teams_data
            })

        if not teams_data:
            return jsonify({
                "success": False,
                "error": f"No employee evaluation records found for {period_label}."
            }), 404

        from io import BytesIO
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
        from openpyxl.utils import get_column_letter
        from io import BytesIO
        from utils.compat import send_file

        wb = Workbook()
        wb.remove(wb.active)

        # Brand colors matching PeopleHub attendance styling
        header_fill = PatternFill(fill_type="solid", fgColor="1F7A8C")
        sub_header_fill = PatternFill(fill_type="solid", fgColor="288B9E")
        total_fill = PatternFill(fill_type="solid", fgColor="F0FDFA")
        zebra_fill = PatternFill(fill_type="solid", fgColor="F8FAFC")

        header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        sub_header_font = Font(name="Calibri", size=9.5, bold=True, color="FFFFFF")
        regular_font = Font(name="Calibri", size=10, bold=False, color="1E293B")
        total_font = Font(name="Calibri", size=10, bold=True, color="0F172A")

        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )
        total_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="94A3B8"),
            bottom=Side(style="double", color="0F766E")
        )

        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align = Alignment(horizontal="left", vertical="center")

        for t_name, members in teams_data.items():
            clean_title = t_name.replace(":", "_").replace("/", "_").replace("\\", "_")[:31]
            ws = wb.create_sheet(title=clean_title)
            ws.views.sheetView[0].showGridLines = True
            ws.row_dimensions[1].height = 28
            ws.row_dimensions[2].height = 22

            # Distinct deliverable labels in insertion order
            d_labels = []
            for m in members:
                for dl in m.get("deliverables", {}).keys():
                    if dl not in d_labels:
                        d_labels.append(dl)

            base_cols = [
                "S.No",
                "Emp Code",
                "Emp Name",
                "Designation",
                "Team",
                "Period",
                "Present Days",
                "Absent Days",
                "Week Off",
                "Company Holidays"
            ]

            # 1. Base columns (vertically merged across rows 1 & 2)
            col_idx = 1
            for bcol in base_cols:
                ws.merge_cells(start_row=1, start_column=col_idx, end_row=2, end_column=col_idx)
                ws.cell(row=1, column=col_idx, value=bcol)
                col_idx += 1

            # 2. Deliverable columns: Top row = Deliverable name (merged 2 cols), Sub row = Total, Completed
            for dl in d_labels:
                c_start = col_idx
                c_end = col_idx + 1
                ws.merge_cells(start_row=1, start_column=c_start, end_row=1, end_column=c_end)
                ws.cell(row=1, column=c_start, value=dl)
                ws.cell(row=2, column=c_start, value="Total")
                ws.cell(row=2, column=c_end, value="Completed")
                col_idx += 2

            # 3. Final column: Total Average Score (%) vertically merged across rows 1 & 2
            score_col_idx = col_idx
            ws.merge_cells(start_row=1, start_column=score_col_idx, end_row=2, end_column=score_col_idx)
            ws.cell(row=1, column=score_col_idx, value="Total Average Score")

            # Apply styling to all header cells in Rows 1 & 2
            for r in [1, 2]:
                for c in range(1, score_col_idx + 1):
                    cell = ws.cell(row=r, column=c)
                    cell.fill = header_fill if r == 1 else sub_header_fill
                    cell.font = header_font if r == 1 else sub_header_font
                    cell.alignment = center_align
                    cell.border = thin_border

            # Data rows (starting from row 3)
            for idx, m in enumerate(members, start=1):
                r_idx = idx + 2
                row_vals = [
                    idx,
                    m.get("employee_id", ""),
                    m.get("employee_name", ""),
                    m.get("designation", ""),
                    m.get("team_name", ""),
                    m.get("period_label", period_label),
                    m.get("present_days", 0),
                    m.get("absent_days", 0),
                    m.get("week_off_days", 0),
                    m.get("holiday_days", 0)
                ]
                for dl in d_labels:
                    d_info = m.get("deliverables", {}).get(dl, {})
                    row_vals.append(d_info.get("total", 0))
                    row_vals.append(d_info.get("completed", 0))

                # Total Average Score
                row_vals.append(f"{m.get('average_score', 0.0)}%")

                ws.append(row_vals)
                ws.row_dimensions[r_idx].height = 24
                is_even = (r_idx % 2 == 0)

                for c in range(1, len(row_vals) + 1):
                    cell = ws.cell(row=r_idx, column=c)
                    cell.font = regular_font
                    cell.border = thin_border
                    if not is_even:
                        cell.fill = zebra_fill
                    if c in [3, 4, 5]: # Name, Designation, Team
                        cell.alignment = left_align
                    else:
                        cell.alignment = center_align

            # Summary Total Row
            tot_row_idx = len(members) + 3
            tot_present = sum(m.get("present_days", 0) for m in members)
            tot_absent = sum(m.get("absent_days", 0) for m in members)
            tot_weekoff = sum(m.get("week_off_days", 0) for m in members)
            tot_holiday = sum(m.get("holiday_days", 0) for m in members)
            team_avg_score = round(sum(m.get("average_score", 0.0) for m in members) / len(members), 1) if members else 0.0

            tot_vals = [
                "",
                "",
                "TEAM TOTAL",
                "",
                t_name,
                period_label,
                round(tot_present, 1),
                round(tot_absent, 1),
                round(tot_weekoff, 1),
                round(tot_holiday, 1)
            ]
            for dl in d_labels:
                sum_total = sum(m.get("deliverables", {}).get(dl, {}).get("total", 0) for m in members)
                sum_comp = sum(m.get("deliverables", {}).get(dl, {}).get("completed", 0) for m in members)
                tot_vals.append(round(sum_total, 1))
                tot_vals.append(round(sum_comp, 1))

            tot_vals.append(f"{team_avg_score}%")

            ws.append(tot_vals)
            ws.row_dimensions[tot_row_idx].height = 26

            for c in range(1, len(tot_vals) + 1):
                cell = ws.cell(row=tot_row_idx, column=c)
                cell.fill = total_fill
                cell.font = total_font
                cell.border = total_border
                if c in [3, 4, 5]:
                    cell.alignment = left_align
                else:
                    cell.alignment = center_align

            # Auto fit column widths
            for col in ws.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    v_str = str(cell.value or "")
                    if "\n" in v_str:
                        max_len = max(max_len, max(len(line) for line in v_str.split("\n")))
                    else:
                        max_len = max(max_len, len(v_str))
                ws.column_dimensions[col_letter].width = max(max_len + 4, 12)

            ws.freeze_panes = "A3"

        output = BytesIO()
        wb.save(output)
        output.seek(0)

        safe_label = period_label.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "-").replace("\\", "_")
        filename = f"Productivity_Report_{safe_label}.xlsx"
        return send_file(
            output,
            as_attachment=True,
            download_name=filename,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500




@performance_bp.route("/evaluation/rankings-export", methods=["GET"])
def export_rankings_matrix():
    """
    Exports Neat Team-wise Daily Evaluation Matrix for Top Performers (Weekly, Monthly, Quarterly, Yearly).
    Matching PeopleHub Executive Teal styling (#1F7A8C), frozen panes at A3, daily score columns,
    Average Score (%), Present Days, and Absent Days (including approved leaves), with Team Summary Total row.
    Strictly scoped to the manager's assigned teams and evaluations using employee_id and manager_id.
    """
    try:
        from models.employee import Employee
        from models.user import User
        from models.kpi_evaluation import KpiEvaluation
        from models.attendance import Attendance
        from models.holiday import Holiday
        from models.leave import LeaveRequest
        import calendar
        from datetime import datetime, date, timedelta
        from openpyxl import Workbook
        from openpyxl.styles import Font, PatternFill, Border, Side, Alignment
        from openpyxl.utils import get_column_letter
        from io import BytesIO
        from utils.compat import send_file
        from utils.jwt_helper import get_jwt_identity

        period_type = (request.args.get("period_type") or "weekly").lower().strip()
        year_str = request.args.get("year")
        month_str = request.args.get("month")
        week_str = request.args.get("week")
        quarter_str = request.args.get("quarter")
        selected_team_param = (request.args.get("team") or request.args.get("team_name") or request.args.get("team_id") or "").strip()

        now = datetime.now()
        cur_year = int(year_str) if year_str and year_str.isdigit() else now.year
        cur_month = int(month_str) if month_str and month_str.isdigit() else now.month

        # Calculate exact start_date and end_date based on period_type
        if period_type == "weekly":
            w_num = int(week_str) if week_str and week_str.isdigit() else 1
            max_d = calendar.monthrange(cur_year, cur_month)[1]
            if w_num == 1:
                s_day, e_day = 1, min(7, max_d)
            elif w_num == 2:
                s_day, e_day = 8, min(14, max_d)
            elif w_num == 3:
                s_day, e_day = 15, min(21, max_d)
            elif w_num == 4:
                s_day, e_day = 22, min(28, max_d)
            else:
                s_day, e_day = 29, max_d
            start_date = date(cur_year, cur_month, s_day)
            end_date = date(cur_year, cur_month, e_day)
            period_title = f"Weekly Report - Week {w_num} ({start_date.strftime('%d/%m')} - {end_date.strftime('%d/%m/%Y')})"
            period_label = f"Weekly_Report_W{w_num}_{cur_month}_{cur_year}"
        elif period_type == "monthly":
            max_d = calendar.monthrange(cur_year, cur_month)[1]
            start_date = date(cur_year, cur_month, 1)
            end_date = date(cur_year, cur_month, max_d)
            m_name = calendar.month_name[cur_month]
            period_title = f"Monthly Report - {m_name} {cur_year}"
            period_label = f"Monthly_Report_{m_name}_{cur_year}"
        elif period_type == "quarterly":
            q_num = int(quarter_str) if quarter_str and quarter_str.isdigit() else 1
            if q_num == 1:
                start_date = date(cur_year, 4, 1)
                end_date = date(cur_year, 6, 30)
                q_label = f"Q1_Apr-Jun_{cur_year}"
            elif q_num == 2:
                start_date = date(cur_year, 7, 1)
                end_date = date(cur_year, 9, 30)
                q_label = f"Q2_Jul-Sep_{cur_year}"
            elif q_num == 3:
                start_date = date(cur_year, 10, 1)
                end_date = date(cur_year, 12, 31)
                q_label = f"Q3_Oct-Dec_{cur_year}"
            else:
                start_date = date(cur_year + 1, 1, 1)
                end_date = date(cur_year + 1, 3, 31)
                q_label = f"Q4_Jan-Mar_{cur_year + 1}"
            period_title = f"Quarterly Report - {q_label}"
            period_label = f"Quarterly_Report_{q_label}"
        elif period_type == "yearly":
            start_date = date(cur_year, 4, 1)
            end_date = date(cur_year + 1, 3, 31)
            period_title = f"Annual Report (FY {cur_year}-{cur_year + 1})"
            period_label = f"Annual_Report_FY{cur_year}-{cur_year + 1}"
        else:
            max_d = calendar.monthrange(cur_year, cur_month)[1]
            start_date = date(cur_year, cur_month, 1)
            end_date = date(cur_year, cur_month, max_d)
            m_name = calendar.month_name[cur_month]
            period_title = f"Monthly Report - {m_name} {cur_year}"
            period_label = f"Monthly_Report_{m_name}_{cur_year}"

        # Calendar columns: dates within range (skip Sundays for clean reading)
        cur_d = start_date
        date_cols = []
        while cur_d <= end_date:
            if cur_d.weekday() != 6:  # Skip Sundays
                date_cols.append(cur_d.strftime("%Y-%m-%d"))
            cur_d += timedelta(days=1)

        # Scoping logic: accurately filter by employee_id and manager_id
        jwt_uid = get_jwt_identity()
        current_user_id = int(jwt_uid) if jwt_uid else getattr(request, "user_id", None)
        current_user = User.query.filter_by(id=current_user_id).first() if current_user_id else None
        caller_role = (current_user.role.name if (current_user and current_user.role) else "").lower()
        is_admin_scope = any(x in caller_role for x in ["super admin", "admin", "management", "coo"])

        # Fetch evaluations scoped strictly to caller's manager assignments
        if is_admin_scope or not current_user:
            eval_list = KpiEvaluation.query.all()
        else:
            mgr_emp = Employee.query.filter_by(user_id=current_user.id).first()
            mgr_emp_id = str(mgr_emp.employee_id) if mgr_emp and mgr_emp.employee_id else ""
            mgr_user_id = str(current_user.id)
            mgr_name = f"{mgr_emp.first_name or ''} {mgr_emp.last_name or ''}".strip() if mgr_emp else ""

            manager_identifiers = [mgr_user_id]
            if mgr_emp_id:
                manager_identifiers.append(mgr_emp_id)

            from sqlalchemy import or_

            # Upward/Downward hierarchy traversal:
            # Collect all recursive downline subordinates under this manager
            downline_emp_ids = set()
            if mgr_emp:
                visited_emps = set()
                queue = [mgr_emp]
                while queue:
                    curr_m = queue.pop(0)
                    c_id = str(curr_m.employee_id)
                    if c_id in visited_emps:
                        continue
                    visited_emps.add(c_id)
                    if c_id != str(mgr_emp.employee_id):
                        downline_emp_ids.add(c_id)
                    fn = (curr_m.first_name or "").strip()
                    ln = (curr_m.last_name or "").strip()
                    full_n = f"{fn} {ln}".strip()
                    
                    sub_conds = []
                    if c_id:
                        sub_conds.append(Employee.reporting_manager == c_id)
                    if full_n:
                        sub_conds.append(Employee.reporting_manager.ilike(f"%{full_n}%"))
                    if sub_conds:
                        subs = Employee.query.filter(or_(*sub_conds)).all()
                        for s in subs:
                            if str(s.employee_id) not in visited_emps:
                                queue.append(s)

            eval_filters = [
                KpiEvaluation.manager_id.in_(manager_identifiers),
                KpiEvaluation.reporting_manager_id.in_(manager_identifiers),
            ]
            if mgr_name:
                eval_filters.append(KpiEvaluation.reporting_manager.ilike(f"%{mgr_name}%"))
            if downline_emp_ids:
                eval_filters.append(KpiEvaluation.employee_id.in_(list(downline_emp_ids)))

            eval_list = KpiEvaluation.query.filter(or_(*eval_filters)).all()

        # Build list of active employee IDs from the scoped evaluations
        scoped_emp_codes = set()
        for ke in eval_list:
            if ke.employee_id:
                scoped_emp_codes.add(str(ke.employee_id))

        if is_admin_scope or not current_user:
            employees = Employee.query.order_by(Employee.department, Employee.first_name).all()
        else:
            if scoped_emp_codes:
                employees = Employee.query.filter(
                    (Employee.employee_id.in_(scoped_emp_codes)) |
                    (Employee.id.in_([int(c) for c in scoped_emp_codes if c.isdigit()]))
                ).order_by(Employee.department, Employee.first_name).all()
            else:
                employees = []

        emp_by_code = {str(e.employee_id): e for e in employees if e.employee_id}
        for e in employees:
            emp_by_code[str(e.id)] = e

        # Attendance calculation helpers
        def is_date_week_off(d):
            if d.weekday() == 6:
                return True
            if d.weekday() == 5:
                sat_count = 0
                for day_num in range(1, d.day + 1):
                    if date(d.year, d.month, day_num).weekday() == 5:
                        sat_count += 1
                return sat_count in [2, 4]
            return False

        hols = Holiday.query.filter(Holiday.date >= start_date, Holiday.date <= end_date).all()
        holiday_dates = {h.date for h in hols}

        user_ids = [e.user_id for e in employees if e.user_id]
        attendances = Attendance.query.filter(
            Attendance.user_id.in_(user_ids),
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date
        ).all() if user_ids else []

        att_by_user = {}
        for a in attendances:
            att_by_user.setdefault(a.user_id, []).append(a)

        # Build employee records grouped STRICTLY by the evaluation team_name
        emp_records_by_team = {}
        emp_lookup = {}

        # First, organize by scoped evaluations so each team has its exact assigned members
        processed_emp_team_pairs = set()

        for ke in eval_list:
            emp = emp_by_code.get(str(ke.employee_id))
            emp_code = str(ke.employee_id)
            team_val = (ke.team_name or "").strip()
            if not team_val:
                team_val = getattr(emp.team, "name", None) or (str(emp.team) if emp and emp.team else "Team") if emp else "Team"

            pair_key = (emp_code, team_val)
            if pair_key in processed_emp_team_pairs:
                continue
            processed_emp_team_pairs.add(pair_key)

            if emp:
                fn = emp.first_name or ""
                ln = emp.last_name or ""
                full_name = f"{fn} {ln}".strip() or ke.employee_name or f"Employee {emp_code}"
                dept = emp.department or team_val
                user_id = emp.user_id
            else:
                full_name = ke.employee_name or f"Employee {emp_code}"
                dept = team_val
                user_id = None

            # Attendance calculation
            user_atts = att_by_user.get(user_id, []) if user_id else []
            present_days = 0.0
            absent_days = 0.0
            recorded_dates = set()

            for a in user_atts:
                recorded_dates.add(a.attendance_date)
                st = (a.status or "").strip().lower()
                if st == "present":
                    present_days += 1.0
                elif st in ["half day", "half-day", "halfday"]:
                    present_days += 0.5
                    absent_days += 0.5
                elif st in ["absent", "lop", "leave", "pl", "cl", "sl", "cl/sl"]:
                    absent_days += 1.0

            # Approved leaves from LeaveRequest
            if emp:
                leaves = LeaveRequest.query.filter(
                    LeaveRequest.employee_id == str(emp.employee_id),
                    LeaveRequest.from_date <= end_date,
                    LeaveRequest.to_date >= start_date,
                    LeaveRequest.status.ilike("%approve%")
                ).all()

                for l in leaves:
                    cur_l = max(l.from_date, start_date)
                    end_l = min(l.to_date, end_date)
                    while cur_l <= end_l:
                        if cur_l not in holiday_dates and not is_date_week_off(cur_l):
                            if cur_l not in recorded_dates:
                                absent_days += float(l.total_days if l.from_date == l.to_date else 1.0)
                                recorded_dates.add(cur_l)
                        cur_l += timedelta(days=1)

            rep_mgr = (getattr(ke, 'reporting_manager', None) or (getattr(emp, 'reporting_manager', None) if emp else None) or "").strip()
            rec = {
                "emp_obj": emp,
                "dept": dept,
                "team": team_val,
                "name": full_name,
                "code": emp_code,
                "reporting_manager": rep_mgr,
                "present_days": present_days,
                "absent_days": absent_days,
                "daily_scores": {},
            }

            emp_records_by_team.setdefault(team_val, []).append(rec)
            emp_lookup[(emp_code, team_val)] = rec
            emp_lookup[emp_code] = rec

        # Aggregate daily scores from the evaluation records
        for ke in eval_list:
            emp_code = str(ke.employee_id)
            team_val = (ke.team_name or "").strip()
            emp_rec = emp_lookup.get((emp_code, team_val)) or emp_lookup.get(emp_code)
            if not emp_rec:
                continue
            if not emp_rec.get("reporting_manager") and getattr(ke, "reporting_manager", None):
                emp_rec["reporting_manager"] = str(ke.reporting_manager).strip()

            m_data = ke.metrics_data
            if isinstance(m_data, str):
                try:
                    m_data = json.loads(m_data)
                except Exception:
                    m_data = {}

            # 1. Process daily_records (for daily cadence evaluations)
            daily_recs = m_data.get("daily_records", []) if isinstance(m_data, dict) else []
            if isinstance(daily_recs, list):
                for d in daily_recs:
                    d_str = d.get("date")
                    if not d_str or d_str not in date_cols:
                        continue
                    status = d.get("status")
                    mgr_sc = d.get("managerScore")
                    emp_sc = d.get("employeeScore") or d.get("earnedScore")
                    if status in ["manager_approved", "approved"] or (mgr_sc is not None and float(mgr_sc) > 0):
                        score = float(mgr_sc if mgr_sc is not None else emp_sc or 0)
                        emp_rec["daily_scores"][d_str] = round(score, 2)
                    elif status in ["submitted_to_manager", "submitted"]:
                        emp_rec["daily_scores"][d_str] = "Approval needed"
                    else:
                        if d_str not in emp_rec["daily_scores"]:
                            emp_rec["daily_scores"][d_str] = "Not Filled"

            # 2. Process weekly_records (for weekly cadence evaluations like Media & Qbend teams)
            weekly_recs = m_data.get("weekly_records", []) if isinstance(m_data, dict) else []
            if isinstance(weekly_recs, list):
                for w in weekly_recs:
                    w_start_str = w.get("startDate")
                    w_end_str = w.get("endDate")
                    if not w_start_str or not w_end_str:
                        continue
                    try:
                        ws_d = date.fromisoformat(w_start_str)
                        we_d = date.fromisoformat(w_end_str)
                    except Exception:
                        continue

                    status = w.get("status")
                    mgr_sc = w.get("managerScore")
                    emp_sc = w.get("employeeScore") or w.get("earnedScore")
                    if status in ["manager_approved", "approved"] or (mgr_sc is not None and float(mgr_sc) > 0):
                        w_val = round(float(mgr_sc if mgr_sc is not None else emp_sc or 0), 2)
                    elif status in ["submitted_to_manager", "submitted"]:
                        w_val = "Approval needed"
                    else:
                        w_val = "Not Filled"

                    for d_str in date_cols:
                        try:
                            dt = date.fromisoformat(d_str)
                            if ws_d <= dt <= we_d:
                                # Prioritize daily score if already present, otherwise set weekly score
                                if d_str not in emp_rec["daily_scores"] or emp_rec["daily_scores"][d_str] == "Not Filled":
                                    emp_rec["daily_scores"][d_str] = w_val
                        except Exception:
                            pass

            # 3. Process periodic / monthly / quarterly / annual evaluations
            # If evaluation period overlaps with requested period (e.g. October monthly, Q3 quarterly)
            from_d = ke.from_date
            to_d = ke.to_date
            if from_d and to_d and not (to_d < start_date or from_d > end_date):
                eff_to = min(to_d, end_date)
                if eff_to < end_date and to_d.month == end_date.month and to_d.year == end_date.year:
                    eff_to = end_date

                st = str(ke.status or "").lower().strip()
                mgr_sc = ke.manager_score
                emp_sc = ke.employee_overall_score
                is_appr = (st in ["manager_approved", "approved", "completed"]) or (mgr_sc is not None and float(mgr_sc) > 0)
                is_subm = (st in ["submitted_to_manager", "submitted", "manager_review"]) or ("submit" in st)

                if is_appr:
                    period_val = round(float(mgr_sc if mgr_sc is not None else emp_sc or 0), 2)
                elif is_subm:
                    period_val = "Approval needed"
                else:
                    period_val = "Not Filled"

                for d_str in date_cols:
                    try:
                        dt = date.fromisoformat(d_str)
                        if from_d <= dt <= eff_to:
                            # Set if no score yet or currently Not Filled
                            cur_val = emp_rec["daily_scores"].get(d_str)
                            if cur_val is None or cur_val == "" or (cur_val == "Not Filled" and period_val != "Not Filled"):
                                emp_rec["daily_scores"][d_str] = period_val
                    except Exception:
                        pass

        # Initialize Workbook with Executive Teal UI styling matching previous export
        wb = Workbook()
        wb.remove(wb.active)  # remove default sheet

        teal_header_fill = PatternFill(start_color="1F7A8C", end_color="1F7A8C", fill_type="solid")
        teal_total_fill = PatternFill(start_color="F0FDFA", end_color="F0FDFA", fill_type="solid")
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        not_filled_fill = PatternFill(start_color="FCE4D6", end_color="FCE4D6", fill_type="solid")
        approval_fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")

        header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        regular_font = Font(name="Calibri", size=10, bold=False, color="1E293B")
        score_bold_font = Font(name="Calibri", size=10, bold=True, color="0F766E")
        not_filled_font = Font(name="Calibri", size=9, bold=False, color="C00000")
        approval_font = Font(name="Calibri", size=9, bold=False, color="7F6000")
        total_font = Font(name="Calibri", size=10, bold=True, color="0F172A")

        thin_side = Side(border_style="thin", color="CBD5E1")
        data_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)
        total_border = Border(left=thin_side, right=thin_side, top=Side(style="thin", color="94A3B8"), bottom=Side(style="double", color="0F766E"))

        center_align = Alignment(horizontal="center", vertical="center", wrap_text=True)
        left_align = Alignment(horizontal="left", vertical="center")

        # Styles for Top Performers Section below TEAM TOTAL
        top_perf_header_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        top_perf_header_font = Font(name="Segoe UI Emoji", size=10, bold=True, color="1E293B")
        top_perf_rank1_font = Font(name="Segoe UI Emoji", size=10, bold=True, color="D97706")
        top_perf_rank2_font = Font(name="Segoe UI Emoji", size=10, bold=True, color="64748B")
        top_perf_rank3_font = Font(name="Segoe UI Emoji", size=10, bold=True, color="B45309")
        top_perf_regular_font = Font(name="Calibri", size=10, bold=False, color="1E293B")
        top_perf_score_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
        top_perf_box_border = Border(
            left=Side(style="thin", color="E2E8F0"),
            right=Side(style="thin", color="E2E8F0"),
            top=Side(style="thin", color="E2E8F0"),
            bottom=Side(style="thin", color="E2E8F0")
        )

        headers = ["S.No", "Department", "Team", "Emp Code", "Name Of the Employee", "Reporting Manager"] + date_cols + ["Average Score", "Composite Score", "Present Days", "Absent Days"]

        # If selected_team_param is specified, filter sheets to that team only
        teams_to_export = emp_records_by_team
        if selected_team_param and selected_team_param.lower() != "all":
            filtered_teams = {}
            for t_k, members in emp_records_by_team.items():
                if t_k.lower() == selected_team_param.lower() or selected_team_param.lower() in t_k.lower():
                    filtered_teams[t_k] = members
            if filtered_teams:
                teams_to_export = filtered_teams

        banner_title_font = Font(name="Calibri", size=13, bold=True, color="1F7A8C")
        banner_sub_font = Font(name="Calibri", size=9, italic=True, color="64748B")

        # Top Performers Summary Sheet styles (matching Image 2)
        top_sheet_header_fill = PatternFill(start_color="1F7A8C", end_color="1F7A8C", fill_type="solid")
        top_sheet_header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        top_sheet_rank_font = Font(name="Calibri", size=10, bold=True, color="1E293B")
        top_sheet_score_font = Font(name="Calibri", size=10, bold=True, color="0F766E")

        # -------------------------------------------------------------
        # 1. "Top Performers" / "All Teams" Summary Sheet (First Sheet)
        # -------------------------------------------------------------
        # Show all ranked employees across all teams with their Average Score
        all_evaluated_members = []
        for t_k, m_list in emp_records_by_team.items():
            for m in m_list:
                num_scs = [v for v in m["daily_scores"].values() if isinstance(v, (int, float))]
                avg_sc = (sum(num_scs) / len(num_scs)) if num_scs else -1.0
                m["calc_avg_score"] = avg_sc
                abs_cnt = float(m.get("absent_days", 0.0))
                m["perf_composite_score"] = round(avg_sc - (abs_cnt * 0.5), 3) if avg_sc >= 0 else -999.0
                if avg_sc >= 0:
                    all_evaluated_members.append(m)

        def all_teams_sort_key(m):
            return (
                -m["perf_composite_score"],
                m.get("absent_days", 0.0),
                -m.get("present_days", 0.0),
                m.get("name", "")
            )

        all_evaluated_members = sorted(all_evaluated_members, key=all_teams_sort_key)

        # Create Top Performers sheet as the very first sheet if "All Teams" or more than 1 team
        is_all_teams = (not selected_team_param) or (selected_team_param.lower() == "all")
        if is_all_teams:
            ws_top = wb.create_sheet(title="Top Performers")
            ws_top.views.sheetView[0].showGridLines = True

            # Row 1: Title
            cadence_display = period_type.capitalize() if period_type else "Monthly"
            ws_top.row_dimensions[1].height = 24
            ws_top.cell(1, 1, f"{period_title} — Top Performers").font = banner_title_font
            ws_top.cell(1, 1).alignment = Alignment(horizontal="left", vertical="center")

            # Row 2: Date subtitle
            ws_top.row_dimensions[2].height = 18
            ws_top.cell(2, 1, f"Evaluation Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} | Generated on {datetime.now().strftime('%Y-%m-%d')}").font = banner_sub_font
            ws_top.cell(2, 1).alignment = Alignment(horizontal="left", vertical="center")

            # Row 3: Blank separator
            ws_top.row_dimensions[3].height = 6

            # Row 4: Period Label Banner (e.g. Oct '26)
            ws_top.row_dimensions[4].height = 20
            p_cell = ws_top.cell(4, 1, start_date.strftime("%b '%y"))
            p_cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
            p_cell.fill = top_sheet_header_fill
            p_cell.alignment = Alignment(horizontal="left", vertical="center")
            for c in range(2, 7):
                ws_top.cell(4, c).fill = top_sheet_header_fill

            # Row 5: Table Header
            ws_top.row_dimensions[5].height = 26
            top_headers = ["Rank", "Employee", "Employee Code", "Department", "Team", "Average Score"]
            for c_idx, h_text in enumerate(top_headers, 1):
                h_cell = ws_top.cell(5, c_idx, h_text)
                h_cell.fill = top_sheet_header_fill
                h_cell.font = top_sheet_header_font
                h_cell.border = data_border
                h_cell.alignment = center_align if c_idx in [1, 3, 6] else left_align

            # Row 6+: Data rows
            for r_idx, m_emp in enumerate(all_evaluated_members, 1):
                row_num = 5 + r_idx
                ws_top.row_dimensions[row_num].height = 20
                is_zebra = (r_idx % 2 == 0)
                row_fill = zebra_fill if is_zebra else None

                c_rank = ws_top.cell(row_num, 1, r_idx)
                c_emp = ws_top.cell(row_num, 2, m_emp["name"])
                c_code = ws_top.cell(row_num, 3, m_emp["code"])
                c_dept = ws_top.cell(row_num, 4, m_emp["dept"])
                c_team = ws_top.cell(row_num, 5, m_emp["team"])
                c_avg = ws_top.cell(row_num, 6, f"{round(m_emp['calc_avg_score'], 2)}%")

                c_rank.font = top_sheet_rank_font
                c_emp.font = regular_font
                c_code.font = regular_font
                c_dept.font = regular_font
                c_team.font = regular_font
                c_avg.font = top_sheet_score_font

                c_rank.alignment = center_align
                c_code.alignment = center_align
                c_emp.alignment = left_align
                c_dept.alignment = left_align
                c_team.alignment = left_align
                c_avg.alignment = center_align

                for c in [c_rank, c_emp, c_code, c_dept, c_team, c_avg]:
                    c.border = data_border
                    if row_fill:
                        c.fill = row_fill

            # Auto-fit columns for Top Performers sheet
            for col in ws_top.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    v_str = str(cell.value or "")
                    max_len = max(max_len, len(v_str))
                ws_top.column_dimensions[col_letter].width = max(max_len + 4, 12)

            ws_top.column_dimensions["A"].width = 8
            ws_top.column_dimensions["B"].width = 24
            ws_top.column_dimensions["C"].width = 15
            ws_top.column_dimensions["D"].width = 22
            ws_top.column_dimensions["E"].width = 22
            ws_top.column_dimensions["F"].width = 16
            ws_top.freeze_panes = "A6"
            # Enable Excel dropdown filter on headers (Row 5)
            last_top_row = max(5 + len(all_evaluated_members), 6)
            ws_top.auto_filter.ref = f"A5:F{last_top_row}" 

        for t_name, members in teams_to_export.items():
            clean_title = t_name.replace(":", "_").replace("/", "_").replace("\\", "_")[:31]
            ws = wb.create_sheet(title=clean_title)
            ws.views.sheetView[0].showGridLines = True

            # Row 1: Period Title Banner (e.g. Monthly Performance Report - October 2026 - Project Management)
            ws.row_dimensions[1].height = 24
            ws.cell(1, 1, f"{period_title} — {t_name}").font = banner_title_font
            ws.cell(1, 1).alignment = Alignment(horizontal="left", vertical="center")

            # Row 2: Date Range & Generation Metadata
            ws.row_dimensions[2].height = 18
            ws.cell(2, 1, f"Evaluation Period: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} | Generated on {datetime.now().strftime('%Y-%m-%d')}").font = banner_sub_font
            ws.cell(2, 1).alignment = Alignment(horizontal="left", vertical="center")

            # Row 3: Empty separator row
            ws.row_dimensions[3].height = 6

            # Row 4: Table Headers
            ws.row_dimensions[4].height = 28
            for c_idx, h_text in enumerate(headers, 1):
                cell = ws.cell(4, c_idx, h_text)
                cell.fill = teal_header_fill
                cell.font = header_font
                cell.border = data_border
                cell.alignment = center_align

            # Pre-compute average numeric score and attendance-weighted performance score
            # A low absent days count gives higher merit:
            # Net Performance Score = Average Score - (Absent Days * 0.5)
            # This ensures consistent high attendance (0 absent days) ranks above equal/near-equal scores with absences!
            for m in members:
                num_scs = [v for v in m["daily_scores"].values() if isinstance(v, (int, float))]
                avg_sc = (sum(num_scs) / len(num_scs)) if num_scs else -1.0
                m["calc_avg_score"] = avg_sc
                abs_cnt = float(m.get("absent_days", 0.0))
                # Attendance penalty: 0.5 mark deduction per absent day for composite ranking
                m["perf_composite_score"] = round(avg_sc - (abs_cnt * 0.5), 3) if avg_sc >= 0 else -999.0

            # Sort members by:
            # 1. Net Performance Score (Higher score + Lower absent days ranks first)
            # 2. Absent Days (Lower absent days ranks first as tie-breaker)
            # 3. Present Days (Higher present days ranks first)
            # 4. Name (Alphabetical)
            def ranking_sort_key(m):
                return (
                    -m["perf_composite_score"],
                    m.get("absent_days", 0.0),
                    -m.get("present_days", 0.0),
                    m.get("name", "")
                )

            sorted_members = sorted(members, key=ranking_sort_key)

            all_emp_averages = []
            total_present = 0.0
            total_absent = 0.0

            row_idx = 5
            for s_idx, emp in enumerate(sorted_members, 1):
                ws.row_dimensions[row_idx].height = 20
                is_zebra = (row_idx % 2 == 1)
                row_fill = zebra_fill if is_zebra else None

                # Base fields
                c_sno = ws.cell(row_idx, 1, s_idx)
                c_dept = ws.cell(row_idx, 2, emp["dept"])
                c_team = ws.cell(row_idx, 3, emp["team"])
                c_code = ws.cell(row_idx, 4, emp["code"])
                c_name = ws.cell(row_idx, 5, emp["name"])
                c_mgr = ws.cell(row_idx, 6, emp.get("reporting_manager", "") or "—")

                c_sno.alignment = center_align
                c_code.alignment = center_align
                c_dept.alignment = left_align
                c_team.alignment = left_align
                c_name.alignment = left_align
                c_mgr.alignment = left_align

                for c in [c_sno, c_dept, c_team, c_code, c_name, c_mgr]:
                    c.font = regular_font
                    c.border = data_border
                    if row_fill:
                        c.fill = row_fill

                # Date score cells
                numeric_scores = []
                for d_idx, d_str in enumerate(date_cols, 7):
                    val = emp["daily_scores"].get(d_str, "")
                    cell = ws.cell(row_idx, d_idx)
                    cell.border = data_border

                    if isinstance(val, (int, float)):
                        cell.value = float(val)
                        cell.font = regular_font
                        cell.alignment = center_align
                        cell.number_format = "0.00"
                        if row_fill:
                            cell.fill = row_fill
                        numeric_scores.append(float(val))
                    elif val == "Approval needed":
                        cell.value = "Approval needed"
                        cell.fill = approval_fill
                        cell.font = approval_font
                        cell.alignment = center_align
                    elif val == "Not Filled":
                        cell.value = "Not Filled"
                        cell.fill = not_filled_fill
                        cell.font = not_filled_font
                        cell.alignment = center_align
                    else:
                        cell.value = ""
                        cell.font = regular_font
                        cell.alignment = center_align
                        if row_fill:
                            cell.fill = row_fill

                # Average Score Column (Column 6 + len(date_cols) + 1)
                avg_col_idx = 6 + len(date_cols) + 1
                avg_cell = ws.cell(row_idx, avg_col_idx)
                avg_cell.border = data_border
                if row_fill:
                    avg_cell.fill = row_fill

                # Composite Score Column: Average Score - (Absent Days * 0.5)
                comp_col_idx = avg_col_idx + 1
                comp_cell = ws.cell(row_idx, comp_col_idx)
                comp_cell.border = data_border
                if row_fill:
                    comp_cell.fill = row_fill

                if numeric_scores:
                    emp_avg = round(sum(numeric_scores) / len(numeric_scores), 2)
                    avg_cell.value = f"{emp_avg}%"
                    avg_cell.font = score_bold_font
                    avg_cell.alignment = center_align
                    all_emp_averages.append(emp_avg)

                    # Compute composite score
                    comp_score = round(emp_avg - (emp["absent_days"] * 0.5), 2)
                    comp_cell.value = f"{comp_score}%"
                    comp_cell.font = score_bold_font
                    comp_cell.alignment = center_align
                else:
                    avg_cell.value = "—"
                    avg_cell.font = regular_font
                    avg_cell.alignment = center_align

                    comp_cell.value = "—"
                    comp_cell.font = regular_font
                    comp_cell.alignment = center_align

                # Present Days Column
                pres_col_idx = comp_col_idx + 1
                pres_cell = ws.cell(row_idx, pres_col_idx, round(emp["present_days"], 1))
                pres_cell.font = regular_font
                pres_cell.border = data_border
                pres_cell.alignment = center_align
                if row_fill:
                    pres_cell.fill = row_fill
                total_present += emp["present_days"]

                # Absent Days Column
                abs_col_idx = pres_col_idx + 1
                abs_cell = ws.cell(row_idx, abs_col_idx, round(emp["absent_days"], 1))
                abs_cell.font = regular_font
                abs_cell.border = data_border
                abs_cell.alignment = center_align
                if row_fill:
                    abs_cell.fill = row_fill
                total_absent += emp["absent_days"]

                row_idx += 1

            # Team Total Summary Row at bottom
            tot_row_idx = row_idx
            ws.row_dimensions[tot_row_idx].height = 24
            team_avg = f"{round(sum(all_emp_averages) / len(all_emp_averages), 1)}%" if all_emp_averages else "—"

            tot_vals = ["", "", "TEAM TOTAL", "", f"{len(sorted_members)} Members", ""] + ["" for _ in date_cols] + [team_avg, "", round(total_present, 1), round(total_absent, 1)]
            for col_i, v in enumerate(tot_vals, 1):
                cell = ws.cell(tot_row_idx, col_i, v)
                cell.fill = teal_total_fill
                cell.font = total_font
                cell.border = total_border
                if col_i in [3, 5]:
                    cell.alignment = left_align
                else:
                    cell.alignment = center_align

            # Top 3 Performers section below TEAM TOTAL
            # Eligible members with evaluated scores (calc_avg_score >= 0)
            eligible_top = [m for m in sorted_members if m.get("calc_avg_score", -1.0) >= 0]
            top_3 = eligible_top[:3]

            if top_3:
                start_card_row = tot_row_idx + 2
                ws.row_dimensions[start_card_row].height = 24

                # Card Header: "Top Performers - <Team Name>" (Columns B to E)
                ws.merge_cells(start_row=start_card_row, start_column=2, end_row=start_card_row, end_column=5)
                hdr_cell = ws.cell(start_card_row, 2, f"Top Performers - {t_name}")
                hdr_cell.fill = top_perf_header_fill
                hdr_cell.font = top_perf_header_font
                hdr_cell.alignment = left_align

                for col_c in range(2, 6):
                    c = ws.cell(start_card_row, col_c)
                    c.border = top_perf_box_border
                    c.fill = top_perf_header_fill

                # Medal icons and ranks
                medals = ["🥇 1.", "🥈 2.", "🥉 3."]
                rank_fonts = [top_perf_rank1_font, top_perf_rank2_font, top_perf_rank3_font]

                for r_i, tm in enumerate(top_3):
                    cur_card_row = start_card_row + 1 + r_i
                    ws.row_dimensions[cur_card_row].height = 20

                    # Rank Medal (Column B)
                    c_medal = ws.cell(cur_card_row, 2, medals[r_i])
                    c_medal.font = rank_fonts[r_i]
                    c_medal.alignment = Alignment(horizontal="center", vertical="center")
                    c_medal.border = top_perf_box_border

                    # Employee Name (Column C)
                    c_name = ws.cell(cur_card_row, 3, tm["name"])
                    c_name.font = top_perf_regular_font
                    c_name.alignment = left_align
                    c_name.border = top_perf_box_border

                    # Average Score (Column D)
                    c_sc = ws.cell(cur_card_row, 4, f"Avg: {round(tm['calc_avg_score'], 2)}%")
                    c_sc.font = top_perf_score_font
                    c_sc.alignment = Alignment(horizontal="center", vertical="center")
                    c_sc.border = top_perf_box_border

                    # Composite Score (Column E)
                    c_comp_sc = ws.cell(cur_card_row, 5, f"Composite: {round(tm['perf_composite_score'], 2)}%")
                    c_comp_sc.font = top_perf_score_font
                    c_comp_sc.alignment = Alignment(horizontal="right", vertical="center")
                    c_comp_sc.border = top_perf_box_border

            # Column dimensions autofit
            for col in ws.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    v_str = str(cell.value or "")
                    max_len = max(max_len, len(v_str))
                ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

            ws.column_dimensions["A"].width = 7
            ws.column_dimensions["D"].width = 12
            ws.column_dimensions["E"].width = 24

            ws.freeze_panes = "G5"
            # Enable Excel dropdown filter on table headers (Row 4)
            last_member_row = max(row_idx - 1, 5)
            last_hdr_letter = get_column_letter(len(headers))
            ws.auto_filter.ref = f"A4:{last_hdr_letter}{last_member_row}" 

        out = BytesIO()
        wb.save(out)
        out.seek(0)

        team_file_part = f"_{selected_team_param.replace(' ', '_')}" if selected_team_param and selected_team_param.lower() != "all" else ""
        filename = f"{period_label}{team_file_part}.xlsx"
        return send_file(
            out,
            as_attachment=True,
            download_name=filename,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


@performance_bp.route("/evaluation/data", methods=["GET"])
def get_evaluation_data():
    try:
        eval_records, store = sync_postgres_kpi_to_store_and_back()
        db_unavailable = eval_records is None  # DB had an exception; use JSON-only fallback
        if db_unavailable:
            eval_records = []

        json_all_cycles = list(store.get("cycles", []))
        json_all_responses = [
            r for r in store.get("responses", [])
            if not r.get("is_archived")
        ]

        # 1. Dynamically build and maintain cycles directly from PostgreSQL KpiEvaluation records
        team_eval_groups = {}
        for rec in eval_records:
            t_key = rec.team_name or rec.team_id or "General"
            f_name = rec.form or "Performance Evaluation"
            f_date_str = rec.from_date.isoformat() if rec.from_date else ""
            t_date_str = rec.to_date.isoformat() if rec.to_date else ""
            freq_str = rec.frequency or "quarterly"
            mgr_id_val = str(rec.reporting_manager_id or rec.manager_id or rec.reporting_manager or "").strip()
            group_key = f"{t_key}_{f_name}_{freq_str}_{f_date_str}_{t_date_str}_{mgr_id_val}"
            
            # Extract period if encoded in description e.g. "Performance evaluation for Media (Daily (14 Sep 2026))"
            extracted_period = ""
            if rec.description and "(" in rec.description and ")" in rec.description:
                extracted_period = rec.description.split("(", 1)[1].rsplit(")", 1)[0].strip()

            if group_key not in team_eval_groups:
                team_eval_groups[group_key] = {
                    "teamName": rec.team_name or rec.team_id or "General",
                    "teamId": rec.team_id or rec.team_name or "team_general",
                    "form": f_name,
                    "frequency": freq_str,
                    "startDate": f_date_str,
                    "endDate": t_date_str,
                    "periodName": extracted_period,
                    "description": rec.description or "",
                    "managerName": rec.reporting_manager,
                    "managerId": str(rec.reporting_manager_id or rec.manager_id or ""),
                    "serviceManagerName": rec.service_manager,
                    "serviceManagerId": str(rec.service_manager_id or ""),
                    "metrics_data": rec.metrics_data,
                    "employeeIds": [],
                    "createdAt": rec.created_at.isoformat() if rec.created_at else datetime.utcnow().isoformat(),
                    "updatedAt": rec.updated_at.isoformat() if rec.updated_at else datetime.utcnow().isoformat(),
                }
            elif extracted_period and not team_eval_groups[group_key].get("periodName"):
                team_eval_groups[group_key]["periodName"] = extracted_period

            emp_id = str(rec.employee_id or "").strip()
            if emp_id and emp_id not in team_eval_groups[group_key]["employeeIds"]:
                team_eval_groups[group_key]["employeeIds"].append(emp_id)

        cycles = []
        seen_cycle_keys = set()
        seen_cycle_ids = set()

        # 1. Build cycles from PostgreSQL manager_kpi_templates where status == 'active' (sent to manager by HR)
        try:
            active_templates = ManagerKpiTemplate.query.filter(ManagerKpiTemplate.status == "active").all()
            for tpl in active_templates:
                cid = f"cycle_tpl_{tpl.id}"
                if cid not in seen_cycle_ids:
                    seen_cycle_ids.add(cid)
                    c_key = f"{tpl.team_name or tpl.team_id}_{tpl.template_name}_{tpl.manager_id}"
                    seen_cycle_keys.add(c_key)
                    tpl_mgr_name = tpl.manager_name
                    if (not tpl_mgr_name or tpl_mgr_name == "Manager" or tpl_mgr_name == "Reporting Manager") and tpl.manager_id:
                        m_emp = Employee.query.filter(Employee.employee_id == str(tpl.manager_id)).first()
                        if m_emp:
                            tpl_mgr_name = m_emp.name or f"{m_emp.first_name} {m_emp.last_name}".strip()

                    cycles.append({
                        "id": cid,
                        "name": tpl.template_name or "Performance Evaluation",
                        "form": tpl.template_name or "Performance Evaluation",
                        "frequency": "quarterly",
                        "startDate": "",
                        "endDate": "",
                        "periodName": "",
                        "description": f"Evaluation matrix for {tpl.team_name or tpl.template_name}",
                        "teamId": tpl.team_id or "",
                        "teamName": tpl.team_name or "",
                        "managerId": tpl.manager_id,
                        "managerName": tpl_mgr_name or "Reporting Manager",
                        "serviceManagerId": "",
                        "serviceManagerName": "",
                        "categories": tpl.categories or [],
                        "employeeIds": [],
                        "isActive": True,
                        "status": "active",
                        "createdAt": tpl.created_at.isoformat() if tpl.created_at else datetime.utcnow().isoformat(),
                        "updatedAt": tpl.updated_at.isoformat() if tpl.updated_at else datetime.utcnow().isoformat()
                    })
        except Exception as e:
            print(f"Notice loading active manager templates for cycles: {e}")

        # 2. Add cycles dynamically built from PostgreSQL KpiEvaluation records
        for g_key, g_info in team_eval_groups.items():
            if g_key not in seen_cycle_keys:
                categories_from_db = g_info["metrics_data"] if isinstance(g_info["metrics_data"], list) else []
                new_c_id = f"cycle_db_{abs(hash(g_key)) % 1000000}"
                if new_c_id not in seen_cycle_ids:
                    seen_cycle_ids.add(new_c_id)
                    seen_cycle_keys.add(g_key)
                    cycles.append({
                        "id": new_c_id,
                        "name": g_info["form"],
                        "form": g_info["form"],
                        "frequency": g_info.get("frequency") or "quarterly",
                        "startDate": g_info.get("startDate") or "",
                        "endDate": g_info.get("endDate") or "",
                        "periodName": g_info.get("periodName") or "",
                        "description": g_info.get("description") or "",
                        "teamId": g_info["teamId"],
                        "teamName": g_info["teamName"],
                        "managerId": g_info["managerId"],
                        "managerName": g_info["managerName"] or "Reporting Manager",
                        "serviceManagerId": g_info["serviceManagerId"],
                        "serviceManagerName": g_info["serviceManagerName"] or "Service Manager",
                        "categories": categories_from_db,
                        "employeeIds": g_info["employeeIds"],
                        "isActive": True,
                        "status": "active",
                        "createdAt": g_info["createdAt"],
                        "updatedAt": g_info["updatedAt"]
                    })

        # 2. Build responses directly from DB records (single source of truth)
        if eval_records:
            responses = []
            for rec in eval_records:
                emp_id = str(rec.employee_id or "")
                emp_obj = Employee.query.filter(Employee.employee_id == emp_id).first()
                actual_code = emp_obj.employee_id if emp_obj and emp_obj.employee_id else emp_id
                resolved_team = rec.team_name or rec.team_id or (emp_obj.department if emp_obj else None) or (emp_obj.team if emp_obj else None) or "Media"
                resolved_name = rec.employee_name or (f"{emp_obj.first_name} {emp_obj.last_name}" if emp_obj else f"Employee #{actual_code}")

                db_kpis = extract_kpi_responses_from_metrics_data(rec.metrics_data)

                f_date_str = rec.from_date.isoformat() if rec.from_date else ""
                t_date_str = rec.to_date.isoformat() if rec.to_date else ""
                freq_str = rec.frequency or "quarterly"
                resp_cycle = next((
                    c for c in cycles
                    if (c.get("teamName") == rec.team_name or c.get("teamId") == rec.team_id) and
                       (c.get("name") == rec.form or c.get("form") == rec.form) and
                       c.get("frequency") == freq_str and
                       c.get("startDate") == f_date_str and
                       c.get("endDate") == t_date_str
                ), None)
                if not resp_cycle:
                    resp_cycle = next((
                        c for c in cycles
                        if (c.get("teamName") == rec.team_name or c.get("teamId") == rec.team_id) and
                           (c.get("name") == rec.form or c.get("form") == rec.form)
                    ), None)

                cycle_id = resp_cycle["id"] if resp_cycle else f"cycle_db_{abs(hash(f'{rec.team_name}_{rec.form}_{freq_str}_{f_date_str}_{t_date_str}')) % 1000000}"

                extracted_period = ""
                if rec.description and "(" in rec.description and ")" in rec.description:
                    extracted_period = rec.description.split("(", 1)[1].rsplit(")", 1)[0].strip()

                # Extract categories, monthly_records, weekly_records, quarterly_records, daily_records, and milestone_frequency from rec.metrics_data or fallback to store
                db_cats = []
                db_monthly_records = []
                db_weekly_records = []
                db_quarterly_records = []
                db_daily_records = []
                milestone_freq = None
                if isinstance(rec.metrics_data, list):
                    db_cats = rec.metrics_data
                elif isinstance(rec.metrics_data, dict):
                    if "categories" in rec.metrics_data and isinstance(rec.metrics_data["categories"], list):
                        db_cats = rec.metrics_data["categories"]
                    if "monthly_records" in rec.metrics_data and isinstance(rec.metrics_data["monthly_records"], list):
                        db_monthly_records = rec.metrics_data["monthly_records"]
                    if "weekly_records" in rec.metrics_data and isinstance(rec.metrics_data["weekly_records"], list):
                        db_weekly_records = rec.metrics_data["weekly_records"]
                    if "quarterly_records" in rec.metrics_data and isinstance(rec.metrics_data["quarterly_records"], list):
                        db_quarterly_records = rec.metrics_data["quarterly_records"]
                    if "daily_records" in rec.metrics_data and isinstance(rec.metrics_data["daily_records"], list):
                        db_daily_records = rec.metrics_data["daily_records"]
                    if "milestone_frequency" in rec.metrics_data:
                        milestone_freq = rec.metrics_data["milestone_frequency"]

                if not db_monthly_records and not db_weekly_records and not db_quarterly_records and not db_daily_records:
                    matching_json_r = next((
                        jr for jr in json_all_responses
                        if str(jr.get("id")) == f"resp_{rec.id}" or
                           str(jr.get("db_id")) == str(rec.id) or
                           (str(jr.get("employeeCode") or jr.get("employeeId")) == actual_code and jr.get("frequency") == freq_str and (jr.get("form") == rec.form or jr.get("periodName") == extracted_period))
                    ), None)
                    if matching_json_r:
                        if matching_json_r.get("monthly_records"):
                            db_monthly_records = matching_json_r.get("monthly_records")
                        if matching_json_r.get("weekly_records"):
                            db_weekly_records = matching_json_r.get("weekly_records")
                        if matching_json_r.get("quarterly_records"):
                            db_quarterly_records = matching_json_r.get("quarterly_records")
                        if matching_json_r.get("daily_records"):
                            db_daily_records = matching_json_r.get("daily_records")
                        if matching_json_r.get("milestone_frequency"):
                            milestone_freq = matching_json_r.get("milestone_frequency")
                        if not db_cats and matching_json_r.get("categories"):
                            db_cats = matching_json_r.get("categories")

                responses.append({
                    "id": f"resp_{rec.id}",
                    "db_id": rec.id,
                    "cycleId": cycle_id,
                    "teamId": resolved_team,
                    "teamName": resolved_team,
                    "employeeId": actual_code,
                    "employeeCode": actual_code,
                    "employeeName": resolved_name,
                    "form": rec.form or rec.performance_metrics or "Performance Evaluation",
                    "performance_metrics": rec.performance_metrics or rec.form or "",
                    "periodName": extracted_period or rec.form,
                    "description": rec.description or "",
                    "employeeSubmittedAt": rec.submitted_at.isoformat() if rec.submitted_at else None,
                    "managerReviewedAt": rec.reviewed_at.isoformat() if rec.reviewed_at else None,
                    "serviceManagerApprovedAt": rec.approved_at.isoformat() if rec.approved_at else None,
                    "managerId": str(rec.reporting_manager_id or rec.manager_id or ""),
                    "reportingManager": rec.reporting_manager or "",
                    "reporting_manager": rec.reporting_manager or "",
                    "reporting_manager_id": str(rec.reporting_manager_id or rec.manager_id or ""),
                    "serviceManager": rec.service_manager or "",
                    "service_manager": rec.service_manager or "",
                    "service_manager_id": str(rec.service_manager_id or ""),
                    "status": rec.status or "Assigned to Employee",
                    "employeeOverallScore": rec.employee_overall_score or (float(rec.earned_score) if rec.earned_score and rec.earned_score.replace('.', '', 1).isdigit() else 0.0),
                    "employeeRemarks": rec.employee_remark or "",
                    "managerScore": rec.manager_score,
                    "managerRemarks": rec.manager_remark or "",
                    "serviceManagerScore": float(rec.service_manager_score) if (rec.service_manager_score and rec.service_manager_score.replace('.', '', 1).isdigit()) else None,
                    "serviceManagerRemarks": rec.remark or "",
                    "frequency": rec.frequency or "quarterly",
                    "milestone_frequency": milestone_freq or ("daily" if db_daily_records else ("weekly" if db_weekly_records else ("quarterly" if db_quarterly_records else ("monthly" if db_monthly_records else None)))),
                    "startDate": rec.from_date.isoformat() if rec.from_date else "",
                    "endDate": rec.to_date.isoformat() if rec.to_date else "",
                    "workingDays": rec.working_days or 0,
                    "leaveDays": rec.leave_days or 0,
                    "holidayDays": rec.holiday_days or 0,
                    "categories": db_cats,
                    "metrics_data": rec.metrics_data,
                    "monthly_records": db_monthly_records,
                    "weekly_records": db_weekly_records,
                    "quarterly_records": db_quarterly_records,
                    "daily_records": db_daily_records,
                    "kpiResponses": db_kpis,
                    "createdAt": rec.created_at.isoformat() if rec.created_at else None,
                    "updatedAt": rec.updated_at.isoformat() if rec.updated_at else None
                })
        else:
            responses = []

        # Preserve ALL non-archived cycles and responses from JSON store (daily, weekly, monthly, quarterly, yearly).
        # JSON is lightweight metadata only; DB is the authoritative source for full KPI data.
        json_all_cycles = list(store.get("cycles", []))
        json_all_responses = [
            r for r in store.get("responses", [])
            if not r.get("is_archived")
        ]

        if db_unavailable:
            # DB had an error — serve entirely from JSON store, do NOT write back (preserve existing data)
            merged_cycles = json_all_cycles
            merged_responses = json_all_responses
            rating_scale = store.get("ratingScale", DEFAULT_RATING_SCALE)
            return jsonify({"success": True, "cycles": merged_cycles, "responses": merged_responses, "ratingScale": rating_scale}), 200

        # Combine: DB records take precedence (authoritative source), JSON fills in anything not yet in DB.
        # Start with DB-derived cycles, then append any JSON-only cycles not already present.
        merged_cycles = list(cycles)
        existing_cycle_keys = {(c.get("id"), c.get("name"), c.get("startDate"), c.get("endDate")) for c in merged_cycles}
        for c in json_all_cycles:
            c_key = (c.get("id"), c.get("name"), c.get("startDate"), c.get("endDate"))
            if c_key not in existing_cycle_keys:
                merged_cycles.append(c)
                existing_cycle_keys.add(c_key)

        # Start with DB-derived responses, then append pure daily/weekly JSON responses not already present.
        merged_responses = list(responses)
        existing_resp_ids = {r.get("id") for r in merged_responses}
        existing_db_ids = {r.get("db_id") for r in merged_responses if r.get("db_id")}
        for r in json_all_responses:
            r_id = r.get("id")
            r_db_id = r.get("db_id")
            r_freq = str(r.get("frequency") or "").lower()
            # Only append daily/weekly JSON responses or non-DB responses.
            # Monthly, quarterly, and yearly DB records are authoritative in PostgreSQL; if deleted from DB, do NOT resurrect!
            if r_freq in ["daily", "weekly"] or (not r_db_id and not str(r_id or "").replace("resp_", "").isdigit()):
                if r_id not in existing_resp_ids and (not r_db_id or r_db_id not in existing_db_ids):
                    merged_responses.append(r)
                    existing_resp_ids.add(r_id)

        # Clean and sanitize merged_cycles: ensure employeeIds only include active employees with valid responses or unassigned templates
        valid_merged_cycles = []
        for c in merged_cycles:
            c_id = str(c.get("id"))
            c_emps = [str(x) for x in c.get("employeeIds", [])]
            # Match responses belonging to this cycle
            c_resps = [
                r for r in merged_responses
                if str(r.get("cycleId")) == c_id or (
                    r.get("frequency") == c.get("frequency") and
                    (r.get("form") == c.get("name") or r.get("performance_metrics") == c.get("name")) and
                    r.get("startDate") == c.get("startDate")
                )
            ]
            active_resp_emp_codes = {str(r.get("employeeCode") or r.get("employeeId") or "") for r in c_resps}
            
            # If responses exist for this cycle, employeeIds should match employees with active responses
            if c_resps:
                synced_emp_ids = [eid for eid in c_emps if eid in active_resp_emp_codes]
                synced_emp_ids = list(dict.fromkeys(synced_emp_ids + [eid for eid in active_resp_emp_codes if eid]))
            else:
                synced_emp_ids = c_emps

            c["employeeIds"] = synced_emp_ids
            # Keep cycle only if it has remaining employees or responses
            if len(synced_emp_ids) > 0 or len(c_resps) > 0:
                valid_merged_cycles.append(c)

        merged_cycles = valid_merged_cycles
        rating_scale = store.get("ratingScale", DEFAULT_RATING_SCALE)
        return jsonify({"success": True, "cycles": merged_cycles, "responses": merged_responses, "ratingScale": rating_scale}), 200
    except Exception as e:
        return jsonify({"error": str(e), "cycles": [], "responses": [], "ratingScale": DEFAULT_RATING_SCALE}), 500

@performance_bp.route("/rating-scale", methods=["GET"])
def get_rating_scale():
    try:
        store = read_eval_store()
        scale = store.get("ratingScale", DEFAULT_RATING_SCALE)
        return jsonify({"success": True, "ratingScale": scale}), 200
    except Exception as e:
        return jsonify({"error": str(e), "ratingScale": DEFAULT_RATING_SCALE}), 500

@performance_bp.route("/rating-scale", methods=["POST", "PUT"])
@auth_required
def update_rating_scale():
    try:
        data = request.get_json() or {}
        scale = data.get("ratingScale") if isinstance(data, dict) and "ratingScale" in data else data
        if not isinstance(scale, list):
            return jsonify({"error": "ratingScale must be a list"}), 400
        store = read_eval_store()
        store["ratingScale"] = scale
        write_eval_store(store)
        return jsonify({"success": True, "ratingScale": scale}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/evaluation/cycles", methods=["POST", "PUT"])
def save_evaluation_cycle():
    try:
        req_data = request.get_json() or {}
        cycles_list = req_data if isinstance(req_data, list) else ([req_data] if isinstance(req_data, dict) else [])
        now = datetime.utcnow()

        for c in cycles_list:
            mgr_ids = [s.strip() for s in str(c.get("managerId") or "").split(",") if s.strip()]
            team_id = str(c.get("teamId") or "").strip()
            team_name = str(c.get("teamName") or "").strip()
            cats = c.get("categories") or []
            tpl_name = c.get("name") or c.get("form") or "Performance Evaluation"

            # Determine the exact template_key from the cycle (e.g. form_3)
            target_tpl_key = str(c.get("template_key") or c.get("templateKey") or "").strip().lower()
            if not target_tpl_key:
                import re
                match = re.search(r'Form\s*(\d+)', tpl_name, re.IGNORECASE)
                if match:
                    target_tpl_key = f"form_{match.group(1)}"
                else:
                    target_tpl_key = "form_1"

            for m_id in mgr_ids:
                tpl = ManagerKpiTemplate.query.filter(
                    ManagerKpiTemplate.manager_id == m_id,
                    ManagerKpiTemplate.template_key == target_tpl_key
                ).first()

                if tpl:
                    tpl.status = "active"
                    tpl.template_name = tpl_name or tpl.template_name
                    if cats:
                        tpl.categories = cats
                    if team_id:
                        tpl.team_id = team_id
                    if team_name:
                        tpl.team_name = team_name
                    tpl.updated_at = now
                else:
                    new_tpl = ManagerKpiTemplate(
                        manager_id=m_id,
                        manager_name=c.get("managerName") or "Manager",
                        template_key=target_tpl_key,
                        template_name=tpl_name,
                        team_id=team_id if team_id else None,
                        team_name=team_name if team_name else None,
                        categories=cats,
                        is_default=True,
                        status="active",
                        created_at=now,
                        updated_at=now
                    )
                    db.session.add(new_tpl)

        db.session.commit()
        return jsonify({"success": True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/evaluation/cycles/<cycle_id>", methods=["DELETE"])
def delete_evaluation_cycle(cycle_id):
    try:
        req_data = request.get_json(silent=True) or {}
        store = read_eval_store()
        cycles = store.get("cycles", [])
        responses = store.get("responses", [])

        # Find target cycle from store or request parameters
        target_cycle = next((c for c in cycles if str(c.get("id")) == str(cycle_id)), None)
        
        team_id = str(req_data.get("teamId") or (target_cycle.get("teamId") if target_cycle else "") or "").strip()
        team_name = str(req_data.get("teamName") or (target_cycle.get("teamName") if target_cycle else "") or "").strip()
        form_name = str(req_data.get("form") or (target_cycle.get("name") if target_cycle else "") or "").strip()
        period_name = str(req_data.get("periodName") or (target_cycle.get("periodName") if target_cycle else "") or "").strip()
        frequency = str(req_data.get("frequency") or (target_cycle.get("frequency") if target_cycle else "") or "").strip()
        start_date = str(req_data.get("startDate") or (target_cycle.get("startDate") if target_cycle else "") or "").strip()
        end_date = str(req_data.get("endDate") or (target_cycle.get("endDate") if target_cycle else "") or "").strip()
        
        # Collect all employee IDs
        emp_ids = set()
        if target_cycle and target_cycle.get("employeeIds"):
            emp_ids.update([str(e).strip() for e in target_cycle.get("employeeIds", []) if str(e).strip()])
        if req_data.get("employeeIds"):
            emp_ids.update([str(e).strip() for e in req_data.get("employeeIds", []) if str(e).strip()])

        # Collect response IDs & DB IDs
        resp_ids = set()
        db_ids = set()
        if req_data.get("responseIds"):
            resp_ids.update([str(r).strip() for r in req_data.get("responseIds", []) if str(r).strip()])
        if req_data.get("dbIds"):
            for d in req_data.get("dbIds", []):
                if d is not None and str(d).strip().isdigit():
                    db_ids.add(int(str(d).strip()))

        # Match all responses in store that belong to this cycle or team/form/period
        matching_store_resps = [
            r for r in responses
            if str(r.get("cycleId")) == str(cycle_id) or
               str(r.get("id")) in resp_ids or
               (r.get("db_id") and int(r.get("db_id")) in db_ids) or
               (team_name and (str(r.get("teamName") or "").lower() == team_name.lower() or str(r.get("teamId") or "").lower() == team_name.lower() or str(r.get("department") or "").lower() == team_name.lower()) and (
                   (form_name and (r.get("form") == form_name or r.get("performance_metrics") == form_name or r.get("periodName") == form_name)) or
                   (frequency and r.get("frequency") == frequency) or
                   not form_name
               ))
        ]
        
        for r in matching_store_resps:
            resp_id_val = str(r.get("id") or "").strip()
            if resp_id_val:
                resp_ids.add(resp_id_val)
                clean_id = resp_id_val.replace("resp_", "").replace("eval_", "")
                if clean_id.isdigit():
                    db_ids.add(int(clean_id))
            if r.get("db_id") and str(r.get("db_id")).isdigit():
                db_ids.add(int(r.get("db_id")))
            emp_val = str(r.get("employeeCode") or r.get("employeeId") or "").strip()
            if emp_val:
                emp_ids.add(emp_val)

        # 1. Remove from JSON Store
        store["cycles"] = [
            c for c in cycles
            if str(c.get("id")) != str(cycle_id) and
               not (team_name and str(c.get("teamName") or "").lower() == team_name.lower() and (not form_name or str(c.get("name") or "") == form_name or str(c.get("form") or "") == form_name))
        ]
        store["responses"] = [
            r for r in responses
            if str(r.get("cycleId")) != str(cycle_id) and
               str(r.get("id")) not in resp_ids and
               (not r.get("db_id") or int(r.get("db_id")) not in db_ids) and
               not (team_name and str(r.get("teamName") or "").lower() == team_name.lower() and (not form_name or r.get("form") == form_name or r.get("performance_metrics") == form_name))
        ]
        write_eval_store(store)

        # 2. Remove matching uncalibrated / unstarted records from PostgreSQL kpi_evaluations
        db_query_conditions = []
        if db_ids:
            db_query_conditions.append(KpiEvaluation.id.in_(list(db_ids)))
        if form_name:
            db_query_conditions.append(KpiEvaluation.form == form_name)
            db_query_conditions.append(KpiEvaluation.performance_metrics == form_name)
            db_query_conditions.append(KpiEvaluation.form.ilike(f"%{form_name}%"))
        if period_name:
            db_query_conditions.append(KpiEvaluation.description.ilike(f"%{period_name}%"))
        if team_name:
            db_query_conditions.append(KpiEvaluation.team_name.ilike(team_name))
            db_query_conditions.append(KpiEvaluation.team_id == team_name)
        if team_id and team_id != team_name:
            db_query_conditions.append(KpiEvaluation.team_id == team_id)
            db_query_conditions.append(KpiEvaluation.team_name.ilike(team_id))

        if db_query_conditions:
            candidate_records = KpiEvaluation.query.filter(or_(*db_query_conditions)).all()
            for rec in candidate_records:
                # Protect published/calibrated records with manager score
                if rec.manager_score is not None or rec.status in ["Calibrated & Approved", "Published", "Approved", "Completed"]:
                    continue
                # If emp_ids filter exists, ensure this employee belongs to the cycle if form/team was broad
                if emp_ids and str(rec.employee_id or "").strip() not in emp_ids and rec.id not in db_ids:
                    # Also check if team matches
                    if not (team_name and (str(rec.team_name or "").lower() == team_name.lower() or str(rec.team_id or "").lower() == team_name.lower())):
                        continue
                db.session.delete(rec)
            db.session.commit()

        return jsonify({
            "success": True, 
            "message": "Performance Deliverables Matrix and unstarted evaluations removed from DB successfully", 
            "cycles": store["cycles"]
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/evaluation/responses/<path:resp_id_or_emp_id>", methods=["DELETE"])
def delete_evaluation_response(resp_id_or_emp_id):
    try:
        req_data = request.get_json(silent=True) or {}
        cycle_id = str(request.args.get("cycleId") or req_data.get("cycleId") or "").strip()
        emp_code = str(request.args.get("employeeCode") or request.args.get("employee_code") or req_data.get("employeeCode") or req_data.get("employeeId") or "").strip()
        resp_id_str = str(resp_id_or_emp_id or "").strip()
        db_id_val = request.args.get("db_id") or request.args.get("dbId") or req_data.get("db_id") or req_data.get("dbId")
        form_name = str(req_data.get("form") or req_data.get("periodName") or "").strip()
        frequency = str(request.args.get("frequency") or req_data.get("frequency") or "").strip()
        team_name = str(req_data.get("teamName") or req_data.get("teamId") or "").strip()

        # 1. Clean up from JSON store
        target_db_id = db_id_val
        target_emp_code = emp_code
        try:
            store = read_eval_store()
            responses = store.get("responses", [])
            
            # Find the exact target response by ID first
            target_resp = None
            for r in responses:
                if str(r.get("id")) == resp_id_str:
                    target_resp = r
                    break
                if db_id_val and (str(r.get("db_id")) == str(db_id_val) or str(r.get("id")) == f"resp_{db_id_val}"):
                    target_resp = r
                    break
                if emp_code:
                    r_emp = str(r.get("employeeCode") or r.get("employeeId") or "").strip().lower()
                    clean_target = emp_code.lower().replace("emp-", "").replace("emp_", "")
                    if r_emp == clean_target or r_emp == emp_code.lower():
                        if not frequency or str(r.get("frequency") or "").lower() == frequency.lower():
                            target_resp = r
                            break

            # Prevent deleting calibrated/published/submitted records
            if target_resp:
                s_val = str(target_resp.get("status") or "").lower()
                is_sub = target_resp.get("employeeSubmittedAt") or "submitted" in s_val or "manager_review" in s_val
                if target_resp.get("managerScore") is not None or is_sub or s_val in ["calibrated & approved", "published", "approved", "completed"]:
                    return jsonify({"error": "Submitted, published, and calibrated evaluation records cannot be deleted."}), 400

            target_id = str(target_resp.get("id")) if target_resp else resp_id_str
            target_emp_code = str(target_resp.get("employeeCode") or target_resp.get("employeeId") or emp_code or "")
            clean_target_emp = target_emp_code.lower().replace("emp-", "").replace("emp_", "")
            target_cycle_id = str(target_resp.get("cycleId") or cycle_id or "")
            target_form = target_resp.get("form") if target_resp else form_name
            target_start = target_resp.get("startDate") if target_resp else ""
            target_db_id = target_resp.get("db_id") if target_resp else db_id_val

            remaining_resps = []
            for r in responses:
                r_id = str(r.get("id") or "")
                r_db_id = str(r.get("db_id") or "")
                r_emp = str(r.get("employeeCode") or r.get("employeeId") or "").lower().replace("emp-", "").replace("emp_", "")
                r_freq = str(r.get("frequency") or "").lower()
                
                # Match target for removal
                if r_id == target_id or r_id == resp_id_str:
                    continue
                if target_db_id and (r_db_id == str(target_db_id) or r_id == f"resp_{target_db_id}"):
                    continue
                if clean_target_emp and r_emp == clean_target_emp and frequency and r_freq == frequency.lower() and (not target_form or r.get("form") == target_form or r.get("periodName") == target_form):
                    continue
                remaining_resps.append(r)

            store["responses"] = remaining_resps

            # Also clean up employee from cycle's employeeIds or remove empty cycle
            updated_cycles = []
            for c in store.get("cycles", []):
                c_id = str(c.get("id"))
                c_emp_ids = [str(x) for x in c.get("employeeIds", [])]
                is_matching_cycle = (target_cycle_id and c_id == target_cycle_id) or (target_form and c.get("name") == target_form and c.get("startDate") == target_start)

                if is_matching_cycle and target_emp_code:
                    has_other_resp_for_emp = any(
                        (str(r.get("cycleId")) == c_id or (r.get("form") == c.get("name") and r.get("startDate") == c.get("startDate"))) and
                        str(r.get("employeeCode") or r.get("employeeId")) == target_emp_code
                        for r in remaining_resps
                    )
                    if not has_other_resp_for_emp:
                        c_emp_ids = [eid for eid in c_emp_ids if eid != target_emp_code]
                        c["employeeIds"] = c_emp_ids

                cycle_has_responses = any(
                    str(r.get("cycleId")) == c_id or (r.get("form") == c.get("name") and r.get("startDate") == c.get("startDate"))
                    for r in remaining_resps
                )
                if len(c_emp_ids) > 0 or cycle_has_responses:
                    updated_cycles.append(c)

            store["cycles"] = updated_cycles
            write_eval_store(store)

            # Explicitly overwrite the deleted employee's per-employee file.
            # write_eval_store() only writes files for employees still present in remaining_resps.
            # If ALL records for this employee were deleted, their file is never touched and the
            # deleted record resurrects on the next read_eval_store() call. Force-write it here.
            if clean_target_emp:
                emp_remaining = [
                    r for r in remaining_resps
                    if str(r.get("employeeCode") or r.get("employeeId") or "").strip().lower()
                       .replace("emp-", "").replace("emp_", "") == clean_target_emp
                ]
                write_employee_evaluations(clean_target_emp, emp_remaining)
        except Exception as store_err:
            print(f"[delete_evaluation_response] JSON store error: {store_err}")

        # 2. Clean up from PostgreSQL database (kpi_evaluations)
        try:
            import re
            db_recs_to_delete = []

            # Strategy A: By db_id / primary key
            candidate_ids = []
            if db_id_val and str(db_id_val).isdigit():
                candidate_ids.append(int(db_id_val))
            if target_db_id and str(target_db_id).isdigit():
                candidate_ids.append(int(target_db_id))
            
            clean_digits = re.findall(r'\d+', resp_id_str)
            for d_str in clean_digits:
                if d_str.isdigit():
                    candidate_ids.append(int(d_str))

            for pk in set(candidate_ids):
                rec_by_pk = db.session.get(KpiEvaluation, pk)
                if rec_by_pk and rec_by_pk not in db_recs_to_delete:
                    db_recs_to_delete.append(rec_by_pk)

            # Strategy B: If no record found by PK or as fallback, search by employee_id + frequency/period
            target_emp_val = emp_code or target_emp_code or resp_id_str
            clean_code = target_emp_val.lower().replace("emp-", "").replace("emp_", "").strip() if target_emp_val else ""

            if not db_recs_to_delete and clean_code:
                # Query candidate rows for this employee
                emp_query = KpiEvaluation.query.filter(
                    or_(
                        KpiEvaluation.employee_id == clean_code,
                        KpiEvaluation.employee_id == f"EMP-{clean_code}",
                        KpiEvaluation.employee_id == f"emp-{clean_code}",
                        KpiEvaluation.employee_id == target_emp_val,
                        KpiEvaluation.employee_id.ilike(f"%{clean_code}%")
                    )
                )
                if frequency:
                    emp_query = emp_query.filter(KpiEvaluation.frequency == frequency.lower())

                emp_recs = emp_query.all()
                for r_item in emp_recs:
                    if r_item not in db_recs_to_delete:
                        db_recs_to_delete.append(r_item)

            for rec in db_recs_to_delete:
                s_rec = str(rec.status or "").lower()
                is_rec_sub = bool(rec.submitted_at) or "submitted" in s_rec or "manager_review" in s_rec
                if rec.manager_score is not None or is_rec_sub or rec.status in ["Calibrated & Approved", "Published", "Approved", "Completed"]:
                    return jsonify({"error": "Submitted, published, and calibrated evaluation records cannot be deleted."}), 400
                db.session.delete(rec)

            db.session.commit()
        except Exception as db_err:
            db.session.rollback()
            print(f"[delete_evaluation_response] DB delete error: {db_err}")

        return jsonify({"success": True, "message": "Evaluation response deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/evaluation/responses", methods=["POST", "PUT"])
def save_evaluation_responses():
    try:
        req_data = request.get_json()
        store = read_eval_store()
        responses = store.get("responses", [])

        def is_same_response(r1, r2):
            # 1. Exact ID match
            if r1.get("id") and r2.get("id") and str(r1.get("id")) == str(r2.get("id")):
                return True
            # 2. Match only if exact period / form AND employee match
            p1 = (r1.get("periodName") or r1.get("form") or "").strip().lower()
            p2 = (r2.get("periodName") or r2.get("form") or "").strip().lower()
            e1_ids = {str(r1.get("employeeId") or "").strip(), str(r1.get("employeeCode") or "").strip()} - {""}
            e2_ids = {str(r2.get("employeeId") or "").strip(), str(r2.get("employeeCode") or "").strip()} - {""}
            if p1 and p2 and p1 == p2 and (e1_ids & e2_ids):
                return True
            return False

        items = req_data if isinstance(req_data, list) else [req_data]
        now = datetime.utcnow()

        for item in items:
            idx = next((i for i, r in enumerate(responses) if is_same_response(r, item)), -1)
            if idx >= 0:
                responses[idx].update(item)
            else:
                responses.append(item)

            # Also persist directly into PostgreSQL KpiEvaluation table
            emp_id = str(item.get("employeeCode") or item.get("employeeId") or "").strip()
            resp_id = str(item.get("id") or "").strip()
            form_name = item.get("form") or item.get("performance_metrics") or item.get("periodName") or ""
            period_name = str(item.get("periodName") or "").strip()

            db_id_val = item.get("db_id") or item.get("dbId")
            if emp_id or db_id_val:
                eval_row = None
                if db_id_val and str(db_id_val).isdigit():
                    eval_row = KpiEvaluation.query.get(int(db_id_val))

                if not eval_row:
                    clean_id = resp_id.replace("resp_", "").replace("eval_", "").strip()
                    if clean_id.isdigit():
                        eval_row = KpiEvaluation.query.get(int(clean_id))

                clean_emp_id = emp_id.lower().replace("emp-", "").replace("emp_", "").strip()
                emp_id_variants = list({emp_id, clean_emp_id, f"EMP-{clean_emp_id}", f"emp-{clean_emp_id}"} - {""})

                if not eval_row and (form_name or period_name):
                    sub_conds = []
                    if form_name:
                        sub_conds.extend([KpiEvaluation.form == form_name, KpiEvaluation.performance_metrics == form_name, KpiEvaluation.form.ilike(f"%{form_name}%")])
                    if period_name:
                        sub_conds.append(KpiEvaluation.description.ilike(f"%{period_name}%"))
                    if sub_conds:
                        eval_row = KpiEvaluation.query.filter(
                            KpiEvaluation.employee_id.in_(emp_id_variants),
                            or_(*sub_conds)
                        ).order_by(KpiEvaluation.id.desc()).first()

                if not eval_row:
                    # Only match un-calibrated/pending evaluations to prevent destroying published historical records
                    eval_row = KpiEvaluation.query.filter(
                        KpiEvaluation.employee_id.in_(emp_id_variants),
                        KpiEvaluation.status.in_(["Assigned to Employee", "employee_in_progress", "Pending", "draft", "Draft", "manager_review", "Submitted to Manager", "submitted_to_manager"])
                    ).order_by(KpiEvaluation.id.desc()).first()

                if eval_row:
                    existing_cats = []
                    if isinstance(eval_row.metrics_data, dict) and "categories" in eval_row.metrics_data:
                        existing_cats = eval_row.metrics_data["categories"]
                    elif isinstance(eval_row.metrics_data, list):
                        existing_cats = eval_row.metrics_data
                    elif "categories" in item and isinstance(item["categories"], list):
                        existing_cats = item["categories"]

                    metrics_dict = {
                        "categories": existing_cats
                    }

                    if "daily_records" in item and item["daily_records"]:
                        metrics_dict["daily_records"] = item["daily_records"]
                    elif isinstance(eval_row.metrics_data, dict) and "daily_records" in eval_row.metrics_data:
                        metrics_dict["daily_records"] = eval_row.metrics_data["daily_records"]

                    if "monthly_records" in item and item["monthly_records"]:
                        metrics_dict["monthly_records"] = item["monthly_records"]
                    elif isinstance(eval_row.metrics_data, dict) and "monthly_records" in eval_row.metrics_data:
                        metrics_dict["monthly_records"] = eval_row.metrics_data["monthly_records"]

                    if "weekly_records" in item and item["weekly_records"]:
                        metrics_dict["weekly_records"] = item["weekly_records"]
                    elif isinstance(eval_row.metrics_data, dict) and "weekly_records" in eval_row.metrics_data:
                        metrics_dict["weekly_records"] = eval_row.metrics_data["weekly_records"]

                    if "quarterly_records" in item and item["quarterly_records"]:
                        metrics_dict["quarterly_records"] = item["quarterly_records"]
                    elif isinstance(eval_row.metrics_data, dict) and "quarterly_records" in eval_row.metrics_data:
                        metrics_dict["quarterly_records"] = eval_row.metrics_data["quarterly_records"]

                    if "milestone_frequency" in item and item["milestone_frequency"]:
                        metrics_dict["milestone_frequency"] = item["milestone_frequency"]
                    elif isinstance(eval_row.metrics_data, dict) and "milestone_frequency" in eval_row.metrics_data:
                        metrics_dict["milestone_frequency"] = eval_row.metrics_data["milestone_frequency"]

                    if "kpiResponses" in item and item["kpiResponses"]:
                        metrics_dict["categories"] = merge_kpi_responses_into_categories(metrics_dict["categories"], item["kpiResponses"])
                        metrics_dict["kpiResponses"] = item["kpiResponses"]

                    eval_row.metrics_data = metrics_dict

                    if "employeeOverallScore" in item:
                        try:
                            eval_row.employee_overall_score = float(item["employeeOverallScore"])
                            eval_row.earned_score = str(item["employeeOverallScore"])
                            eval_row.actual_earned_mark = str(item["employeeOverallScore"])
                        except (ValueError, TypeError):
                            pass
                    if "employeeRemarks" in item:
                        eval_row.employee_remark = item["employeeRemarks"]
                    if item.get("employeeSubmittedAt"):
                        try:
                            eval_row.submitted_at = datetime.fromisoformat(item["employeeSubmittedAt"].replace("Z", "+00:00"))
                        except Exception:
                            eval_row.submitted_at = now
                    if "managerScore" in item and item["managerScore"] is not None:
                        try:
                            eval_row.manager_score = float(item["managerScore"])
                            eval_row.manager_approve_score = str(item["managerScore"])
                        except (ValueError, TypeError):
                            pass
                    if "managerRemarks" in item:
                        eval_row.manager_remark = item["managerRemarks"]
                    if item.get("managerReviewedAt"):
                        try:
                            eval_row.reviewed_at = datetime.fromisoformat(item["managerReviewedAt"].replace("Z", "+00:00"))
                        except Exception:
                            eval_row.reviewed_at = now
                    if "serviceManagerScore" in item and item["serviceManagerScore"] is not None:
                        eval_row.service_manager_score = str(item["serviceManagerScore"])
                    if "status" in item and item["status"]:
                        eval_row.status = item["status"]
                    eval_row.updated_at = now

        db.session.commit()

        # IMPORTANT FIX: Do NOT replace store["responses"] with the incoming list.
        # The frontend sends its full localStorage array which may be stale/incomplete.
        # Instead, merge each incoming response INTO the existing store using upsert logic.
        # This preserves all DB-assigned monthly/quarterly entries that the frontend may not have.
        store_resp_map = {str(r.get("id") or ""): i for i, r in enumerate(responses) if r.get("id")}

        for item in items:
            item_id = str(item.get("id") or "")
            # Try to find existing store entry by ID
            if item_id and item_id in store_resp_map:
                responses[store_resp_map[item_id]].update(item)
            else:
                # Try by employee + form/period match
                matched_idx = next((
                    i for i, r in enumerate(responses)
                    if is_same_response(r, item)
                ), -1)
                if matched_idx >= 0:
                    responses[matched_idx].update(item)
                else:
                    responses.append(item)

        store["responses"] = responses
        write_eval_store(store)
        return jsonify({"success": True, "responses": responses}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# =========================================================================
# KPI EVALUATION DATABASE TABLE ENDPOINTS (JSON METRICS STORAGE)
# =========================================================================
from datetime import datetime
from sqlalchemy import or_

@performance_bp.route("/kpi-evaluations", methods=["GET"])
@auth_required
def get_kpi_evaluations():
    try:
        form_filter = request.args.get("form")
        employee_id_filter = request.args.get("employee_id")
        reporting_manager_id_filter = request.args.get("reporting_manager_id") or request.args.get("manager_id")
        service_manager_id_filter = request.args.get("service_manager_id")
        status_filter = request.args.get("status")
        team_id_filter = request.args.get("team_id")
        include_archived = request.args.get("include_archived", "false").lower() == "true"
        
        query = KpiEvaluation.query
        if not include_archived:
            query = query.filter(or_(KpiEvaluation.is_archived == False, KpiEvaluation.is_archived.is_(None)))
        if form_filter:
            query = query.filter(KpiEvaluation.form == form_filter)
        if employee_id_filter:
            # Match employee_id or string
            query = query.filter(KpiEvaluation.employee_id == str(employee_id_filter))
        if reporting_manager_id_filter:
            query = query.filter(or_(
                KpiEvaluation.reporting_manager_id == str(reporting_manager_id_filter),
                KpiEvaluation.manager_id == str(reporting_manager_id_filter)
            ))
        if service_manager_id_filter:
            query = query.filter(KpiEvaluation.service_manager_id == str(service_manager_id_filter))
        if status_filter:
            query = query.filter(KpiEvaluation.status == status_filter)
        if team_id_filter:
            query = query.filter(KpiEvaluation.team_id == str(team_id_filter))
            
        records = query.order_by(KpiEvaluation.updated_at.desc(), KpiEvaluation.id.desc()).all()
        eval_list = [r.to_dict() for r in records]

        # Also include matching daily & weekly evaluations from JSON store (data/uploads/evaluations/evaluation_store.json)
        store = read_eval_store()
        for r in store.get("responses", []):
            freq = str(r.get("frequency") or "").lower()
            if freq not in ["daily", "weekly"]:
                continue
            if not include_archived and (r.get("is_archived") or str(r.get("status") or "").lower() == "archived"):
                continue
            if employee_id_filter and str(r.get("employeeCode") or r.get("employeeId")) != str(employee_id_filter):
                continue
            if form_filter and r.get("form") != form_filter and r.get("performance_metrics") != form_filter:
                continue
            if status_filter and r.get("status") != status_filter:
                continue
            if team_id_filter and str(r.get("teamId") or r.get("team_id")) != str(team_id_filter):
                continue
            eval_list.append(r)

        return jsonify({"success": True, "evaluations": eval_list}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/kpi-evaluations", methods=["POST"])
@auth_required
def create_or_bulk_save_kpi_evaluations():
    try:
        data = request.get_json()
        items = data if isinstance(data, list) else [data]
        saved_records = []
        now = datetime.utcnow()
        
        for item in items:
            record_id = item.get("id")
            record = None
            if record_id:
                record = KpiEvaluation.query.get(record_id)
            
            if not record:
                record = KpiEvaluation(
                    form=item.get("form", "General KPI Form"),
                    team_id=str(item.get("team_id", "")),
                    team_name=item.get("team_name", ""),
                    metrics_data=item.get("metrics_data") or item.get("categories"),
                    performance_metrics=item.get("performance_metrics", item.get("form", "KPI Deliverables")),
                    description=item.get("description", ""),
                    target_score=str(item.get("target_score", "")),
                    weightage=str(item.get("weightage", "")),
                    target_from_manager=str(item.get("target_from_manager", "")),
                    actual_earned_mark=str(item.get("actual_earned_mark", "")),
                    earned_score=str(item.get("earned_score", "")),
                    employee_overall_score=float(item.get("employee_overall_score") or item.get("earned_score") or 0.0),
                    employee_remark=item.get("employee_remark", ""),
                    manager_actual_pm=item.get("manager_actual_pm", ""),
                    manager_approve_score=str(item.get("manager_approve_score", "")),
                    manager_score=float(item.get("manager_score")) if item.get("manager_score") is not None else None,
                    manager_remark=item.get("manager_remark", ""),
                    service_manager_approve_status=item.get("service_manager_approve_status", "Pending"),
                    service_manager_score=str(item.get("service_manager_score", "")),
                    remark=item.get("remark", ""),
                    employee_id=str(item.get("employee_id", "")),
                    employee_name=item.get("employee_name", ""),
                    reporting_manager=item.get("reporting_manager") or item.get("manager_name"),
                    reporting_manager_id=str(item.get("reporting_manager_id") or item.get("manager_id") or ""),
                    manager_id=str(item.get("manager_id") or item.get("reporting_manager_id") or ""),
                    service_manager=item.get("service_manager") or item.get("service_manager_name"),
                    service_manager_id=str(item.get("service_manager_id", "")),
                    status=item.get("status", "Draft"),
                    created_at=now,
                    updated_at=now
                )
                db.session.add(record)
            else:
                for field in [
                    "form", "team_id", "team_name", "metrics_data", "performance_metrics", "description",
                    "target_score", "weightage", "target_from_manager", "actual_earned_mark",
                    "earned_score", "employee_overall_score", "employee_remark", "manager_actual_pm",
                    "manager_approve_score", "manager_score", "manager_remark",
                    "service_manager_approve_status", "service_manager_score",
                    "remark", "employee_id", "employee_name",
                    "reporting_manager", "reporting_manager_id", "manager_id",
                    "service_manager", "service_manager_id", "status"
                ]:
                    if field in item:
                        setattr(record, field, item[field])
                record.updated_at = now
            
            db.session.flush()
            saved_records.append(record)

        db.session.commit()
        return jsonify({"success": True, "evaluations": [r.to_dict() for r in saved_records]}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/kpi-evaluations/<int:id>", methods=["PUT"])
@auth_required
def update_kpi_evaluation(id):
    try:
        record = KpiEvaluation.query.get(id)
        if not record:
            return jsonify({"error": "KPI evaluation record not found"}), 404

        data = request.get_json()
        for field in [
            "form", "team_id", "team_name", "metrics_data", "performance_metrics", "description",
            "target_score", "weightage", "target_from_manager", "actual_earned_mark",
            "earned_score", "employee_overall_score", "employee_remark", "manager_actual_pm",
            "manager_approve_score", "manager_score", "manager_remark",
            "service_manager_approve_status", "service_manager_score",
            "remark", "employee_id", "employee_name",
            "reporting_manager", "reporting_manager_id", "manager_id",
            "service_manager", "service_manager_id", "status"
        ]:
            if field in data:
                setattr(record, field, data[field])
        
        record.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"success": True, "evaluation": record.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/kpi-evaluations/<int:id>", methods=["DELETE"])
@auth_required
def delete_kpi_evaluation(id):
    try:
        record = KpiEvaluation.query.get(id)
        if not record:
            return jsonify({"error": "KPI evaluation record not found"}), 404

        db.session.delete(record)
        db.session.commit()
        return jsonify({"success": True, "message": "KPI evaluation record deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500



# =========================================================================
# KPI WORKFLOW TEMPLATES (POSTGRESQL MULTI-FORM PERSISTENCE)
# =========================================================================

SYSTEM_DEFAULT_KPI_CATEGORIES = [
    {
        "id": "cat_productivity",
        "name": "Productivity (Number of Active Projects)",
        "description": "Project volume, complexity handling, and throughput page counts",
        "weightage": 30,
        "kpis": [
            {
                "id": "kpi_proj_simple",
                "name": "Simple Projects",
                "description": "Standard quick turnaround projects completed",
                "targetScore": 3.33,
                "weightage": 3.33,
                "targetFromManager": "3",
                "targetValue": 3,
                "unit": "projects",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_proj_moderate",
                "name": "Moderate Projects",
                "description": "Multi-step intermediate complexity deliverables",
                "targetScore": 3.33,
                "weightage": 3.33,
                "targetFromManager": "11",
                "targetValue": 11,
                "unit": "projects",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_proj_complex",
                "name": "Complex Projects",
                "description": "High difficulty customized client assignments",
                "targetScore": 3.34,
                "weightage": 3.34,
                "targetFromManager": "1",
                "targetValue": 1,
                "unit": "projects",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_pages_first_pass",
                "name": "Number of Pages (First pass)",
                "description": "Total volume of pages processed in initial review pass",
                "targetScore": 10,
                "weightage": 10,
                "targetFromManager": "1950",
                "targetValue": 1950,
                "unit": "pages",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_pages_final",
                "name": "Number of Pages (Final pages)",
                "description": "Total approved production-ready output pages delivered",
                "targetScore": 10,
                "weightage": 10,
                "targetFromManager": "1950",
                "targetValue": 1950,
                "unit": "pages",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": True
            }
        ]
    },
    {
        "id": "cat_customer_engagement",
        "name": "Customer Engagement",
        "description": "Client communication, SLA compliance, issue escalations, and satisfaction",
        "weightage": 30,
        "kpis": [
            {
                "id": "kpi_appreciations",
                "name": "Client Appreciations",
                "description": "Direct praise, positive feedback, or awards from customers",
                "targetScore": 5,
                "weightage": 5,
                "targetFromManager": "1",
                "targetValue": 1,
                "unit": "appreciations",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": False
            },
            {
                "id": "kpi_effective_comm",
                "name": "Effective Communication (Mail reply within 24 hrs)",
                "description": "Timely and polite response to all client and stakeholder emails",
                "targetScore": 10,
                "weightage": 10,
                "targetFromManager": "<2 delays",
                "targetValue": 2,
                "unit": "delays",
                "scoringDirection": "lower_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_ontime_status",
                "name": "Ontime Status Reporting / Daily Update",
                "description": "Daily standup and task tracking sheet consistency",
                "targetScore": 5,
                "weightage": 5,
                "targetFromManager": "0 misses",
                "targetValue": 0,
                "unit": "misses",
                "scoringDirection": "lower_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_escalations",
                "name": "Escalations Avoidance",
                "description": "Zero unresolved operational or delivery escalations",
                "targetScore": 5,
                "weightage": 5,
                "targetFromManager": "0",
                "targetValue": 0,
                "unit": "escalations",
                "scoringDirection": "lower_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_proactive_problem_solving",
                "name": "Proactive & Problem Solving",
                "description": "Anticipates bottlenecks and implements proactive solutions",
                "targetScore": 5,
                "weightage": 5,
                "targetFromManager": "1 initiative",
                "targetValue": 1,
                "unit": "initiatives",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": True
            }
        ]
    },
    {
        "id": "cat_cross_functional",
        "name": "Cross-functional Coordination",
        "description": "Process governance, inter-departmental alignment, and independence",
        "weightage": 20,
        "kpis": [
            {
                "id": "kpi_process_compliance",
                "name": "Process Compliance",
                "description": "Strict adherence to ISO, security, and quality checklist protocols",
                "targetScore": 10,
                "weightage": 10,
                "targetFromManager": "100%",
                "targetValue": 1,
                "unit": "checklists",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_supervision_needed",
                "name": "Internal Communication / Extent of Supervision Needed",
                "description": "Autonomous execution without requiring constant follow-ups",
                "targetScore": 10,
                "weightage": 10,
                "targetFromManager": "<2 followups",
                "targetValue": 2,
                "unit": "followups",
                "scoringDirection": "lower_is_better",
                "measurementType": "number",
                "isRequired": True
            }
        ]
    },
    {
        "id": "cat_collaborative",
        "name": "Collaborative Approach",
        "description": "Knowledge sharing, mentoring, innovation, and attendance compliance",
        "weightage": 20,
        "kpis": [
            {
                "id": "kpi_mentoring_innovation",
                "name": "Mentoring / Continuous Improvement / Innovation",
                "description": "Sharing best practices, training peers, and improving workflows",
                "targetScore": 10,
                "weightage": 10,
                "targetFromManager": "2 sessions",
                "targetValue": 2,
                "unit": "sessions",
                "scoringDirection": "higher_is_better",
                "measurementType": "number",
                "isRequired": True
            },
            {
                "id": "kpi_leave_notification",
                "name": "Leave / WFH Prior Notification Adherence",
                "description": "Advance notice for leaves/WFH without unplanned absences",
                "targetScore": 10,
                "weightage": 10,
                "targetFromManager": "0 unplanned",
                "targetValue": 0,
                "unit": "unplanned",
                "scoringDirection": "lower_is_better",
                "measurementType": "number",
                "isRequired": True
            }
        ]
    }
]

@performance_bp.route("/kpi-templates/system-default", methods=["GET"])
@auth_required
def get_system_default_kpi_template():
    """Returns clean system baseline categories from database repository"""
    return jsonify({"success": True, "categories": SYSTEM_DEFAULT_KPI_CATEGORIES}), 200

@performance_bp.route("/kpi-templates/manager", methods=["GET"])
@auth_required
def get_manager_kpi_templates():
    """Fetches all customized templates for a specific manager or team from PostgreSQL."""
    try:
        manager_id = request.args.get("manager_id")
        team_id = request.args.get("team_id")
        team_name = request.args.get("team_name")

        if not manager_id and not team_id and not team_name:
            return jsonify({"error": "manager_id, team_id, or team_name parameter is required"}), 400

        from sqlalchemy import or_
        templates = []
        canonical_mgr_id = None

        if manager_id:
            raw_id = str(manager_id).strip()
            clean_id = raw_id.lower().replace("emp-", "").replace("emp", "").strip()
            mgr_emp = Employee.query.filter(
                or_(
                    Employee.employee_id == raw_id,
                    Employee.employee_id == clean_id,
                    Employee.employee_id == f"emp-{clean_id}"
                )
            ).first()
            canonical_mgr_id = str(mgr_emp.employee_id) if mgr_emp and mgr_emp.employee_id else raw_id

            mgr_conditions = [
                ManagerKpiTemplate.manager_id == canonical_mgr_id,
                ManagerKpiTemplate.manager_id == raw_id,
                ManagerKpiTemplate.manager_id == clean_id
            ]

            # 1. Primary filter: fetch templates specifically created/assigned for this manager
            mgr_templates = ManagerKpiTemplate.query.filter(or_(*mgr_conditions)).order_by(ManagerKpiTemplate.template_key.asc()).all()
            if mgr_templates:
                templates = mgr_templates

        # 2. If no templates found specifically for this manager, check team-level general templates
        if not templates and (team_id or (team_name and team_name != "all_teams")):
            team_conditions = []
            if team_id:
                team_conditions.append(ManagerKpiTemplate.team_id == str(team_id))
            if team_name and team_name != "all_teams":
                team_conditions.append(ManagerKpiTemplate.team_name.ilike(f"%{team_name}%"))
                team_conditions.append(ManagerKpiTemplate.template_name.ilike(f"%{team_name}%"))

            if team_conditions:
                base_query = ManagerKpiTemplate.query.filter(or_(*team_conditions))
                if manager_id:
                    # If querying for a specific manager, strictly do NOT return templates belonging to another manager!
                    # Only allow templates that are general/unassigned or explicitly belong to this manager
                    base_query = base_query.filter(
                        or_(
                            ManagerKpiTemplate.manager_id.is_(None),
                            ManagerKpiTemplate.manager_id == "",
                            ManagerKpiTemplate.manager_id == "general",
                            ManagerKpiTemplate.manager_id == canonical_mgr_id,
                            ManagerKpiTemplate.manager_id == raw_id,
                            ManagerKpiTemplate.manager_id == clean_id
                        )
                    )
                else:
                    base_query = base_query.filter(
                        or_(
                            ManagerKpiTemplate.manager_id.is_(None),
                            ManagerKpiTemplate.manager_id == "",
                            ManagerKpiTemplate.manager_id == "general"
                        )
                    )
                team_templates = base_query.order_by(ManagerKpiTemplate.template_key.asc()).all()
                seen_keys = set()
                deduped = []
                for t in team_templates:
                    if t.template_key not in seen_keys:
                        seen_keys.add(t.template_key)
                        deduped.append(t)
                templates = deduped

        # Deduplicate final templates by template_key
        seen_keys = set()
        final_templates = []
        for t in templates:
            if t.template_key not in seen_keys:
                seen_keys.add(t.template_key)
                if t.template_key == "form_1" and t.template_name and "Form" in t.template_name:
                    import re
                    clean_name = re.sub(r'\s*\(Form\s*\d+\)', '', t.template_name, flags=re.IGNORECASE).strip()
                    if clean_name:
                        t.template_name = clean_name
                final_templates.append(t)

        default_tpl = next((t for t in final_templates if t.is_default), final_templates[0] if final_templates else None)
        active_key = default_tpl.template_key if default_tpl else (final_templates[0].template_key if final_templates else "form_1")

        return jsonify({
            "success": True,
            "manager_id": canonical_mgr_id or manager_id or "",
            "active_key": active_key,
            "templates": [t.to_dict() for t in final_templates]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/kpi-templates/manager", methods=["POST"])
@auth_required
def save_manager_kpi_template():
    """Upserts a specific form template for a manager or team into PostgreSQL database."""
    try:
        data = request.get_json() or {}
        manager_ids_raw = data.get("manager_ids") or data.get("manager_id") or ""
        template_key = str(data.get("template_key") or "form_1").strip().lower()
        template_name = str(data.get("template_name") or f"Form {template_key.replace('form_', '')}").strip()
        team_id = str(data.get("team_id") or "").strip()
        team_name = str(data.get("team_name") or "").strip()
        categories = data.get("categories") or []
        is_default = bool(data.get("is_default", False))
        status = str(data.get("status") or "draft").strip().lower()

        if isinstance(manager_ids_raw, list):
            mgr_id_list = [str(m).strip() for m in manager_ids_raw if str(m).strip()]
        elif isinstance(manager_ids_raw, str) and manager_ids_raw:
            mgr_id_list = [m.strip() for m in manager_ids_raw.split(",") if m.strip()]
        else:
            mgr_id_list = []

        if not mgr_id_list and not team_id and not team_name:
            return jsonify({"error": "manager_id, manager_ids, team_id, or team_name is required"}), 400

        now = datetime.utcnow()
        saved_templates = []

        if mgr_id_list:
            for m_id in mgr_id_list:
                canonical_mgr_id = m_id
                mgr_emp = Employee.query.filter(Employee.employee_id == str(m_id)).first()
                if mgr_emp:
                    canonical_mgr_id = str(mgr_emp.employee_id)
                    cur_mgr_name = mgr_emp.name or data.get("manager_name") or ""
                else:
                    cur_mgr_name = data.get("manager_name") or "Manager"

                tpl = ManagerKpiTemplate.query.filter(
                    ManagerKpiTemplate.manager_id == canonical_mgr_id,
                    ManagerKpiTemplate.template_key == template_key
                ).first()

                if not tpl:
                    tpl = ManagerKpiTemplate(
                        manager_id=canonical_mgr_id,
                        manager_name=cur_mgr_name,
                        template_key=template_key,
                        template_name=template_name,
                        team_id=team_id if team_id else None,
                        team_name=team_name if team_name else None,
                        categories=categories,
                        is_default=is_default,
                        status=status,
                        created_at=now,
                        updated_at=now
                    )
                    db.session.add(tpl)
                else:
                    tpl.manager_id = canonical_mgr_id
                    tpl.manager_name = cur_mgr_name or tpl.manager_name
                    tpl.template_name = template_name or tpl.template_name
                    if team_id:
                        tpl.team_id = team_id
                    if team_name:
                        tpl.team_name = team_name
                    tpl.categories = categories
                    if "is_default" in data:
                        tpl.is_default = is_default
                    if "status" in data:
                        tpl.status = status
                    tpl.updated_at = now

                if is_default and canonical_mgr_id:
                    other_tpls = ManagerKpiTemplate.query.filter(
                        ManagerKpiTemplate.manager_id == canonical_mgr_id,
                        ManagerKpiTemplate.template_key != template_key
                    ).all()
                    for o in other_tpls:
                        o.is_default = False

                saved_templates.append(tpl)
        else:
            # Fallback for team-only template without specific manager
            tpl = None
            if team_id:
                tpl = ManagerKpiTemplate.query.filter(
                    ManagerKpiTemplate.team_id == team_id,
                    ManagerKpiTemplate.template_key == template_key
                ).first()
            if not tpl and team_name:
                tpl = ManagerKpiTemplate.query.filter(
                    ManagerKpiTemplate.team_name.ilike(team_name),
                    ManagerKpiTemplate.template_key == template_key
                ).first()

            if not tpl:
                tpl = ManagerKpiTemplate(
                    manager_id="general",
                    manager_name=data.get("manager_name") or "Manager",
                    template_key=template_key,
                    template_name=template_name,
                    team_id=team_id if team_id else None,
                    team_name=team_name if team_name else None,
                    categories=categories,
                    is_default=is_default,
                    status=status,
                    created_at=now,
                    updated_at=now
                )
                db.session.add(tpl)
            else:
                tpl.template_name = template_name or tpl.template_name
                if team_id:
                    tpl.team_id = team_id
                if team_name:
                    tpl.team_name = team_name
                tpl.categories = categories
                if "is_default" in data:
                    tpl.is_default = is_default
                if "status" in data:
                    tpl.status = status
                tpl.updated_at = now
            saved_templates.append(tpl)

        db.session.commit()
        last_tpl = saved_templates[-1] if saved_templates else None
        return jsonify({
            "success": True,
            "template": last_tpl.to_dict() if last_tpl else {},
            "templates": [t.to_dict() for t in saved_templates]
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/kpi-templates/manager/rename", methods=["POST"])
@auth_required
def rename_manager_kpi_template():
    """Quickly renames a form template (e.g. Form 2 -> Form 2 - QA Team)."""
    try:
        data = request.get_json() or {}
        manager_id = str(data.get("manager_id") or "").strip()
        template_key = str(data.get("template_key") or "form_1").strip().lower()
        new_name = str(data.get("template_name") or "").strip()

        if not manager_id or not new_name:
            return jsonify({"error": "manager_id and template_name are required"}), 400

        mgr_emp = Employee.query.filter(Employee.employee_id == str(manager_id)).first()
        canonical_mgr_id = str(mgr_emp.employee_id) if mgr_emp and mgr_emp.employee_id else str(manager_id)

        tpl = ManagerKpiTemplate.query.filter(
            ManagerKpiTemplate.manager_id == canonical_mgr_id,
            ManagerKpiTemplate.template_key == template_key
        ).first()

        if not tpl:
            return jsonify({"error": "Template not found"}), 404

        tpl.template_name = new_name
        tpl.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"success": True, "template": tpl.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/kpi-templates/manager/delete", methods=["POST", "DELETE"])
@auth_required
def delete_manager_kpi_template():
    """Deletes a form template for a manager or multiple managers."""
    try:
        data = request.get_json() or {}
        manager_ids_raw = data.get("manager_id") or data.get("manager_ids") or []
        template_key = str(data.get("template_key") or "").strip().lower()

        if not template_key:
            return jsonify({"error": "template_key is required"}), 400

        if isinstance(manager_ids_raw, str):
            mgr_id_list = [m.strip() for m in manager_ids_raw.split(",") if m.strip()]
        elif isinstance(manager_ids_raw, list):
            mgr_id_list = [str(m).strip() for m in manager_ids_raw if str(m).strip()]
        else:
            mgr_id_list = []

        all_target_ids = set()
        for m_id in mgr_id_list:
            mgr_emp = Employee.query.filter(Employee.employee_id == str(m_id)).first()
            if mgr_emp and mgr_emp.employee_id:
                all_target_ids.add(str(mgr_emp.employee_id))
            else:
                all_target_ids.add(str(m_id))

        if all_target_ids:
            ManagerKpiTemplate.query.filter(
                ManagerKpiTemplate.manager_id.in_(list(all_target_ids)),
                ManagerKpiTemplate.template_key == template_key
            ).delete(synchronize_session=False)
            db.session.commit()
            ManagerKpiTemplate.query.filter(
                ManagerKpiTemplate.manager_id.in_(list(all_target_ids)),
                ManagerKpiTemplate.template_key == template_key
            ).delete(synchronize_session=False)
        else:
            ManagerKpiTemplate.query.filter(
                ManagerKpiTemplate.template_key == template_key
            ).delete(synchronize_session=False)

        db.session.commit()
        return jsonify({"success": True, "message": f"Template {template_key} deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# =========================================================================
# KPI WORKFLOW SPECIFIC ENDPOINTS (JSON METRICS BASED)
# =========================================================================

@performance_bp.route("/kpi-evaluations/assign", methods=["POST"])
@auth_required
def assign_kpi_metrics():
    """Reporting Manager creates and assigns performance metrics JSON structure to selected employees (1 row per employee)"""
    try:
        data = request.get_json() or {}
        form_name = data.get("form") or "KPI Evaluation Form"
        team_id = data.get("team_id", "")
        team_name = data.get("team_name", "")
        reporting_manager = data.get("reporting_manager", "")
        reporting_manager_id = str(data.get("reporting_manager_id", ""))
        service_manager = data.get("service_manager", "")
        service_manager_id = str(data.get("service_manager_id", ""))

        # Resolve canonical Employee.employee_id for reporting manager
        if reporting_manager_id or reporting_manager:
            mgr_emp = None
            if reporting_manager_id:
                mgr_emp = Employee.query.filter(Employee.employee_id == str(reporting_manager_id)).first()

            if not mgr_emp and reporting_manager:
                mgr_emp = Employee.query.filter(
                    func.lower(Employee.name) == reporting_manager.lower().strip()
                ).first()

            if mgr_emp and mgr_emp.employee_id:
                reporting_manager_id = str(mgr_emp.employee_id)
                if not reporting_manager and mgr_emp.name:
                    reporting_manager = mgr_emp.name

        # Resolve canonical Employee.employee_id for service manager
        if service_manager_id or service_manager:
            sm_emp = None
            if service_manager_id:
                sm_emp = Employee.query.filter(Employee.employee_id == str(service_manager_id)).first()

            if not sm_emp and service_manager:
                sm_emp = Employee.query.filter(
                    func.lower(Employee.name) == service_manager.lower().strip()
                ).first()

            if sm_emp and sm_emp.employee_id:
                service_manager_id = str(sm_emp.employee_id)
                if not service_manager and sm_emp.name:
                    service_manager = sm_emp.name

        employees = data.get("employees", [])
        
        # Accept categories (hierarchical tree) or metrics_data or fallback list
        categories_data = data.get("categories") or data.get("metrics_data") or data.get("metrics") or []

        if not employees:
            return jsonify({"error": "Please select at least one employee"}), 400
        if not categories_data:
            return jsonify({"error": "Please specify performance metrics categories"}), 400

        frequency = (data.get("frequency") or data.get("periodType") or data.get("period_type") or "quarterly").lower()
        start_date_str = data.get("startDate") or data.get("start_date") or data.get("from_date")
        end_date_str = data.get("endDate") or data.get("end_date") or data.get("to_date")
        from_date = None
        to_date = None
        if start_date_str:
            try:
                from_date = datetime.strptime(str(start_date_str)[:10], "%Y-%m-%d").date()
            except Exception:
                pass
        if end_date_str:
            try:
                to_date = datetime.strptime(str(end_date_str)[:10], "%Y-%m-%d").date()
            except Exception:
                pass

        if from_date and not to_date:
            to_date = from_date
        elif to_date and not from_date:
            from_date = to_date

        milestone_frequency = (data.get("milestone_frequency") or data.get("milestoneFrequency") or ("daily" if frequency == "daily" else ("weekly" if frequency == "weekly" else "monthly"))).lower()
        monthly_records_input = data.get("monthly_records") or []
        weekly_records_input = data.get("weekly_records") or []
        quarterly_records_input = data.get("quarterly_records") or []

        if frequency in ["yearly", "annual"] or frequency == "daily" or milestone_frequency == "daily":
            final_metrics_data = {
                "categories": categories_data,
                "milestone_frequency": milestone_frequency,
                "monthly_records": monthly_records_input,
                "weekly_records": weekly_records_input,
                "quarterly_records": quarterly_records_input,
                "daily_records": data.get("daily_records") or []
            }
        else:
            final_metrics_data = categories_data

        now = datetime.utcnow()
        created_records = []

        # Auto-save active template for reporting manager into PostgreSQL
        try:
            active_tpl_key = str(data.get("template_key") or "form_1").strip().lower()
            active_tpl_name = str(data.get("template_name") or "").strip()
            if reporting_manager_id and categories_data:
                mgr_saved_tpl = ManagerKpiTemplate.query.filter(
                    ManagerKpiTemplate.manager_id == str(reporting_manager_id),
                    ManagerKpiTemplate.template_key == active_tpl_key
                ).first()
                if not mgr_saved_tpl:
                    mgr_saved_tpl = ManagerKpiTemplate(
                        manager_id=str(reporting_manager_id),
                        manager_name=reporting_manager,
                        template_key=active_tpl_key,
                        template_name=active_tpl_name or f"Form {active_tpl_key.replace('form_', '')}",
                        team_id=str(team_id) if team_id else None,
                        team_name=team_name or None,
                        categories=categories_data,
                        is_default=True,
                        created_at=now,
                        updated_at=now
                    )
                    db.session.add(mgr_saved_tpl)
                else:
                    mgr_saved_tpl.categories = categories_data
                    if active_tpl_name:
                        mgr_saved_tpl.template_name = active_tpl_name
                    if team_id:
                        mgr_saved_tpl.team_id = str(team_id)
                    if team_name:
                        mgr_saved_tpl.team_name = team_name
                db.session.commit()
        except Exception as tpl_auto_err:
            db.session.rollback()
            print(f"Non-blocking template auto-save notice: {tpl_auto_err}")

        if frequency in ["weekly", "daily"]:
            store = read_eval_store()
            from_str = from_date.isoformat() if from_date else ""
            to_str = to_date.isoformat() if to_date else ""
            period_label = data.get("periodName") or data.get("period_name") or data.get("period") or ""
            cycle_id = f"cycle_json_{abs(hash(f'{team_name}_{form_name}_{frequency}_{from_str}_{to_str}_{period_label}')) % 1000000}"

            existing_cycle = next((
                c for c in store.get("cycles", [])
                if c.get("id") == cycle_id or (
                    c.get("name") == form_name and
                    c.get("frequency") == frequency and
                    c.get("startDate") == from_str and
                    c.get("endDate") == to_str
                )
            ), None)
            if not existing_cycle:
                period_label_cycle = period_label
                new_cycle = {
                    "id": cycle_id,
                    "name": form_name,
                    "form": form_name,
                    "frequency": frequency,
                    "startDate": from_str,
                    "endDate": to_str,
                    "periodName": period_label_cycle or form_name,
                    "description": f"Performance evaluation for {team_name}" + (f" ({period_label_cycle})" if period_label_cycle else ""),
                    "teamId": str(team_id) if team_id else "General",
                    "teamName": team_name or "General",
                    "managerId": str(reporting_manager_id),
                    "managerName": reporting_manager or "Reporting Manager",
                    "serviceManagerId": str(service_manager_id),
                    "serviceManagerName": service_manager or "Service Manager",
                    "categories": categories_data,
                    "employeeIds": [],
                    "isActive": True,
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat()
                }
                store.setdefault("cycles", []).append(new_cycle)
                existing_cycle = new_cycle

            for emp in employees:
                # Strictly use employee_id only
                emp_id = str(emp.get("employee_id") or "").strip()
                if not emp_id:
                    continue

                db_emp = Employee.query.filter(Employee.employee_id == str(emp_id)).first()
                if db_emp and (db_emp.is_active is False or str(db_emp.status or "").strip().lower() in ["inactive", "deactive", "deactivated"]):
                    continue

                emp_name = emp.get("name") or emp.get("employee_name") or (f"{db_emp.first_name or ''} {db_emp.last_name or ''}".strip() if db_emp else f"Employee {emp_id}")

                if emp_id not in existing_cycle.get("employeeIds", []):
                    existing_cycle.setdefault("employeeIds", []).append(emp_id)

                desc_text = f"Performance evaluation for {team_name}" + (f" ({period_label})" if period_label else "")

                stats = calculate_evaluation_working_days(emp_id, from_date, to_date) if (from_date and to_date) else {"working_days": 0, "leave_days": 0, "holiday_days": 0}

                existing_resp = next((
                    r for r in store.get("responses", [])
                    if str(r.get("employeeCode") or r.get("employeeId")) == emp_id and
                       (r.get("cycleId") == cycle_id or (
                           (r.get("form") == form_name or r.get("performance_metrics") == form_name) and
                           r.get("frequency") == frequency and
                           r.get("startDate") == from_str and
                           r.get("endDate") == to_str
                       ))
                ), None)

                milestone_freq_val = None if frequency in ["weekly", "daily"] else milestone_frequency
                if existing_resp:
                    existing_resp["categories"] = categories_data
                    existing_resp["metrics_data"] = categories_data
                    existing_resp["description"] = desc_text
                    existing_resp["workingDays"] = stats["working_days"]
                    existing_resp["leaveDays"] = stats["leave_days"]
                    existing_resp["holidayDays"] = stats["holiday_days"]
                    existing_resp["reportingManager"] = reporting_manager if reporting_manager else existing_resp.get("reportingManager")
                    existing_resp["reporting_manager"] = existing_resp["reportingManager"]
                    existing_resp["reporting_manager_id"] = reporting_manager_id if reporting_manager_id else existing_resp.get("reporting_manager_id")
                    existing_resp["serviceManager"] = service_manager if service_manager else existing_resp.get("serviceManager")
                    existing_resp["service_manager"] = existing_resp["serviceManager"]
                    existing_resp["service_manager_id"] = service_manager_id if service_manager_id else existing_resp.get("service_manager_id")
                    existing_resp["frequency"] = frequency
                    existing_resp["startDate"] = from_str
                    existing_resp["endDate"] = to_str
                    existing_resp["daily_records"] = data.get("daily_records") or []
                    existing_resp["weekly_records"] = []
                    existing_resp["milestone_frequency"] = milestone_freq_val
                    existing_resp["status"] = "Assigned to Employee"
                    existing_resp["updatedAt"] = now.isoformat()
                    created_records.append(existing_resp)
                else:
                    # Do not assign new metrics if this employee currently has a pending evaluation
                    pending_in_store = next((
                        r for r in store.get("responses", [])
                        if str(r.get("employeeCode") or r.get("employeeId")) == emp_id and
                           not r.get("is_archived") and
                           r.get("managerScore") is None and
                           r.get("status") not in ["approved", "completed", "sm_final_approval"]
                    ), None)
                    if pending_in_store:
                        continue

                    new_resp = {
                        "id": f"resp_json_{abs(hash(f'{emp_id}_{form_name}_{period_label}_{now.isoformat()}')) % 10000000}",
                        "cycleId": existing_cycle["id"],
                        "teamId": str(team_id) if team_id else "General",
                        "teamName": team_name or "General",
                        "employeeId": emp_id,
                        "employeeCode": emp_id,
                        "employeeName": emp_name,
                        "form": form_name,
                        "performance_metrics": form_name,
                        "periodName": period_label or form_name,
                        "description": desc_text,
                        "status": "Assigned to Employee",
                        "employeeOverallScore": 0.0,
                        "employeeRemarks": "",
                        "managerScore": None,
                        "managerRemarks": "",
                        "serviceManagerScore": None,
                        "serviceManagerRemarks": "",
                        "reportingManager": reporting_manager,
                        "reporting_manager": reporting_manager,
                        "reporting_manager_id": str(reporting_manager_id),
                        "serviceManager": service_manager,
                        "service_manager": service_manager,
                        "service_manager_id": str(service_manager_id),
                        "frequency": frequency,
                        "startDate": from_str,
                        "endDate": to_str,
                        "workingDays": stats["working_days"],
                        "leaveDays": stats["leave_days"],
                        "holidayDays": stats["holiday_days"],
                        "categories": categories_data,
                        "metrics_data": categories_data,
                        "daily_records": data.get("daily_records") or [],
                        "weekly_records": [],
                        "milestone_frequency": milestone_freq_val,
                        "kpiResponses": {},
                        "createdAt": now.isoformat(),
                        "updatedAt": now.isoformat()
                    }
                    store.setdefault("responses", []).append(new_resp)
                    created_records.append(new_resp)

            write_eval_store(store)
            return jsonify({
                "success": True, 
                "message": f"Assigned {frequency.capitalize()} KPI metrics to {len(created_records)} employee(s) (saved in folder store)",
                "evaluations": created_records
            }), 201

        # For Monthly, Quarterly, and Yearly evaluations: store directly in PostgreSQL database (kpi_evaluations table)
        for emp in employees:
            # Strictly use employee_id only
            emp_id = str(emp.get("employee_id") or "").strip()
            if not emp_id:
                continue

            # Skip inactive / deactivated employees
            db_emp = Employee.query.filter(Employee.employee_id == emp_id).first()
            if db_emp and (db_emp.is_active is False or str(db_emp.status or "").strip().lower() in ["inactive", "deactive", "deactivated"]):
                continue

            emp_name = emp.get("name") or emp.get("employee_name") or (f"{db_emp.first_name or ''} {db_emp.last_name or ''}".strip() if db_emp else f"Employee {emp_id}")

            period_label = data.get("periodName") or data.get("period_name") or data.get("period") or ""
            desc_text = f"Performance evaluation for {team_name}" + (f" ({period_label})" if period_label else "")

            stats = calculate_evaluation_working_days(emp_id, from_date, to_date) if (from_date and to_date) else {"working_days": 0, "leave_days": 0, "holiday_days": 0}

            emp_ids_to_match = [str(emp_id)]

            # Check if evaluation records already exist for this employee for this specific form/period
            filter_conditions = [
                KpiEvaluation.employee_id.in_(emp_ids_to_match),
                KpiEvaluation.form == form_name,
            ]
            if from_date:
                filter_conditions.append(KpiEvaluation.from_date == from_date)
            if to_date:
                filter_conditions.append(KpiEvaluation.to_date == to_date)
            if frequency:
                filter_conditions.append(KpiEvaluation.frequency == frequency)

            existing_records = KpiEvaluation.query.filter(*filter_conditions).order_by(KpiEvaluation.id.desc()).all()

            if existing_records:
                record = existing_records[0]
                # Clean up any duplicates in DB if present so strictly 1 row exists
                for extra in existing_records[1:]:
                    db.session.delete(extra)
                # Update existing row with latest assigned metrics JSON, form title, and team
                record.form = form_name
                record.performance_metrics = form_name
                record.description = desc_text
                record.team_id = str(team_id) if team_id else record.team_id
                record.team_name = team_name if team_name else record.team_name
                record.metrics_data = final_metrics_data
                record.target_score = "100"
                record.weightage = "100"
                record.reporting_manager = reporting_manager if reporting_manager else record.reporting_manager
                record.reporting_manager_id = reporting_manager_id if reporting_manager_id else record.reporting_manager_id
                record.manager_id = reporting_manager_id if reporting_manager_id else record.manager_id
                record.service_manager = service_manager if service_manager else record.service_manager
                record.service_manager_id = service_manager_id if service_manager_id else record.service_manager_id
                record.frequency = frequency
                record.from_date = from_date
                record.to_date = to_date
                record.working_days = stats["working_days"]
                record.leave_days = stats["leave_days"]
                record.holiday_days = stats["holiday_days"]
                record.status = "Assigned to Employee"
                record.updated_at = now
            else:
                record = KpiEvaluation(
                    form=form_name,
                    team_id=str(team_id),
                    team_name=team_name,
                    metrics_data=final_metrics_data,
                    performance_metrics=form_name,
                    description=desc_text,
                    target_score="100",
                    weightage="100",
                    actual_earned_mark="",
                    earned_score="",
                    employee_overall_score=0.0,
                    employee_remark="",
                    manager_actual_pm="",
                    manager_approve_score="",
                    manager_remark="",
                    service_manager_approve_status="Pending",
                    service_manager_score="",
                    remark="",
                    employee_id=emp_id,
                    employee_name=emp_name,
                    reporting_manager=reporting_manager,
                    reporting_manager_id=reporting_manager_id,
                    manager_id=reporting_manager_id,
                    service_manager=service_manager,
                    service_manager_id=service_manager_id,
                    frequency=frequency,
                    from_date=from_date,
                    to_date=to_date,
                    working_days=stats["working_days"],
                    leave_days=stats["leave_days"],
                    holiday_days=stats["holiday_days"],
                    status="Assigned to Employee",
                    created_at=now,
                    updated_at=now
                )
                db.session.add(record)

            db.session.flush()
            created_records.append(record)

        db.session.commit()

        # Dual-write to JSON store as backup so the assignment is visible immediately on the next poll
        # even if the DB query has a momentary delay or connection issue.
        try:
            period_label_json = data.get("periodName") or data.get("period_name") or data.get("period") or ""
            store_json = read_eval_store()

            # Upsert a cycle entry in JSON store for this assignment group
            cycle_id_json = f"cycle_db_{abs(hash(f'{team_name}_{form_name}')) % 1000000}"
            existing_json_cycle = next((
                c for c in store_json.get("cycles", [])
                if c.get("id") == cycle_id_json or
                   (c.get("name") == form_name and str(c.get("teamName") or "").lower() == str(team_name or "").lower())
            ), None)
            if not existing_json_cycle:
                existing_json_cycle = {
                    "id": cycle_id_json,
                    "name": form_name,
                    "form": form_name,
                    "frequency": frequency,
                    "startDate": from_date.isoformat() if from_date else "",
                    "endDate": to_date.isoformat() if to_date else "",
                    "periodName": period_label_json or form_name,
                    "description": f"Performance evaluation for {team_name}" + (f" ({period_label_json})" if period_label_json else ""),
                    "teamId": str(team_id) if team_id else "General",
                    "teamName": team_name or "General",
                    "managerId": str(reporting_manager_id),
                    "managerName": reporting_manager or "Reporting Manager",
                    "serviceManagerId": str(service_manager_id),
                    "serviceManagerName": service_manager or "Service Manager",
                    # NOTE: categories/metrics NOT stored in JSON — DB is authoritative for full KPI data
                    "employeeIds": [],
                    "isActive": True,
                    "createdAt": now.isoformat(),
                    "updatedAt": now.isoformat()
                }
                store_json.setdefault("cycles", []).append(existing_json_cycle)
            else:
                # Update existing cycle metadata (no categories — kept in DB only)
                existing_json_cycle["updatedAt"] = now.isoformat()

            # Upsert each employee's response in JSON store
            for record in created_records:
                emp_id_json = str(record.employee_id or "")
                if emp_id_json and emp_id_json not in existing_json_cycle.get("employeeIds", []):
                    existing_json_cycle.setdefault("employeeIds", []).append(emp_id_json)

                resp_id_json = f"resp_{record.id}"
                existing_json_resp = next((
                    r for r in store_json.get("responses", [])
                    if r.get("id") == resp_id_json or r.get("db_id") == record.id
                ), None)
                if not existing_json_resp:
                    store_json.setdefault("responses", []).append({
                        "id": resp_id_json,
                        "db_id": record.id,
                        "cycleId": existing_json_cycle["id"],
                        "teamId": str(record.team_id or ""),
                        "teamName": str(record.team_name or ""),
                        "employeeId": emp_id_json,
                        "employeeCode": emp_id_json,
                        "employeeName": record.employee_name or "",
                        "form": record.form or "",
                        "performance_metrics": record.performance_metrics or record.form or "",
                        "periodName": period_label_json or record.form or "",
                        "description": record.description or "",
                        "status": record.status or "Assigned to Employee",
                        "employeeOverallScore": record.employee_overall_score or 0.0,
                        "employeeRemarks": record.employee_remark or "",
                        "managerScore": record.manager_score,
                        "managerRemarks": record.manager_remark or "",
                        "serviceManagerScore": float(record.service_manager_score) if (record.service_manager_score and str(record.service_manager_score).replace('.', '', 1).isdigit()) else None,
                        "serviceManagerRemarks": record.remark or "",
                        "reportingManager": record.reporting_manager or "",
                        "reporting_manager": record.reporting_manager or "",
                        "reporting_manager_id": str(record.reporting_manager_id or ""),
                        "serviceManager": record.service_manager or "",
                        "service_manager": record.service_manager or "",
                        "service_manager_id": str(record.service_manager_id or ""),
                        "frequency": record.frequency or "quarterly",
                        "startDate": record.from_date.isoformat() if record.from_date else "",
                        "endDate": record.to_date.isoformat() if record.to_date else "",
                        "workingDays": record.working_days or 0,
                        "leaveDays": record.leave_days or 0,
                        "holidayDays": record.holiday_days or 0,
                        # NOTE: categories/metrics_data NOT stored in JSON — DB is authoritative for full KPI data
                        # This keeps the JSON file lightweight even as assignments grow over years
                        "kpiResponses": {},
                        "createdAt": record.created_at.isoformat() if record.created_at else now.isoformat(),
                        "updatedAt": record.updated_at.isoformat() if record.updated_at else now.isoformat()
                    })
                else:
                    # Update existing JSON record — minimal fields only, no categories bulk
                    existing_json_resp["status"] = record.status or "Assigned to Employee"
                    existing_json_resp["frequency"] = record.frequency or "quarterly"
                    existing_json_resp["startDate"] = record.from_date.isoformat() if record.from_date else existing_json_resp.get("startDate", "")
                    existing_json_resp["endDate"] = record.to_date.isoformat() if record.to_date else existing_json_resp.get("endDate", "")
                    existing_json_resp["updatedAt"] = now.isoformat()

            write_eval_store(store_json)
        except Exception as json_sync_err:
            print(f"Warning: Could not dual-write assignment to JSON store: {json_sync_err}")

        try:
            from extensions import socketio
            socketio.emit("evaluation_update", {"action": "assigned", "count": len(created_records)})
        except Exception as sock_err:
            print(f"Socket emit notice: {sock_err}")

        return jsonify({
            "success": True,
            "message": f"Assigned KPI metrics to {len(created_records)} employee(s) (stored in DB)",
            "evaluations": [r.to_dict() if hasattr(r, 'to_dict') else r for r in created_records]
        }), 201
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@performance_bp.route("/kpi-evaluations/rollup", methods=["POST"])
@auth_required
def trigger_kpi_evaluation_rollup():
    """Manually triggers hierarchical rolling aggregation on kpi_evaluations."""
    try:
        from services.kpi_evaluation_rollup_service import auto_rollup_kpi_evaluations_job
        count = auto_rollup_kpi_evaluations_job()
        return jsonify({
            "success": True,
            "message": f"Rollup completed. Processed {count} period(s).",
            "rolled_up_count": count
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@performance_bp.route("/kpi-evaluations/convert-daily-to-weekly", methods=["POST"])
@auth_required
def convert_daily_kpi_to_weekly():
    """
    Explicit conversion of daily evaluations into 1 consolidated weekly evaluation.
    Calculates average percentage score across evaluated days (Sum / Count),
    creates 1 weekly record, and soft-archives daily records (Option B).
    """
    try:
        data = request.get_json() or {}
        employee_id = data.get("employee_id") or data.get("employeeId")
        week_start_str = data.get("week_start") or data.get("weekStart")
        week_end_str = data.get("week_end") or data.get("weekEnd")
        record_ids = data.get("record_ids") or data.get("recordIds") or []

        week_start = None
        week_end = None
        if week_start_str:
            try:
                week_start = datetime.strptime(str(week_start_str).split("T")[0], "%Y-%m-%d").date()
            except Exception:
                pass
        if week_end_str:
            try:
                week_end = datetime.strptime(str(week_end_str).split("T")[0], "%Y-%m-%d").date()
            except Exception:
                pass

        from services.kpi_evaluation_rollup_service import convert_daily_to_weekly_records
        weekly_rec = convert_daily_to_weekly_records(
            employee_id=str(employee_id) if employee_id else None,
            week_start=week_start,
            week_end=week_end,
            record_ids=record_ids
        )

        if not weekly_rec:
            return jsonify({"success": False, "message": "No active daily evaluation records found to convert."}), 404

        score = weekly_rec.employee_overall_score if hasattr(weekly_rec, "employee_overall_score") else (weekly_rec.get("employeeOverallScore") or weekly_rec.get("employee_overall_score") or 0.0)
        rec_dict = weekly_rec.to_dict() if hasattr(weekly_rec, "to_dict") else weekly_rec
        return jsonify({
            "success": True,
            "message": f"Successfully converted daily evaluations into weekly record (Score: {score}%).",
            "weekly_evaluation": rec_dict
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@performance_bp.route("/kpi-evaluations/convert", methods=["POST"])
@auth_required
def convert_evaluations():
    """
    Unified multi-tier evaluation rollup & conversion endpoint:
    - daily -> weekly
    - weekly -> monthly
    - monthly -> quarterly
    - quarterly -> yearly
    """
    try:
        data = request.get_json() or {}
        employee_id = data.get("employee_id") or data.get("employeeId")
        from_frequency = (data.get("from_frequency") or data.get("fromFrequency") or "").strip().lower()
        to_frequency = (data.get("to_frequency") or data.get("toFrequency") or "").strip().lower()
        record_ids = data.get("record_ids") or data.get("recordIds") or []

        if not from_frequency or not to_frequency:
            return jsonify({"success": False, "message": "Both from_frequency and to_frequency are required."}), 400

        from services.kpi_evaluation_rollup_service import convert_evaluations_tier
        new_record = convert_evaluations_tier(
            employee_id=str(employee_id) if employee_id else None,
            from_frequency=from_frequency,
            to_frequency=to_frequency,
            record_ids=record_ids
        )

        if not new_record:
            return jsonify({
                "success": False,
                "message": f"No active {from_frequency} records found to convert into {to_frequency}."
            }), 404

        score = new_record.employee_overall_score if hasattr(new_record, "employee_overall_score") else (new_record.get("employeeOverallScore") or new_record.get("employee_overall_score") or 0.0)
        rec_dict = new_record.to_dict() if hasattr(new_record, "to_dict") else new_record
        return jsonify({
            "success": True,
            "message": f"Successfully converted {from_frequency} evaluation(s) into {to_frequency} record (Score: {score}%).",
            "evaluation": rec_dict,
            "weekly_evaluation": rec_dict
        }), 200
    except ValueError as ve:
        return jsonify({"success": False, "message": str(ve)}), 400
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500




@performance_bp.route("/kpi-evaluations/submit-employee", methods=["POST"])
@auth_required
def submit_employee_kpi():
    """Employee fills actual marks, earned scores, and remarks, then submits to manager"""
    try:
        data = request.get_json() or {}
        now = datetime.utcnow()
        
        # Support batch items or single payload
        items = data.get("items") or (data if isinstance(data, list) else [data])
        updated_records = []

        store = read_eval_store()
        store_responses = store.get("responses", [])

        for item in items:
            raw_id = item.get("id")
            rec_id = None
            if raw_id:
                clean_id = str(raw_id).replace("resp_", "").replace("eval_", "").strip()
                if clean_id.isdigit():
                    rec_id = int(clean_id)
            emp_id = str(item.get("employee_id") or "")
            form_name = item.get("form") or item.get("periodName") or item.get("performance_metrics")
            period_name = str(item.get("periodName") or "").strip()
            raw_responses = item.get("responses") or item.get("kpiResponses") or {}

            record = None
            if rec_id:
                record = KpiEvaluation.query.get(rec_id)
            if not record and emp_id:
                q = KpiEvaluation.query.filter(KpiEvaluation.employee_id == emp_id)
                if form_name or period_name:
                    sub_conds = []
                    if form_name:
                        sub_conds.extend([KpiEvaluation.form == form_name, KpiEvaluation.performance_metrics == form_name])
                    if period_name:
                        sub_conds.append(KpiEvaluation.description.ilike(f"%{period_name}%"))
                    q = q.filter(or_(*sub_conds))
                # Prioritize active pending/draft record to avoid overwriting calibrated historical ones
                q_pending = q.filter(KpiEvaluation.status.in_(["Assigned to Employee", "employee_in_progress", "Pending", "draft", "Draft", "manager_review", "Submitted to Manager"]))
                record = q_pending.order_by(KpiEvaluation.id.desc()).first() or q.order_by(KpiEvaluation.id.desc()).first()

            if record:
                # Update metrics_data with merged responses
                cats = item.get("metrics_data") or item.get("categories") or record.metrics_data or []
                if isinstance(cats, list) and raw_responses:
                    record.metrics_data = merge_kpi_responses_into_categories(cats, raw_responses)
                elif "metrics_data" in item:
                    record.metrics_data = item["metrics_data"]
                elif "categories" in item:
                    record.metrics_data = item["categories"]
                
                score_val = item.get("employee_overall_score") or item.get("earned_score") or item.get("actual_earned_mark")
                if score_val is not None:
                    try:
                        record.employee_overall_score = float(score_val)
                    except (ValueError, TypeError):
                        pass
                    record.earned_score = str(score_val)
                    record.actual_earned_mark = str(score_val)

                if "employee_remark" in item:
                    record.employee_remark = item["employee_remark"]
                elif "employeeRemarks" in item:
                    record.employee_remark = item["employeeRemarks"]

                record.status = "Submitted to Manager"
                record.submitted_at = now
                record.updated_at = now
                updated_records.append(record)

                # Sync to store_responses targeting the exact record
                target_r_ids = [str(raw_id), f"resp_{record.id}", str(record.id)]
                store_resp = next((r for r in store_responses if str(r.get("id")) in target_r_ids), None)
                if not store_resp and (form_name or period_name):
                    target_p = form_name or period_name
                    store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id and (r.get("periodName") == target_p or r.get("form") == target_p)), None)
                if not store_resp:
                    store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id and r.get("status") not in ["Calibrated & Approved", "Published", "approved", "Approved"]), None)

                if store_resp:
                    store_resp["status"] = "manager_review"
                    if isinstance(record.metrics_data, list):
                        store_resp["categories"] = record.metrics_data
                        store_resp["metrics_data"] = record.metrics_data
                    if raw_responses:
                        if "kpiResponses" not in store_resp or not store_resp["kpiResponses"]:
                            store_resp["kpiResponses"] = raw_responses
                        else:
                            store_resp["kpiResponses"].update(raw_responses)
                    if score_val is not None:
                        try:
                            store_resp["employeeOverallScore"] = float(score_val)
                        except (ValueError, TypeError):
                            pass
                    if record.employee_remark:
                        store_resp["employeeRemarks"] = record.employee_remark
                    store_resp["employeeSubmittedAt"] = now.isoformat()
                    store_resp["updatedAt"] = now.isoformat()
            else:
                # Target JSON evaluation in store_responses directly (Daily & Weekly)
                target_r_ids = [str(raw_id), f"resp_{rec_id}" if rec_id else "", str(rec_id) if rec_id else ""]
                target_r_ids = [x for x in target_r_ids if x]
                store_resp = next((r for r in store_responses if str(r.get("id")) in target_r_ids), None)
                if not store_resp and (form_name or period_name):
                    target_p = form_name or period_name
                    store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id and (r.get("periodName") == target_p or r.get("form") == target_p)), None)
                if not store_resp and emp_id:
                    store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id and r.get("status") not in ["Calibrated & Approved", "Published", "approved", "Approved"]), None)

                if store_resp:
                    cats = item.get("metrics_data") or item.get("categories") or store_resp.get("categories") or store_resp.get("metrics_data") or []
                    if isinstance(cats, list) and raw_responses:
                        store_resp["categories"] = merge_kpi_responses_into_categories(cats, raw_responses)
                        store_resp["metrics_data"] = store_resp["categories"]
                    score_val = item.get("employee_overall_score") or item.get("earned_score") or item.get("actual_earned_mark")
                    if score_val is not None:
                        try:
                            store_resp["employeeOverallScore"] = float(score_val)
                        except (ValueError, TypeError):
                            pass
                    emp_rem = item.get("employee_remark") or item.get("employeeRemarks")
                    if emp_rem:
                        store_resp["employeeRemarks"] = emp_rem
                    if raw_responses:
                        if "kpiResponses" not in store_resp or not store_resp["kpiResponses"]:
                            store_resp["kpiResponses"] = raw_responses
                        else:
                            store_resp["kpiResponses"].update(raw_responses)
                    store_resp["status"] = "manager_review"
                    store_resp["employeeSubmittedAt"] = now.isoformat()
                    store_resp["updatedAt"] = now.isoformat()
                    updated_records.append(store_resp)

        db.session.commit()
        store["responses"] = store_responses
        write_eval_store(store)

        return jsonify({
            "success": True, 
            "message": "Evaluation submitted to reporting manager successfully",
            "evaluations": [r.to_dict() if hasattr(r, 'to_dict') else r for r in updated_records]
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@performance_bp.route("/kpi-evaluations/review-manager", methods=["POST"])
@auth_required
def review_manager_kpi():
    """Reporting manager evaluates employee, sets manager score & remarks, then forwards to Service Manager"""
    try:
        data = request.get_json() or {}
        now = datetime.utcnow()
        items = data.get("items") or (data if isinstance(data, list) else [data])
        updated_records = []

        store = read_eval_store()
        store_responses = store.get("responses", [])

        for item in items:
            raw_id = item.get("id")
            rec_id = None
            if raw_id:
                clean_id = str(raw_id).replace("resp_", "").replace("eval_", "").strip()
                if clean_id.isdigit():
                    rec_id = int(clean_id)
            emp_id = str(item.get("employee_id") or "")
            form_name = item.get("form") or item.get("periodName") or item.get("performance_metrics")
            period_name = str(item.get("periodName") or "").strip()
            raw_responses = item.get("responses") or item.get("kpiResponses") or {}

            record = None
            if rec_id:
                record = KpiEvaluation.query.get(rec_id)
            if not record and emp_id:
                q = KpiEvaluation.query.filter(KpiEvaluation.employee_id == emp_id)
                if form_name or period_name:
                    sub_conds = []
                    if form_name:
                        sub_conds.extend([KpiEvaluation.form == form_name, KpiEvaluation.performance_metrics == form_name])
                    if period_name:
                        sub_conds.append(KpiEvaluation.description.ilike(f"%{period_name}%"))
                    q = q.filter(or_(*sub_conds))
                record = q.order_by(KpiEvaluation.id.desc()).first()

            if record:
                cats = item.get("metrics_data") or item.get("categories") or record.metrics_data or []
                if isinstance(cats, list) and raw_responses:
                    record.metrics_data = merge_kpi_responses_into_categories(cats, raw_responses)
                elif "metrics_data" in item:
                    record.metrics_data = item["metrics_data"]
                
                mgr_score = item.get("manager_score") or item.get("manager_approve_score") or item.get("managerScore")
                if mgr_score is not None:
                    try:
                        record.manager_score = float(mgr_score)
                    except (ValueError, TypeError):
                        pass
                    record.manager_approve_score = str(mgr_score)
                
                if "manager_remark" in item:
                    record.manager_remark = item["manager_remark"]
                elif "managerRemarks" in item:
                    record.manager_remark = item["managerRemarks"]

                record.status = "approved"
                record.service_manager_approve_status = "Approved"
                if mgr_score is not None:
                    record.service_manager_score = str(mgr_score)
                record.reviewed_at = now
                record.updated_at = now
                updated_records.append(record)

                target_r_ids = [str(raw_id), f"resp_{record.id}", str(record.id)]
                store_resp = next((r for r in store_responses if str(r.get("id")) in target_r_ids), None)
                if not store_resp and (form_name or period_name):
                    target_p = form_name or period_name
                    store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id and (r.get("periodName") == target_p or r.get("form") == target_p)), None)
                if not store_resp:
                    store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id), None)
                if store_resp:
                    store_resp["status"] = "approved"
                    if isinstance(record.metrics_data, list):
                        store_resp["categories"] = record.metrics_data
                        store_resp["metrics_data"] = record.metrics_data
                    if raw_responses:
                        if "kpiResponses" not in store_resp or not store_resp["kpiResponses"]:
                            store_resp["kpiResponses"] = raw_responses
                        else:
                            store_resp["kpiResponses"].update(raw_responses)
                    if mgr_score is not None:
                        try:
                            store_resp["managerScore"] = float(mgr_score)
                            store_resp["serviceManagerScore"] = float(mgr_score)
                        except (ValueError, TypeError):
                            pass
                    if record.manager_remark:
                        store_resp["managerRemarks"] = record.manager_remark
                    store_resp["managerReviewedAt"] = now.isoformat()
                    store_resp["serviceManagerApprovedAt"] = now.isoformat()
                    store_resp["updatedAt"] = now.isoformat()
            else:
                # Target JSON evaluation in store_responses directly (Daily & Weekly)
                target_r_ids = [str(raw_id), f"resp_{rec_id}" if rec_id else "", str(rec_id) if rec_id else ""]
                target_r_ids = [x for x in target_r_ids if x]
                store_resp = next((r for r in store_responses if str(r.get("id")) in target_r_ids), None)
                if not store_resp and (form_name or period_name):
                    target_p = form_name or period_name
                    store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id and (r.get("periodName") == target_p or r.get("form") == target_p)), None)
                if not store_resp and emp_id:
                    store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id), None)

                if store_resp:
                    cats = item.get("metrics_data") or item.get("categories") or store_resp.get("categories") or store_resp.get("metrics_data") or []
                    if isinstance(cats, list) and raw_responses:
                        store_resp["categories"] = merge_kpi_responses_into_categories(cats, raw_responses)
                        store_resp["metrics_data"] = store_resp["categories"]
                    mgr_score = item.get("manager_score") or item.get("manager_approve_score") or item.get("managerScore")
                    if mgr_score is not None:
                        try:
                            store_resp["managerScore"] = float(mgr_score)
                            store_resp["serviceManagerScore"] = float(mgr_score)
                        except (ValueError, TypeError):
                            pass
                    mgr_rem = item.get("manager_remark") or item.get("managerRemarks")
                    if mgr_rem:
                        store_resp["managerRemarks"] = mgr_rem
                    if raw_responses:
                        if "kpiResponses" not in store_resp or not store_resp["kpiResponses"]:
                            store_resp["kpiResponses"] = raw_responses
                        else:
                            store_resp["kpiResponses"].update(raw_responses)
                    store_resp["status"] = "approved"
                    store_resp["managerReviewedAt"] = now.isoformat()
                    store_resp["serviceManagerApprovedAt"] = now.isoformat()
                    store_resp["updatedAt"] = now.isoformat()
                    updated_records.append(store_resp)

        db.session.commit()
        store["responses"] = store_responses
        write_eval_store(store)

        return jsonify({
            "success": True, 
            "message": "Evaluation approved and published to employee report successfully",
            "evaluations": [r.to_dict() if hasattr(r, 'to_dict') else r for r in updated_records]
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/kpi-evaluations/approve-service-manager", methods=["POST"])
@auth_required
def approve_service_manager_kpi():
    """Service Manager reviews and approves/rejects evaluation"""
    try:
        data = request.get_json() or {}
        now = datetime.utcnow()
        items = data.get("items") or (data if isinstance(data, list) else [data])
        decision = data.get("decision", "Approved") # "Approved" or "Returned"
        updated_records = []

        for item in items:
            rec_id = item.get("id")
            emp_id = str(item.get("employee_id") or "")
            form_name = item.get("form")

            record = None
            if rec_id:
                record = KpiEvaluation.query.get(rec_id)
            elif emp_id:
                q = KpiEvaluation.query.filter(KpiEvaluation.employee_id == emp_id)
                if form_name:
                    q = q.filter(KpiEvaluation.form == form_name)
                record = q.order_by(KpiEvaluation.updated_at.desc()).first()

            if record:
                sm_score = item.get("service_manager_score") or item.get("serviceManagerScore")
                if sm_score is not None:
                    record.service_manager_score = str(sm_score)

                if "remark" in item:
                    record.remark = item["remark"]
                elif "serviceManagerRemarks" in item:
                    record.remark = item["serviceManagerRemarks"]

                record.service_manager_approve_status = decision
                record.status = "Approved" if decision == "Approved" else "Returned to Manager"
                record.approved_at = now
                record.updated_at = now
                updated_records.append(record)

        db.session.commit()
        return jsonify({
            "success": True, 
            "message": f"Evaluation status updated to {decision}",
            "evaluations": [r.to_dict() for r in updated_records]
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500




