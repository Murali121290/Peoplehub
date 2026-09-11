from datetime import datetime
from sqlalchemy import or_
from utils.compat import Blueprint, request, jsonify
from models.database import db
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

def get_eval_store_path():
    uploads_dir = get_uploads_dir()
    os.makedirs(uploads_dir, exist_ok=True)
    return os.path.join(uploads_dir, "evaluation_store.json")

def read_eval_store():
    path = get_eval_store_path()
    if not os.path.exists(path):
        return {"cycles": [], "responses": []}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"cycles": [], "responses": []}

def write_eval_store(data):
    path = get_eval_store_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def sync_postgres_kpi_to_store_and_back():
    """Ensure PostgreSQL kpi_evaluations table and evaluation store are fully synced"""
    try:
        eval_records = KpiEvaluation.query.all()
        store = read_eval_store()
        cycles = store.get("cycles", [])
        responses = store.get("responses", [])

        # If PostgreSQL table has 0 rows but store has responses, migrate store -> PostgreSQL
        if not eval_records and (responses or cycles):
            now = datetime.utcnow()
            for r in responses:
                emp_id = str(r.get("employeeCode") or r.get("employeeId") or "").strip()
                if not emp_id:
                    continue
                cycle_id = r.get("cycleId")
                cycle_obj = next((c for c in cycles if c.get("id") == cycle_id), {})
                
                # Lookup employee in DB
                emp_obj = Employee.query.filter(
                    or_(Employee.employee_id == emp_id, Employee.id == int(emp_id) if emp_id.isdigit() else False)
                ).first()
                
                team_name = (emp_obj.department if emp_obj else None) or (emp_obj.team if emp_obj else None) or r.get("teamId") or cycle_obj.get("teamName") or "Editorial Services"
                emp_name = r.get("employeeName") or (f"{emp_obj.first_name} {emp_obj.last_name}" if emp_obj else f"Employee #{emp_id}")
                mgr_name = (emp_obj.reporting_manager if emp_obj else None) or cycle_obj.get("managerName") or "Murali B"
                mgr_id = str(emp_obj.reporting_manager_id if (emp_obj and emp_obj.reporting_manager_id) else (cycle_obj.get("managerId") or "2150"))
                
                # Check if evaluation record already exists for this employee
                existing_eval = KpiEvaluation.query.filter(KpiEvaluation.employee_id == emp_id).first()
                if existing_eval:
                    continue

                new_eval = KpiEvaluation(
                    form=cycle_obj.get("name") or "Q3 2026 KPI Assessment",
                    team_id=str(r.get("teamId") or cycle_obj.get("teamId") or ""),
                    team_name=team_name,
                    metrics_data=categories_data,
                    performance_metrics=cycle_obj.get("name") or "Performance Evaluation",
                    description=f"KPI deliverables evaluation for {team_name}",
                    target_score="100",
                    weightage="100",
                    actual_earned_mark=str(r.get("employeeOverallScore", "0.0")),
                    earned_score=str(r.get("employeeOverallScore", "0.0")),
                    employee_overall_score=float(r.get("employeeOverallScore") or 0.0),
                    employee_remark=r.get("employeeRemarks", ""),
                    manager_actual_pm="",
                    manager_approve_score=str(r.get("managerScore", "")) if r.get("managerScore") is not None else "",
                    manager_score=float(r.get("managerScore")) if r.get("managerScore") is not None else None,
                    manager_remark=r.get("managerRemarks", ""),
                    service_manager_approve_status="Approved" if r.get("status") == "approved" else "Pending",
                    service_manager_score=str(r.get("serviceManagerScore", "")) if r.get("serviceManagerScore") is not None else "",
                    remark=r.get("serviceManagerRemarks", ""),
                    employee_id=emp_id,
                    employee_name=emp_name,
                    reporting_manager=mgr_name,
                    reporting_manager_id=mgr_id,
                    manager_id=mgr_id,
                    service_manager=cycle_obj.get("serviceManagerName") or "Service Manager",
                    service_manager_id=str(cycle_obj.get("serviceManagerId") or ""),
                    status=r.get("status", "employee_in_progress"),
                    created_at=now,
                    updated_at=now
                )
                db.session.add(new_eval)
            db.session.commit()
            eval_records = KpiEvaluation.query.all()

        return eval_records, store
    except Exception as e:
        db.session.rollback()
        print(f"Error syncing Postgres KPI records: {e}")
        return [], {"cycles": [], "responses": []}

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
        cycles = store.get("cycles", [])
        responses = store.get("responses", [])

        # 1. Dynamically build and maintain cycles directly from PostgreSQL KpiEvaluation records
        team_eval_groups = {}
        for rec in eval_records:
            t_key = rec.team_name or rec.team_id or "General"
            f_name = rec.form or "Performance Evaluation"
            group_key = f"{t_key}_{f_name}"
            if group_key not in team_eval_groups:
                team_eval_groups[group_key] = {
                    "teamName": rec.team_name or rec.team_id or "General",
                    "teamId": rec.team_id or rec.team_name or "team_general",
                    "form": f_name,
                    "managerName": rec.reporting_manager,
                    "managerId": str(rec.reporting_manager_id or rec.manager_id or ""),
                    "serviceManagerName": rec.service_manager,
                    "serviceManagerId": str(rec.service_manager_id or ""),
                    "metrics_data": rec.metrics_data,
                    "employeeIds": []
                }
            emp_id = str(rec.employee_id or "").strip()
            if emp_id and emp_id not in team_eval_groups[group_key]["employeeIds"]:
                team_eval_groups[group_key]["employeeIds"].append(emp_id)

        for g_key, g_info in team_eval_groups.items():
            matching_cycle = next((c for c in cycles if (c.get("teamName") == g_info["teamName"] or c.get("teamId") == g_info["teamId"]) and c.get("name") == g_info["form"]), None)
            if not matching_cycle:
                matching_cycle = next((c for c in cycles if c.get("teamName") == g_info["teamName"] or c.get("teamId") == g_info["teamId"]), None)
            
            categories_from_db = g_info["metrics_data"] if isinstance(g_info["metrics_data"], list) else []
            if matching_cycle:
                matching_cycle["employeeIds"] = list(set((matching_cycle.get("employeeIds") or []) + g_info["employeeIds"]))
                if categories_from_db and not matching_cycle.get("categories"):
                    matching_cycle["categories"] = categories_from_db
                if g_info["managerName"]:
                    matching_cycle["managerName"] = g_info["managerName"]
                if g_info["managerId"]:
                    matching_cycle["managerId"] = g_info["managerId"]
            else:
                new_c_id = f"cycle_db_{abs(hash(g_key)) % 1000000}"
                cycles.append({
                    "id": new_c_id,
                    "name": g_info["form"],
                    "teamId": g_info["teamId"],
                    "teamName": g_info["teamName"],
                    "managerId": g_info["managerId"],
                    "managerName": g_info["managerName"] or "Reporting Manager",
                    "serviceManagerId": g_info["serviceManagerId"],
                    "serviceManagerName": g_info["serviceManagerName"] or "Service Manager",
                    "employeeIds": g_info["employeeIds"],
                    "status": "active",
                    "categories": categories_from_db,
                    "createdAt": datetime.utcnow().isoformat(),
                    "updatedAt": datetime.utcnow().isoformat()
                })

        # 2. Sync all DB records into responses array
        for rec in eval_records:
            emp_id = str(rec.employee_id or "")
            emp_obj = Employee.query.filter(
                or_(Employee.employee_id == emp_id, Employee.id == int(emp_id) if emp_id.isdigit() else False)
            ).first()
            actual_code = emp_obj.employee_id if emp_obj and emp_obj.employee_id else emp_id
            resolved_team = rec.team_name or rec.team_id or (emp_obj.department if emp_obj else None) or (emp_obj.team if emp_obj else None) or "Media"
            resolved_name = rec.employee_name or (f"{emp_obj.first_name} {emp_obj.last_name}" if emp_obj else f"Employee #{actual_code}")

            db_kpis = extract_kpi_responses_from_metrics_data(rec.metrics_data)

            # Find matching cycle id
            resp_cycle = next((c for c in cycles if (c.get("teamName") == rec.team_name or c.get("teamId") == rec.team_id) and c.get("name") == rec.form), None)
            if not resp_cycle:
                resp_cycle = next((c for c in cycles if c.get("teamName") == rec.team_name or c.get("teamId") == rec.team_id), None)
            cycle_id = resp_cycle["id"] if resp_cycle else "cycle_default"

            existing_resp = next((r for r in responses if str(r.get("employeeCode") or r.get("employeeId")) in [emp_id, actual_code]), None)
            if existing_resp:
                existing_resp["employeeCode"] = actual_code
                existing_resp["employeeId"] = actual_code
                existing_resp["cycleId"] = existing_resp.get("cycleId") or cycle_id
                existing_resp["teamId"] = resolved_team
                existing_resp["employeeName"] = resolved_name
                existing_resp["managerId"] = str(rec.manager_id or "")
                existing_resp["employeeOverallScore"] = rec.employee_overall_score or float(rec.earned_score or 0)
                existing_resp["employeeRemarks"] = rec.employee_remark or existing_resp.get("employeeRemarks", "")
                if rec.manager_score is not None:
                    existing_resp["managerScore"] = rec.manager_score
                if rec.manager_remark:
                    existing_resp["managerRemarks"] = rec.manager_remark
                if rec.service_manager_score:
                    try:
                        existing_resp["serviceManagerScore"] = float(rec.service_manager_score)
                    except ValueError:
                        pass
                if rec.status:
                    existing_resp["status"] = rec.status
                
                # Merge DB KPI responses
                if db_kpis:
                    if not existing_resp.get("kpiResponses"):
                        existing_resp["kpiResponses"] = db_kpis
                    else:
                        for k, v in db_kpis.items():
                            if k not in existing_resp["kpiResponses"] or not existing_resp["kpiResponses"][k].get("actualValue"):
                                existing_resp["kpiResponses"][k] = v
            else:
                responses.append({
                    "id": f"resp_{rec.id}",
                    "cycleId": cycle_id,
                    "teamId": resolved_team,
                    "employeeId": actual_code,
                    "employeeCode": actual_code,
                    "employeeName": resolved_name,
                    "managerId": str(rec.manager_id or ""),
                    "status": rec.status or "employee_in_progress",
                    "employeeOverallScore": rec.employee_overall_score or 0,
                    "employeeRemarks": rec.employee_remark or "",
                    "managerScore": rec.manager_score,
                    "managerRemarks": rec.manager_remark or "",
                    "kpiResponses": db_kpis
                })

        store["cycles"] = cycles
        store["responses"] = responses
        write_eval_store(store)
        return jsonify({"success": True, "cycles": cycles, "responses": responses}), 200
    except Exception as e:
        return jsonify({"error": str(e), "cycles": [], "responses": []}), 500

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
            if str(r.get("cycleId")) != str(cycle_id) and str(r.get("employeeCode") or r.get("employeeId") or "") not in emp_ids
        ]
        write_eval_store(store)

        # Also delete matching unstarted/unsubmitted records in Postgres kpi_evaluations
        conditions = []
        if emp_ids:
            conditions.append(KpiEvaluation.employee_id.in_(list(emp_ids)))
        if team_id:
            conditions.append(KpiEvaluation.team_id == team_id)
        if team_name:
            conditions.append(KpiEvaluation.team_name == team_name)
        if form_name:
            conditions.append(KpiEvaluation.form == form_name)

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
        emp_code = request.args.get("employeeCode") or req_data.get("employeeCode") or ""
        emp_id_arg = request.args.get("employeeId") or req_data.get("employeeId") or ""
        emp_name = request.args.get("employeeName") or req_data.get("employeeName") or ""

        store = read_eval_store()
        responses = store.get("responses", [])
        
        target_resp = next((r for r in responses if str(r.get("id")) == str(resp_id_or_emp_id) or str(r.get("employeeCode")) == str(resp_id_or_emp_id) or str(r.get("employeeId")) == str(resp_id_or_emp_id)), None)
        if target_resp:
            if not emp_code:
                emp_code = str(target_resp.get("employeeCode") or target_resp.get("employeeId") or "")
            if not emp_name:
                emp_name = target_resp.get("employeeName") or ""

        # Collect all possible identifier strings for this employee
        emp_ids_to_del = {
            str(resp_id_or_emp_id).strip(),
            str(emp_code).strip(),
            str(emp_id_arg).strip(),
            str(emp_code).replace("EMP", "").replace("emp", "").strip() if emp_code else "",
            f"EMP{str(emp_code).replace('EMP', '').replace('emp', '').strip()}" if emp_code else ""
        } - {""}

        # Find employee in DB to get their numeric DB ID, user_id, and employee_id
        for candidate_id in list(emp_ids_to_del):
            emp_obj = Employee.query.filter(
                or_(
                    Employee.employee_id == candidate_id,
                    Employee.id == int(candidate_id) if candidate_id.isdigit() else False
                )
            ).first()
            if emp_obj:
                if emp_obj.employee_id:
                    emp_ids_to_del.add(str(emp_obj.employee_id))
                if emp_obj.id:
                    emp_ids_to_del.add(str(emp_obj.id))
                if emp_obj.user_id:
                    emp_ids_to_del.add(str(emp_obj.user_id))
                if not emp_name:
                    emp_name = f"{emp_obj.first_name} {emp_obj.last_name}".strip()

        emp_ids_to_del = {x for x in emp_ids_to_del if x}

        store["responses"] = [
            r for r in responses 
            if str(r.get("id")) != str(resp_id_or_emp_id) and 
               str(r.get("employeeCode") or "").strip() not in emp_ids_to_del and
               str(r.get("employeeId") or "").strip() not in emp_ids_to_del
        ]
        write_eval_store(store)

        # Remove from PostgreSQL kpi_evaluations
        rec_id = int(resp_id_or_emp_id) if resp_id_or_emp_id.isdigit() else None
        clean_resp_id = resp_id_or_emp_id.replace("resp_", "")
        rec_from_resp = int(clean_resp_id) if clean_resp_id.isdigit() else None

        conditions = []
        if emp_ids_to_del:
            conditions.append(KpiEvaluation.employee_id.in_(list(emp_ids_to_del)))
        if rec_id:
            conditions.append(KpiEvaluation.id == rec_id)
        if rec_from_resp:
            conditions.append(KpiEvaluation.id == rec_from_resp)
        if emp_name and len(emp_name) > 2:
            conditions.append(KpiEvaluation.employee_name.ilike(f"%{emp_name.strip()}%"))

        if conditions:
            records = KpiEvaluation.query.filter(or_(*conditions)).all()
            for rec in records:
                db.session.delete(rec)
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
            if r1.get("id") and r2.get("id") and r1.get("id") == r2.get("id"):
                return True
            c1 = str(r1.get("cycleId") or "")
            c2 = str(r2.get("cycleId") or "")
            if c1 and c2 and c1 == c2:
                e1_ids = {str(r1.get("employeeId") or "").strip(), str(r1.get("employeeCode") or "").strip()} - {""}
                e2_ids = {str(r2.get("employeeId") or "").strip(), str(r2.get("employeeCode") or "").strip()} - {""}
                if e1_ids & e2_ids:
                    return True
                n1 = (r1.get("employeeName") or "").strip().lower()
                n2 = (r2.get("employeeName") or "").strip().lower()
                if n1 and n2 and (n1 == n2 or n1 in n2 or n2 in n1):
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
            if emp_id:
                eval_row = KpiEvaluation.query.filter(KpiEvaluation.employee_id == emp_id).first()
                if not eval_row:
                    eval_row = KpiEvaluation(
                        form=item.get("form") or "Q3 2026 KPI Assessment",
                        team_id=str(item.get("teamId") or ""),
                        team_name=item.get("teamName") or "Editorial Services",
                        employee_id=emp_id,
                        employee_name=item.get("employeeName") or f"Employee #{emp_id}",
                        created_at=now
                    )
                    db.session.add(eval_row)

                if "kpiResponses" in item and item["kpiResponses"]:
                    eval_row.metrics_data = item["kpiResponses"]
                if "employeeOverallScore" in item:
                    try:
                        eval_row.employee_overall_score = float(item["employeeOverallScore"])
                        eval_row.earned_score = str(item["employeeOverallScore"])
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
                if "status" in item:
                    eval_row.status = item["status"]
                eval_row.updated_at = now

        db.session.commit()
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
        
        query = KpiEvaluation.query
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
        return jsonify({"success": True, "evaluations": [r.to_dict() for r in records]}), 200
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
        employees = data.get("employees", [])
        
        # Accept categories (hierarchical tree) or metrics_data or fallback list
        categories_data = data.get("categories") or data.get("metrics_data") or data.get("metrics") or []

        if not employees:
            return jsonify({"error": "Please select at least one employee"}), 400
        if not categories_data:
            return jsonify({"error": "Please specify performance metrics categories"}), 400

        now = datetime.utcnow()
        created_records = []

        for emp in employees:
            emp_id = str(emp.get("id") or emp.get("employee_id") or emp.get("code") or "")
            emp_name = emp.get("name") or emp.get("employee_name") or f"Employee {emp_id}"

            # Check if an evaluation record already exists for this employee (strictly 1 row per employee)
            all_emp_records = KpiEvaluation.query.filter(
                KpiEvaluation.employee_id == emp_id
            ).order_by(KpiEvaluation.id.desc()).all()

            record = all_emp_records[0] if all_emp_records else None
            
            # Remove any older duplicate records for this employee to keep strictly 1 row
            if len(all_emp_records) > 1:
                for old_rec in all_emp_records[1:]:
                    db.session.delete(old_rec)

            period_label = data.get("periodName") or data.get("period_name") or data.get("period") or ""
            desc_text = f"Performance evaluation for {team_name}" + (f" ({period_label})" if period_label else "")

            if not record:
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
                    status="Assigned to Employee",
                    created_at=now,
                    updated_at=now
                )
                db.session.add(record)
            else:
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
                record.status = "Assigned to Employee"
                record.updated_at = now

            db.session.flush()
            created_records.append(record)

        db.session.commit()
        return jsonify({
            "success": True, 
            "message": f"Assigned KPI metrics JSON to {len(created_records)} employee(s) (strictly 1 row per employee in DB)",
            "evaluations": [r.to_dict() for r in created_records]
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


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
            rec_id = item.get("id")
            emp_id = str(item.get("employee_id") or "")
            form_name = item.get("form")
            raw_responses = item.get("responses") or item.get("kpiResponses") or {}

            record = None
            if rec_id:
                record = KpiEvaluation.query.get(rec_id)
            elif emp_id:
                q = KpiEvaluation.query.filter(KpiEvaluation.employee_id == emp_id)
                if form_name:
                    q = q.filter(KpiEvaluation.form == form_name)
                record = q.order_by(KpiEvaluation.updated_at.desc()).first()

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

                # Sync to store_responses as well
                store_resp = next((r for r in store_responses if str(r.get("employeeCode") or r.get("employeeId")) == emp_id), None)
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

        db.session.commit()
        store["responses"] = store_responses
        write_eval_store(store)

        return jsonify({
            "success": True, 
            "message": "Evaluation submitted to reporting manager successfully",
            "evaluations": [r.to_dict() for r in updated_records]
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
            rec_id = item.get("id")
            emp_id = str(item.get("employee_id") or "")
            form_name = item.get("form")
            raw_responses = item.get("responses") or item.get("kpiResponses") or {}

            record = None
            if rec_id:
                record = KpiEvaluation.query.get(rec_id)
            elif emp_id:
                q = KpiEvaluation.query.filter(KpiEvaluation.employee_id == emp_id)
                if form_name:
                    q = q.filter(KpiEvaluation.form == form_name)
                record = q.order_by(KpiEvaluation.updated_at.desc()).first()

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

        db.session.commit()
        store["responses"] = store_responses
        write_eval_store(store)

        return jsonify({
            "success": True, 
            "message": "Evaluation approved and published to employee report successfully",
            "evaluations": [r.to_dict() for r in updated_records]
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




