from datetime import datetime
from sqlalchemy import or_, func
from utils.compat import Blueprint, request, jsonify
from models.database import db
from models.employee import Employee
from models.performance import EmployeePerformance
from models.kpi_evaluation import KpiEvaluation
from middleware.auth import auth_required, access_level_required

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

def get_eval_store_path():
    uploads_dir = get_uploads_dir()
    eval_dir = os.path.join(uploads_dir, "evaluations")
    os.makedirs(eval_dir, exist_ok=True)
    new_path = os.path.join(eval_dir, "evaluation_store.json")
    old_path = os.path.join(uploads_dir, "evaluation_store.json")
    # Seamless migration: if old path exists and new doesn't, copy over
    if os.path.exists(old_path) and not os.path.exists(new_path):
        try:
            import shutil
            shutil.copy2(old_path, new_path)
        except Exception:
            pass
    return new_path

def read_eval_store():
    path = get_eval_store_path()
    if not os.path.exists(path):
        return {"cycles": [], "responses": [], "ratingScale": DEFAULT_RATING_SCALE}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return {"cycles": [], "responses": [], "ratingScale": DEFAULT_RATING_SCALE}
            if "ratingScale" not in data or not data["ratingScale"]:
                data["ratingScale"] = DEFAULT_RATING_SCALE
            return data
    except Exception:
        return {"cycles": [], "responses": [], "ratingScale": DEFAULT_RATING_SCALE}

def write_eval_store(data):
    path = get_eval_store_path()
    if "ratingScale" not in data or not data["ratingScale"]:
        data["ratingScale"] = DEFAULT_RATING_SCALE
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def sync_postgres_kpi_to_store_and_back():
    """
    Tiered Storage Separation:
    - Daily & Weekly evaluations are stored strictly in JSON format (data/uploads/evaluations/evaluation_store.json).
    - Monthly, Quarterly & Yearly evaluations are stored in PostgreSQL database (kpi_evaluations table).
    """
    try:
        store = read_eval_store()

        # One-time migration: migrate any legacy daily or weekly rows from DB into JSON store, then clean up from DB
        legacy_db_daily_weekly = KpiEvaluation.query.filter(
            KpiEvaluation.frequency.in_(["daily", "weekly"])
        ).all()
        if legacy_db_daily_weekly:
            existing_ids = {str(r.get("id")) for r in store.get("responses", [])}
            existing_db_ids = {r.get("db_id") for r in store.get("responses", []) if r.get("db_id")}
            for rec in legacy_db_daily_weekly:
                if rec.id not in existing_db_ids and f"resp_{rec.id}" not in existing_ids:
                    store.setdefault("responses", []).append(rec.to_dict())
                db.session.delete(rec)
            db.session.commit()
            write_eval_store(store)

        # Query PostgreSQL strictly for Monthly, Quarterly, and Yearly evaluations
        eval_records = KpiEvaluation.query.filter(
            or_(KpiEvaluation.is_archived == False, KpiEvaluation.is_archived.is_(None)),
            or_(
                KpiEvaluation.frequency.in_(["monthly", "quarterly", "yearly"]),
                KpiEvaluation.frequency.is_(None)
            )
        ).order_by(KpiEvaluation.id.desc()).all()

        return eval_records, store
    except Exception as e:
        print(f"Error syncing KPI records: {e}")
        db.session.rollback()
        # IMPORTANT: Do NOT return empty eval_records on exception.
        # Previously returning [] caused get_evaluation_data() to wipe all monthly/quarterly
        # responses from JSON on every DB error. Instead, return whatever is in the JSON store
        # as a lightweight fallback so data persists through temporary DB issues.
        fallback_store = read_eval_store()
        return None, fallback_store  # None signals "use JSON fallback, do not wipe"

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
                                "managerActualValue": mgr_act,
                                "managerScore": mgr_sc,
                                "managerRemarks": mgr_rem
                            }
                            res[k_id] = item_obj
                            if kpi.get("name"):
                                res[kpi.get("name")] = item_obj
        return res
    return {}

@performance_bp.route("/evaluation/data", methods=["GET"])
def get_evaluation_data():
    try:
        eval_records, store = sync_postgres_kpi_to_store_and_back()
        db_unavailable = eval_records is None  # DB had an exception; use JSON-only fallback
        if db_unavailable:
            eval_records = []

        # 1. Dynamically build and maintain cycles directly from PostgreSQL KpiEvaluation records
        team_eval_groups = {}
        for rec in eval_records:
            t_key = rec.team_name or rec.team_id or "General"
            f_name = rec.form or "Performance Evaluation"
            f_date_str = rec.from_date.isoformat() if rec.from_date else ""
            t_date_str = rec.to_date.isoformat() if rec.to_date else ""
            freq_str = rec.frequency or "quarterly"
            group_key = f"{t_key}_{f_name}_{freq_str}_{f_date_str}_{t_date_str}"
            
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

        if eval_records:
            cycles = []
            for g_key, g_info in team_eval_groups.items():
                categories_from_db = g_info["metrics_data"] if isinstance(g_info["metrics_data"], list) else []
                new_c_id = f"cycle_db_{abs(hash(g_key)) % 1000000}"
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
                    "createdAt": g_info["createdAt"],
                    "updatedAt": g_info["updatedAt"]
                })
        else:
            cycles = store.get("cycles", [])

        # 2. Build responses directly from DB records (single source of truth)
        if eval_records:
            responses = []
            for rec in eval_records:
                emp_id = str(rec.employee_id or "")
                emp_obj = Employee.query.filter(
                    or_(Employee.employee_id == emp_id, Employee.id == int(emp_id) if emp_id.isdigit() else False)
                ).first()
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
                    "startDate": rec.from_date.isoformat() if rec.from_date else "",
                    "endDate": rec.to_date.isoformat() if rec.to_date else "",
                    "workingDays": rec.working_days or 0,
                    "leaveDays": rec.leave_days or 0,
                    "holidayDays": rec.holiday_days or 0,
                    "categories": rec.metrics_data if isinstance(rec.metrics_data, list) else [],
                    "metrics_data": rec.metrics_data,
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

        # Start with DB-derived responses, then append any JSON-only responses not already present.
        merged_responses = list(responses)
        existing_resp_ids = {r.get("id") for r in merged_responses}
        # Also track by db_id to avoid duplicating records already fetched from DB
        existing_db_ids = {r.get("db_id") for r in merged_responses if r.get("db_id")}
        for r in json_all_responses:
            r_id = r.get("id")
            r_db_id = r.get("db_id")
            if r_id not in existing_resp_ids and (not r_db_id or r_db_id not in existing_db_ids):
                merged_responses.append(r)

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
        req_data = request.get_json()
        store = read_eval_store()
        cycles = store.get("cycles", [])
        
        if isinstance(req_data, list):
            cycles = req_data
        elif isinstance(req_data, dict):
            cycle_id = req_data.get("id")
            existing_idx = next((i for i, c in enumerate(cycles) if c.get("id") == cycle_id), -1)
            if existing_idx >= 0:
                cycles[existing_idx] = req_data
            else:
                cycles.insert(0, req_data)

        store["cycles"] = cycles
        write_eval_store(store)
        return jsonify({"success": True, "cycles": cycles}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/evaluation/cycles/<cycle_id>", methods=["DELETE"])
def delete_evaluation_cycle(cycle_id):
    try:
        req_data = request.get_json(silent=True) or {}
        store = read_eval_store()
        cycles = store.get("cycles", [])
        responses = store.get("responses", [])

        target_cycle = next((c for c in cycles if str(c.get("id")) == str(cycle_id)), None)
        team_id = str(req_data.get("teamId") or (target_cycle.get("teamId") if target_cycle else "") or "")
        team_name = req_data.get("teamName") or (target_cycle.get("teamName") if target_cycle else "")
        form_name = req_data.get("form") or (target_cycle.get("name") if target_cycle else "")
        
        emp_ids = set()
        if target_cycle and target_cycle.get("employeeIds"):
            emp_ids.update([str(e).strip() for e in target_cycle.get("employeeIds", [])])
        if req_data.get("employeeIds"):
            emp_ids.update([str(e).strip() for e in req_data.get("employeeIds", [])])

        store["cycles"] = [c for c in cycles if str(c.get("id")) != str(cycle_id)]
        store["responses"] = [
            r for r in responses 
            if str(r.get("cycleId")) != str(cycle_id)
        ]
        write_eval_store(store)

        # Also delete matching unstarted/unsubmitted records in Postgres kpi_evaluations
        conditions = []
        if form_name:
            conditions.append(KpiEvaluation.form == form_name)
        if team_id:
            conditions.append(KpiEvaluation.team_id == team_id)

        if conditions:
            records = KpiEvaluation.query.filter(or_(*conditions)).all()
            for rec in records:
                if not rec.employee_overall_score or rec.employee_overall_score == 0 or rec.status in ["Assigned to Employee", "employee_in_progress", "Pending", "draft", None]:
                    db.session.delete(rec)
            db.session.commit()

        return jsonify({"success": True, "message": "Cycle and unstarted evaluations deleted successfully from DB", "cycles": store["cycles"]}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@performance_bp.route("/evaluation/responses/<resp_id_or_emp_id>", methods=["DELETE"])
def delete_evaluation_response(resp_id_or_emp_id):
    try:
        req_data = request.get_json(silent=True) or {}
        cycle_id = request.args.get("cycleId") or req_data.get("cycleId") or ""
        emp_code = request.args.get("employeeCode") or req_data.get("employeeCode") or ""

        store = read_eval_store()
        responses = store.get("responses", [])
        
        # 1. Find the exact target response by ID first
        target_resp = next((r for r in responses if str(r.get("id")) == str(resp_id_or_emp_id)), None)
        
        # If not found directly by ID, match by cycleId + employeeCode combination
        if not target_resp and cycle_id and emp_code:
            target_resp = next((r for r in responses if str(r.get("cycleId")) == str(cycle_id) and str(r.get("employeeCode") or r.get("employeeId")) == str(emp_code)), None)

        if not target_resp and not resp_id_or_emp_id.isdigit() and not resp_id_or_emp_id.startswith("resp_"):
            target_resp = next((r for r in responses if str(r.get("employeeCode")) == str(resp_id_or_emp_id) or str(r.get("employeeId")) == str(resp_id_or_emp_id)), None)

        # Prevent deleting calibrated/published records
        if target_resp and (target_resp.get("managerScore") is not None or target_resp.get("status") in ["Calibrated & Approved", "Published", "Approved", "Completed"]):
            return jsonify({"error": "Published and calibrated evaluation records cannot be deleted."}), 400

        # Remove ONLY this specific single response from JSON store
        target_id = str(target_resp.get("id")) if target_resp else str(resp_id_or_emp_id)
        store["responses"] = [r for r in responses if str(r.get("id")) != target_id]
        write_eval_store(store)

        # Remove ONLY this specific single record from PostgreSQL kpi_evaluations
        rec_id = int(resp_id_or_emp_id) if resp_id_or_emp_id.isdigit() else None
        clean_resp_id = resp_id_or_emp_id.replace("resp_", "") if resp_id_or_emp_id.startswith("resp_") else None
        rec_from_resp = int(clean_resp_id) if clean_resp_id and clean_resp_id.isdigit() else None

        db_rec = None
        if rec_id:
            db_rec = KpiEvaluation.query.get(rec_id)
        elif rec_from_resp:
            db_rec = KpiEvaluation.query.get(rec_from_resp)
        elif target_resp:
            target_form = target_resp.get("form") or ""
            target_start = target_resp.get("periodStartDate") or target_resp.get("startDate") or ""
            target_emp = str(target_resp.get("employeeCode") or target_resp.get("employeeId") or "")
            query = KpiEvaluation.query
            if target_emp:
                query = query.filter(or_(KpiEvaluation.employee_id == target_emp, KpiEvaluation.employee_name == target_resp.get("employeeName")))
            if target_form:
                query = query.filter(KpiEvaluation.form == target_form)
            if target_start:
                query = query.filter(KpiEvaluation.period_start_date == target_start)
            db_rec = query.first()

        if db_rec:
            if db_rec.manager_score is not None or db_rec.status in ["Calibrated & Approved", "Published", "Approved", "Completed"]:
                return jsonify({"error": "Published and calibrated evaluation records cannot be deleted."}), 400
            db.session.delete(db_rec)
            db.session.commit()

        return jsonify({"success": True, "message": "Evaluation response deleted from DB successfully"}), 200
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

            if emp_id:
                clean_id = resp_id.replace("resp_", "").replace("eval_", "").strip()
                eval_row = None
                if clean_id.isdigit():
                    eval_row = KpiEvaluation.query.get(int(clean_id))

                if not eval_row and (form_name or period_name):
                    sub_conds = []
                    if form_name:
                        sub_conds.extend([KpiEvaluation.form == form_name, KpiEvaluation.performance_metrics == form_name])
                    if period_name:
                        sub_conds.append(KpiEvaluation.description.ilike(f"%{period_name}%"))
                    if sub_conds:
                        eval_row = KpiEvaluation.query.filter(
                            KpiEvaluation.employee_id == emp_id,
                            or_(*sub_conds)
                        ).order_by(KpiEvaluation.id.desc()).first()

                if not eval_row:
                    # Only match un-calibrated/pending evaluations to prevent destroying published historical records
                    eval_row = KpiEvaluation.query.filter(
                        KpiEvaluation.employee_id == emp_id,
                        KpiEvaluation.status.in_(["Assigned to Employee", "employee_in_progress", "Pending", "draft", "Draft", "manager_review", "Submitted to Manager"])
                    ).order_by(KpiEvaluation.id.desc()).first()

                if eval_row:
                    if "kpiResponses" in item and item["kpiResponses"]:
                        if isinstance(eval_row.metrics_data, list):
                            eval_row.metrics_data = merge_kpi_responses_into_categories(eval_row.metrics_data, item["kpiResponses"])
                        else:
                            eval_row.metrics_data = item["kpiResponses"]
                    if "employeeOverallScore" in item:
                        try:
                            eval_row.employee_overall_score = float(item["employeeOverallScore"])
                            eval_row.earned_score = str(item["employeeOverallScore"])
                            eval_row.actual_earned_mark = str(item["employeeOverallScore"])
                        except (ValueError, TypeError):
                            pass
                    if "employeeRemarks" in item:
                        eval_row.employee_remark = item["employeeRemarks"]
                    if "managerScore" in item and item["managerScore"] is not None:
                        try:
                            eval_row.manager_score = float(item["managerScore"])
                            eval_row.manager_approve_score = str(item["managerScore"])
                        except (ValueError, TypeError):
                            pass
                    if "managerRemarks" in item:
                        eval_row.manager_remark = item["managerRemarks"]
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
            if reporting_manager_id and reporting_manager_id.isdigit():
                mgr_emp = Employee.query.filter(
                    or_(
                        Employee.employee_id == reporting_manager_id,
                        Employee.id == int(reporting_manager_id),
                        Employee.user_id == int(reporting_manager_id)
                    )
                ).first()
            elif reporting_manager_id:
                mgr_emp = Employee.query.filter(Employee.employee_id == reporting_manager_id).first()

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
            if service_manager_id and service_manager_id.isdigit():
                sm_emp = Employee.query.filter(
                    or_(
                        Employee.employee_id == service_manager_id,
                        Employee.id == int(service_manager_id),
                        Employee.user_id == int(service_manager_id)
                    )
                ).first()
            elif service_manager_id:
                sm_emp = Employee.query.filter(Employee.employee_id == service_manager_id).first()

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

        from services.kpi_evaluation_rollup_service import calculate_evaluation_working_days

        now = datetime.utcnow()
        created_records = []

        if frequency in ["daily", "weekly"]:
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
                emp_id = str(emp.get("id") or emp.get("employee_id") or emp.get("code") or "")
                if not emp_id:
                    continue

                db_emp = Employee.query.filter(
                    or_(
                        Employee.employee_id == emp_id,
                        Employee.id == int(emp_id) if emp_id.isdigit() else False
                    )
                ).first()
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
                    existing_resp["status"] = "Assigned to Employee"
                    existing_resp["updatedAt"] = now.isoformat()
                    created_records.append(existing_resp)
                else:
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
            emp_id = str(emp.get("id") or emp.get("employee_id") or emp.get("code") or "")
            if not emp_id:
                continue

            # Skip inactive / deactivated employees
            db_emp = Employee.query.filter(
                or_(
                    Employee.employee_id == emp_id,
                    Employee.id == int(emp_id) if emp_id.isdigit() else False
                )
            ).first()
            if db_emp and (db_emp.is_active is False or str(db_emp.status or "").strip().lower() in ["inactive", "deactive", "deactivated"]):
                continue

            emp_name = emp.get("name") or emp.get("employee_name") or (f"{db_emp.first_name or ''} {db_emp.last_name or ''}".strip() if db_emp else f"Employee {emp_id}")

            period_label = data.get("periodName") or data.get("period_name") or data.get("period") or ""
            desc_text = f"Performance evaluation for {team_name}" + (f" ({period_label})" if period_label else "")

            stats = calculate_evaluation_working_days(emp_id, from_date, to_date) if (from_date and to_date) else {"working_days": 0, "leave_days": 0, "holiday_days": 0}

            # Check if evaluation records already exist for this employee for this specific form/period
            filter_conditions = [
                KpiEvaluation.employee_id == emp_id,
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
                record.metrics_data = categories_data
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
                    metrics_data=categories_data,
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




