"""
KPI Evaluation Hierarchical Rolling Aggregation Service

Handles rolling aggregation directly on kpi_evaluations table:
1. Daily evaluations -> Aggregated into Weekly evaluation (excluding leave days & holidays)
2. Weekly evaluations -> Aggregated into Monthly evaluation
3. Monthly evaluations -> Aggregated into Quarterly evaluation
4. Quarterly evaluations -> Aggregated into Yearly evaluation

* All historical records (Daily, Weekly, Monthly, Quarterly, Yearly) are permanently preserved in the database (NO auto-deletion).
"""

import json
import logging
import os
import shutil
from datetime import date, datetime, timedelta
from sqlalchemy import extract, or_, func
from models.database import db
from models.employee import Employee
from models.holiday import Holiday, HolidayOverride
from models.leave import LeaveRequest
from models.kpi_evaluation import KpiEvaluation
from utils.uploads import get_uploads_dir

logger = logging.getLogger(__name__)


class RollupDict(dict):
    """Dictionary that also supports attribute access and to_dict() for model compatibility."""
    def __getattr__(self, name):
        if name in self:
            return self[name]
        return None
    def __setattr__(self, name, value):
        self[name] = value
    def to_dict(self):
        return dict(self)


def get_eval_store_path():
    uploads_dir = get_uploads_dir()
    eval_dir = os.path.join(uploads_dir, "evaluations")
    os.makedirs(eval_dir, exist_ok=True)
    new_path = os.path.join(eval_dir, "evaluation_store.json")
    old_path = os.path.join(uploads_dir, "evaluation_store.json")
    if os.path.exists(old_path) and not os.path.exists(new_path):
        try:
            shutil.copy2(old_path, new_path)
        except Exception:
            pass
    return new_path


def read_eval_store():
    path = get_eval_store_path()
    if not os.path.exists(path):
        return {"cycles": [], "responses": []}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return {"cycles": [], "responses": []}
            return data
    except Exception:
        return {"cycles": [], "responses": []}


def write_eval_store(data):
    path = get_eval_store_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _get_field(obj, *field_names, default=None):
    if isinstance(obj, dict):
        for f in field_names:
            if f in obj and obj[f] is not None:
                return obj[f]
    else:
        for f in field_names:
            if hasattr(obj, f):
                val = getattr(obj, f)
                if val is not None:
                    return val
def _parse_int_rids(record_ids):
    if not record_ids:
        return []
    res = []
    for rid in record_ids:
        clean = str(rid).replace("resp_", "").replace("resp-", "").strip()
        if clean.isdigit():
            res.append(int(clean))
    return res


def is_date_week_off(d: date) -> bool:
    """Sunday (6) is standard week off."""
    return d.weekday() == 6


def calculate_evaluation_working_days(employee_id: str, from_date: date, to_date: date) -> dict:
    """
    Calculates exact scheduled working days between from_date and to_date (inclusive),
    deducting holidays and approved leaves so the employee is not penalized.
    """
    if not from_date or not to_date:
        return {"working_days": 0, "leave_days": 0, "holiday_days": 0, "total_days": 0}

    try:
        emp_id_str = str(employee_id).strip()
        # Fetch employee for joining date
        emp = Employee.query.filter(Employee.employee_id == emp_id_str).first()
        joining_date = getattr(emp, "joining_date", None) if emp else None

        # Fetch holidays
        holidays = {h.holiday_date for h in Holiday.query.filter(
            Holiday.holiday_date >= from_date,
            Holiday.holiday_date <= to_date
        ).all()}

        # Fetch overrides
        overrides = {o.override_date: o.override_type for o in HolidayOverride.query.filter(
            HolidayOverride.override_date >= from_date,
            HolidayOverride.override_date <= to_date
        ).all()}

        # Fetch approved leaves covering the period
        valid_emp_ids = [emp_id_str]
        if emp and emp.employee_id:
            valid_emp_ids = list(set([str(emp.employee_id), emp_id_str]))

        emp_leaves = LeaveRequest.query.filter(
            LeaveRequest.employee_id.in_(valid_emp_ids),
            LeaveRequest.status == "Approved",
            LeaveRequest.from_date <= to_date,
            LeaveRequest.to_date >= from_date
        ).all()

        total_days = (to_date - from_date).days + 1
        scheduled_working_days = 0
        holiday_count = 0
        leave_count = 0

        curr = from_date
        while curr <= to_date:
            if joining_date and curr < joining_date:
                curr += timedelta(days=1)
                continue

            override = overrides.get(curr)
            if override == "Working Day":
                is_work = True
                is_hol = False
            elif override == "Holiday":
                is_work = False
                is_hol = True
            else:
                is_hol = curr in holidays
                is_off = is_date_week_off(curr)
                is_work = not is_hol and not is_off

            if is_hol:
                holiday_count += 1
            elif is_work:
                covering = [l for l in emp_leaves if l.from_date <= curr and l.to_date >= curr]
                if covering:
                    first_l = covering[0]
                    val = 0.5 if (first_l.total_days is not None and first_l.total_days <= 0.5) else 1.0
                    leave_count += val
                else:
                    scheduled_working_days += 1

            curr += timedelta(days=1)

        working_days = max(0, int(scheduled_working_days))
        return {
            "working_days": working_days,
            "leave_days": int(leave_count),
            "holiday_days": int(holiday_count),
            "total_days": total_days
        }
    except Exception as e:
        logger.warning(f"Error in calculate_evaluation_working_days for {employee_id}: {e}")
        days_diff = max(1, (to_date - from_date).days + 1) if (from_date and to_date) else 0
        return {"working_days": days_diff, "leave_days": 0, "holiday_days": 0, "total_days": days_diff}


def aggregate_categories_metrics(eval_records: list, total_working_days: int) -> list:
    """
    Merges metrics_data categories and KPIs from multiple child evaluation records into
    a single rolled-up categories structure, aggregating targets, actuals, and achievements.
    """
    if not eval_records:
        return []

    # Use first record categories as the base template
    base_record = eval_records[0]
    base_cats = _get_field(base_record, "metrics_data", "categories", default=[])
    if not isinstance(base_cats, list) or not base_cats:
        return []

    # Map KPIs across records
    # kpi_key -> list of kpi dicts from each record
    kpi_records_map = {}
    for rec in eval_records:
        cats = _get_field(rec, "metrics_data", "categories", default=[])
        if isinstance(cats, list):
            for cat in cats:
                for kpi in (cat.get("kpis") or []):
                    k_id = str(kpi.get("id") or kpi.get("name") or "").strip()
                    if k_id:
                        kpi_records_map.setdefault(k_id, []).append(kpi)

    rolled_cats = []
    for cat in base_cats:
        new_cat = dict(cat)
        new_kpis = []
        for kpi in (cat.get("kpis") or []):
            k_id = str(kpi.get("id") or kpi.get("name") or "").strip()
            entries = kpi_records_map.get(k_id, [kpi])

            # Sum actuals
            numeric_actuals = []
            numeric_targets = []
            for e in entries:
                act = e.get("actualValue") or e.get("actual_value") or e.get("actual_earned_mark")
                tgt = e.get("targetValue") or e.get("target_from_manager")
                try:
                    if act is not None and str(act).strip() != "":
                        numeric_actuals.append(float(str(act).replace("%", "").strip()))
                except (ValueError, TypeError):
                    pass
                try:
                    if tgt is not None and str(tgt).strip() != "":
                        numeric_targets.append(float(str(tgt).replace("%", "").strip()))
                except (ValueError, TypeError):
                    pass

            sum_actual = sum(numeric_actuals) if numeric_actuals else 0.0
            sum_target = sum(numeric_targets) if numeric_targets else float(kpi.get("targetValue") or 1.0)

            # Achievement %
            if sum_target > 0:
                achieve_pct = round(min(150.0, max(0.0, (sum_actual / sum_target) * 100.0)), 2)
            else:
                achieve_pct = 100.0 if sum_actual > 0 else 0.0

            # Combined remarks
            remarks = [str(e.get("employeeRemarks") or e.get("employee_remark") or "").strip() for e in entries if e.get("employeeRemarks") or e.get("employee_remark")]
            joined_remarks = " | ".join(dict.fromkeys(remarks)) if remarks else ""

            # Manager review
            mgr_scores = []
            for e in entries:
                ms = e.get("managerScore") or e.get("manager_score")
                if ms is not None:
                    try:
                        mgr_scores.append(float(ms))
                    except (ValueError, TypeError):
                        pass
            avg_mgr_score = round(sum(mgr_scores) / len(mgr_scores), 2) if mgr_scores else None

            rolled_kpi = dict(kpi)
            rolled_kpi["actualValue"] = round(sum_actual, 2)
            rolled_kpi["actual_value"] = round(sum_actual, 2)
            rolled_kpi["targetValue"] = round(sum_target, 2)
            rolled_kpi["target_from_manager"] = str(round(sum_target, 2))
            rolled_kpi["achievementPercentage"] = achieve_pct
            rolled_kpi["employeeRemarks"] = joined_remarks
            rolled_kpi["employee_remark"] = joined_remarks
            if avg_mgr_score is not None:
                rolled_kpi["managerScore"] = avg_mgr_score
                rolled_kpi["manager_score"] = avg_mgr_score

            new_kpis.append(rolled_kpi)

        new_cat["kpis"] = new_kpis
        rolled_cats.append(new_cat)

    return rolled_cats


def rollup_daily_to_weekly_evaluations(employee_id: str, week_start: date, week_end: date):
    """
    Rolls up daily evaluations for an employee in a given week (Mon-Sun).
    Creates a weekly record in evaluation_store.json and cascades to monthly.
    """
    weekly_record = convert_daily_to_weekly_records(employee_id=employee_id, week_start=week_start, week_end=week_end)
    if weekly_record:
        try_rollup_weekly_to_monthly_evaluations(employee_id, week_end.month, week_end.year)
    return weekly_record


def convert_daily_to_weekly_records(employee_id: str = None, week_start: date = None, week_end: date = None, record_ids: list = None):
    """
    Converts active Daily evaluations into 1 consolidated Weekly evaluation.
    Tiered architecture:
    - Daily records are read from JSON format (data/uploads/evaluations/evaluation_store.json)
    - Weekly record is created and stored in JSON format (data/uploads/evaluations/evaluation_store.json)
    - Daily records are soft-archived in the JSON store
    """
    store = read_eval_store()
    json_responses = store.get("responses", [])

    matched_json_daily = []
    rid_set = set()
    if record_ids and len(record_ids) > 0:
        for rid in record_ids:
            s = str(rid).strip()
            rid_set.add(s)
            rid_set.add(s.replace("resp_", ""))
            rid_set.add(f"resp_{s.replace('resp_', '')}")

    for r in json_responses:
        freq = str(r.get("frequency") or "").strip().lower()
        form_name = str(r.get("form") or "").lower()
        if freq != "daily" and "daily" not in form_name:
            continue
        if r.get("is_archived") or str(r.get("status") or "").lower() == "archived":
            continue

        r_id = str(r.get("id") or "")
        r_db_id = str(r.get("db_id") or "")
        r_emp = str(r.get("employeeCode") or r.get("employeeId") or "").strip()

        if rid_set:
            if r_id not in rid_set and r_db_id not in rid_set:
                continue
        elif employee_id:
            if r_emp != str(employee_id).strip():
                continue
            if week_start and week_end:
                r_start_str = r.get("startDate") or r.get("from_date")
                if r_start_str:
                    try:
                        r_date = datetime.strptime(str(r_start_str)[:10], "%Y-%m-%d").date()
                        if r_date < week_start or r_date > week_end:
                            continue
                    except Exception:
                        pass
        matched_json_daily.append(r)

    # Fallback to DB query if not in JSON store
    db_daily = []
    if not matched_json_daily:
        query = KpiEvaluation.query.filter(
            KpiEvaluation.frequency == "daily",
            or_(KpiEvaluation.is_archived == False, KpiEvaluation.is_archived.is_(None))
        )
        if record_ids and len(record_ids) > 0:
            int_rids = _parse_int_rids(record_ids)
            if int_rids:
                query = query.filter(KpiEvaluation.id.in_(int_rids))
            else:
                query = query.filter(False)
        elif employee_id:
            query = query.filter(KpiEvaluation.employee_id == str(employee_id))
            if week_start and week_end:
                query = query.filter(KpiEvaluation.from_date >= week_start, KpiEvaluation.from_date <= week_end)
        db_daily = query.order_by(KpiEvaluation.from_date.asc(), KpiEvaluation.id.asc()).all()

    eval_sources = matched_json_daily or db_daily
    if not eval_sources:
        return None

    sample = eval_sources[0]
    emp_id = _get_field(sample, "employeeId", "employeeCode", "employee_id", default="")
    emp_name = _get_field(sample, "employeeName", "employee_name", default=f"Employee {emp_id}")
    team_id = _get_field(sample, "teamId", "team_id", default="General")
    team_name = _get_field(sample, "teamName", "team_name", default="Team")
    reporting_manager = _get_field(sample, "reportingManager", "reporting_manager", default="")
    reporting_manager_id = _get_field(sample, "reporting_manager_id", "manager_id", "managerId", default="")
    service_manager = _get_field(sample, "serviceManager", "service_manager", default="")
    service_manager_id = _get_field(sample, "service_manager_id", "serviceManagerId", default="")

    # Determine dates and align strictly to Monday-to-Sunday calendar week
    dates = []
    for r in eval_sources:
        d_val = _get_field(r, "startDate", "from_date")
        if isinstance(d_val, (date, datetime)):
            dates.append(d_val if isinstance(d_val, date) else d_val.date())
        elif isinstance(d_val, str) and d_val[:10]:
            try:
                dates.append(datetime.strptime(d_val[:10], "%Y-%m-%d").date())
            except Exception:
                pass

    ref_date = min(dates) if dates else date.today()
    # Monday is weekday 0, Sunday is weekday 6
    target_monday = ref_date - timedelta(days=ref_date.weekday())
    target_sunday = target_monday + timedelta(days=6)

    w_start = week_start or target_monday
    w_end = week_end or target_sunday

    # Exclude any records outside the target Monday-to-Sunday window (previous or future weeks)
    filtered_sources = []
    for r in eval_sources:
        d_val = _get_field(r, "startDate", "from_date")
        r_d = None
        if isinstance(d_val, (date, datetime)):
            r_d = d_val if isinstance(d_val, date) else d_val.date()
        elif isinstance(d_val, str) and d_val[:10]:
            try:
                r_d = datetime.strptime(d_val[:10], "%Y-%m-%d").date()
            except Exception:
                pass
        if r_d is not None:
            if w_start <= r_d <= w_end:
                filtered_sources.append(r)
        else:
            filtered_sources.append(r)

    if not filtered_sources:
        return None
    eval_sources = filtered_sources

    stats = calculate_evaluation_working_days(emp_id, w_start, w_end)
    working_days_count = max(len(eval_sources), stats.get("working_days", 1), 1)

    # Aggregate categories
    aggregated_cats = aggregate_categories_metrics(eval_sources, working_days_count)

    # Average scores (Sum / active evaluated count)
    emp_scores = []
    for r in eval_sources:
        val = _get_field(r, "employeeOverallScore", "employee_overall_score", "earned_score")
        try:
            if val is not None and float(val) > 0:
                emp_scores.append(float(val))
        except (ValueError, TypeError):
            pass
    avg_emp_score = round(sum(emp_scores) / len(emp_scores), 2) if emp_scores else 0.0

    mgr_scores = []
    for r in eval_sources:
        val = _get_field(r, "managerScore", "manager_score")
        try:
            if val is not None and float(val) > 0:
                mgr_scores.append(float(val))
        except (ValueError, TypeError):
            pass
    avg_mgr_score = round(sum(mgr_scores) / len(mgr_scores), 2) if mgr_scores else None

    # Combined remarks
    all_remarks = []
    for r in eval_sources:
        rem = _get_field(r, "employeeRemarks", "employee_remark", default="")
        if rem and str(rem).strip():
            all_remarks.append(str(rem).strip())
    joined_emp_remarks = " | ".join(dict.fromkeys(all_remarks)) if all_remarks else "Weekly aggregation from daily deliverables"

    mgr_remarks = []
    for r in eval_sources:
        rem = _get_field(r, "managerRemarks", "manager_remark", default="")
        if rem and str(rem).strip():
            mgr_remarks.append(str(rem).strip())
    joined_mgr_remarks = " | ".join(dict.fromkeys(mgr_remarks)) if mgr_remarks else None

    start_str = w_start.strftime("%d %b %Y") if hasattr(w_start, "strftime") else str(w_start)
    end_str = w_end.strftime("%d %b %Y") if hasattr(w_end, "strftime") else str(w_end)
    period_str = f"Weekly ({start_str} - {end_str})"
    form_title = f"Weekly Performance Metrics ({start_str} - {end_str}) - {team_name}"
    desc_text = f"Performance evaluation for {team_name} ({period_str})"

    now = datetime.utcnow()
    weekly_id = f"resp_weekly_{abs(hash(f'{emp_id}_{start_str}_{end_str}_{now.isoformat()}')) % 10000000}"
    cycle_id = f"cycle_weekly_{abs(hash(f'{team_name}_{start_str}_{end_str}')) % 1000000}"

    weekly_record = RollupDict({
        "id": weekly_id,
        "cycleId": cycle_id,
        "teamId": str(team_id),
        "teamName": team_name,
        "employeeId": emp_id,
        "employeeCode": emp_id,
        "employeeName": emp_name,
        "form": form_title,
        "performance_metrics": form_title,
        "periodName": period_str,
        "description": desc_text,
        "status": "Manager Reviewed" if avg_mgr_score is not None else "Assigned to Employee",
        "employeeOverallScore": avg_emp_score,
        "employeeRemarks": joined_emp_remarks,
        "managerScore": avg_mgr_score,
        "managerRemarks": joined_mgr_remarks,
        "serviceManagerScore": None,
        "serviceManagerRemarks": "",
        "reportingManager": reporting_manager,
        "reporting_manager": reporting_manager,
        "reporting_manager_id": str(reporting_manager_id),
        "serviceManager": service_manager,
        "service_manager": service_manager,
        "service_manager_id": str(service_manager_id),
        "frequency": "weekly",
        "startDate": w_start.isoformat() if hasattr(w_start, "isoformat") else str(w_start),
        "endDate": w_end.isoformat() if hasattr(w_end, "isoformat") else str(w_end),
        "workingDays": working_days_count,
        "leaveDays": stats.get("leave_days", 0),
        "holidayDays": stats.get("holiday_days", 0),
        "categories": aggregated_cats,
        "metrics_data": aggregated_cats,
        "kpiResponses": {},
        "is_archived": False,
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat()
    })

    # Soft archive daily records in JSON store
    matched_ids = {r.get("id") for r in matched_json_daily}
    for r in store.get("responses", []):
        if r.get("id") in matched_ids:
            r["is_archived"] = True
            r["status"] = "Archived"
            r["converted_to_id"] = weekly_id

    # If DB daily records existed, soft-archive them in DB too
    if db_daily:
        for d in db_daily:
            d.is_archived = True
            d.status = "Archived"
            d.converted_to_id = weekly_id
        db.session.commit()

    store.setdefault("responses", []).append(dict(weekly_record))

    # Add cycle to store["cycles"]
    weekly_cycle = {
        "id": cycle_id,
        "name": form_title,
        "form": form_title,
        "frequency": "weekly",
        "startDate": weekly_record["startDate"],
        "endDate": weekly_record["endDate"],
        "periodName": period_str,
        "description": desc_text,
        "teamId": str(team_id),
        "teamName": team_name,
        "managerId": str(reporting_manager_id),
        "managerName": reporting_manager or "Reporting Manager",
        "serviceManagerId": str(service_manager_id),
        "serviceManagerName": service_manager or "Service Manager",
        "categories": aggregated_cats,
        "employeeIds": [emp_id],
        "isActive": True,
        "createdAt": now.isoformat(),
        "updatedAt": now.isoformat()
    }
    store.setdefault("cycles", [])
    if not any(c.get("id") == cycle_id for c in store["cycles"]):
        store["cycles"].append(weekly_cycle)

    write_eval_store(store)
    logger.info(f"[KPI Convert] Converted {len(eval_sources)} daily evaluations into JSON weekly evaluation ({weekly_id}).")
    return weekly_record


def convert_weekly_to_monthly_records(employee_id: str = None, record_ids: list = None, month: int = None, year: int = None) -> KpiEvaluation:
    """
    Converts active Weekly evaluations into 1 consolidated Monthly evaluation.
    Tiered architecture:
    - Weekly records are read from JSON format (data/uploads/evaluations/evaluation_store.json)
    - Monthly record is inserted into PostgreSQL database (kpi_evaluations table)
    - Weekly records are soft-archived in the JSON store
    """
    store = read_eval_store()
    json_responses = store.get("responses", [])

    matched_json_weekly = []
    rid_set = set()
    if record_ids and len(record_ids) > 0:
        for rid in record_ids:
            s = str(rid).strip()
            rid_set.add(s)
            rid_set.add(s.replace("resp_", ""))
            rid_set.add(f"resp_{s.replace('resp_', '')}")

    for r in json_responses:
        freq = str(r.get("frequency") or "").strip().lower()
        form_name = str(r.get("form") or "").lower()
        if freq != "weekly" and "weekly" not in form_name:
            continue
        if r.get("is_archived") or str(r.get("status") or "").lower() == "archived":
            continue

        r_id = str(r.get("id") or "")
        r_db_id = str(r.get("db_id") or "")
        r_emp = str(r.get("employeeCode") or r.get("employeeId") or "").strip()

        if rid_set:
            if r_id not in rid_set and r_db_id not in rid_set:
                continue
        elif employee_id:
            if r_emp != str(employee_id).strip():
                continue
            if month and year:
                r_end_str = r.get("endDate") or r.get("to_date") or r.get("startDate") or r.get("from_date")
                if r_end_str:
                    try:
                        r_date = datetime.strptime(str(r_end_str)[:10], "%Y-%m-%d").date()
                        if r_date.month != month or r_date.year != year:
                            continue
                    except Exception:
                        pass
        matched_json_weekly.append(r)

    # Fallback to DB weekly records if none in JSON
    db_weekly = []
    if not matched_json_weekly:
        query = KpiEvaluation.query.filter(
            or_(KpiEvaluation.is_archived == False, KpiEvaluation.is_archived.is_(None))
        )
        if record_ids and len(record_ids) > 0:
            int_rids = _parse_int_rids(record_ids)
            if int_rids:
                query = query.filter(KpiEvaluation.id.in_(int_rids))
            else:
                query = query.filter(False)
        elif employee_id:
            query = query.filter(
                KpiEvaluation.employee_id == str(employee_id),
                or_(KpiEvaluation.frequency == "weekly", KpiEvaluation.form.ilike("%weekly%"))
            )
            if month and year:
                query = query.filter(
                    extract('month', KpiEvaluation.to_date) == month,
                    extract('year', KpiEvaluation.to_date) == year
                )
        db_weekly = query.order_by(KpiEvaluation.from_date.asc(), KpiEvaluation.id.asc()).all()

    eval_sources = matched_json_weekly or db_weekly
    if not eval_sources:
        return None

    sample = eval_sources[0]
    emp_id = _get_field(sample, "employeeId", "employeeCode", "employee_id", default="")
    emp_name = _get_field(sample, "employeeName", "employee_name", default=f"Employee {emp_id}")
    team_id = _get_field(sample, "teamId", "team_id", default="General")
    team_name = _get_field(sample, "teamName", "team_name", default="Team")
    reporting_manager = _get_field(sample, "reportingManager", "reporting_manager", default="")
    reporting_manager_id = _get_field(sample, "reporting_manager_id", "manager_id", "managerId", default="")
    service_manager = _get_field(sample, "serviceManager", "service_manager", default="")
    service_manager_id = _get_field(sample, "service_manager_id", "serviceManagerId", default="")

    dates = []
    for r in eval_sources:
        d_val = _get_field(r, "startDate", "from_date", "endDate", "to_date")
        if isinstance(d_val, (date, datetime)):
            dates.append(d_val if isinstance(d_val, date) else d_val.date())
        elif isinstance(d_val, str) and d_val[:10]:
            try:
                dates.append(datetime.strptime(d_val[:10], "%Y-%m-%d").date())
            except Exception:
                pass

    ref_date = dates[0] if dates else date.today()
    m = month or ref_date.month
    y = year or ref_date.year

    m_start = date(y, m, 1)
    if m == 12:
        m_end = date(y, 12, 31)
    else:
        m_end = date(y, m + 1, 1) - timedelta(days=1)

    stats = calculate_evaluation_working_days(emp_id, m_start, m_end)
    working_days_count = max(stats.get("working_days", 1), 1)

    aggregated_cats = aggregate_categories_metrics(eval_sources, working_days_count)

    emp_scores = []
    for r in eval_sources:
        val = _get_field(r, "employeeOverallScore", "employee_overall_score", "earned_score")
        try:
            if val is not None and float(val) > 0:
                emp_scores.append(float(val))
        except (ValueError, TypeError):
            pass
    avg_emp_score = round(sum(emp_scores) / len(emp_scores), 2) if emp_scores else 0.0

    mgr_scores = []
    for r in eval_sources:
        val = _get_field(r, "managerScore", "manager_score")
        try:
            if val is not None and float(val) > 0:
                mgr_scores.append(float(val))
        except (ValueError, TypeError):
            pass
    avg_mgr_score = round(sum(mgr_scores) / len(mgr_scores), 2) if mgr_scores else None

    all_remarks = []
    for r in eval_sources:
        rem = _get_field(r, "employeeRemarks", "employee_remark", default="")
        if rem and str(rem).strip():
            all_remarks.append(str(rem).strip())
    joined_emp_remarks = " | ".join(dict.fromkeys(all_remarks)) if all_remarks else f"Monthly aggregation from {len(eval_sources)} weekly evaluations"

    mgr_remarks = []
    for r in eval_sources:
        rem = _get_field(r, "managerRemarks", "manager_remark", default="")
        if rem and str(rem).strip():
            mgr_remarks.append(str(rem).strip())
    joined_mgr_remarks = " | ".join(dict.fromkeys(mgr_remarks)) if mgr_remarks else None

    month_name = m_start.strftime("%B")
    period_str = f"{month_name} {y}"
    form_title = f"{month_name} {y} Performance Metrics - {team_name}"
    desc_text = f"Performance evaluation for {team_name} ({period_str})"

    now = datetime.utcnow()
    monthly_record = KpiEvaluation(
        form=form_title,
        team_id=str(team_id),
        team_name=team_name,
        metrics_data=aggregated_cats,
        performance_metrics=form_title,
        description=desc_text,
        target_score="100",
        weightage="100",
        employee_overall_score=avg_emp_score,
        employee_remark=joined_emp_remarks,
        manager_score=avg_mgr_score,
        manager_approve_score=str(avg_mgr_score) if avg_mgr_score is not None else "",
        manager_remark=joined_mgr_remarks,
        employee_id=emp_id,
        employee_name=emp_name,
        reporting_manager=reporting_manager,
        reporting_manager_id=str(reporting_manager_id),
        manager_id=str(reporting_manager_id),
        service_manager=service_manager,
        service_manager_id=str(service_manager_id),
        frequency="monthly",
        from_date=m_start,
        to_date=m_end,
        working_days=working_days_count,
        leave_days=stats.get("leave_days", 0),
        holiday_days=stats.get("holiday_days", 0),
        status="Manager Reviewed" if avg_mgr_score is not None else "Assigned to Employee",
        is_archived=False,
        created_at=now,
        updated_at=now
    )

    db.session.add(monthly_record)
    db.session.flush()

    # Soft archive weekly records in JSON store
    matched_ids = {r.get("id") for r in matched_json_weekly}
    for r in store.get("responses", []):
        if r.get("id") in matched_ids:
            r["is_archived"] = True
            r["status"] = "Archived"
            r["converted_to_id"] = monthly_record.id
    write_eval_store(store)

    # Soft archive weekly DB records if any
    if db_weekly:
        for w in db_weekly:
            w.is_archived = True
            w.status = "Archived"
            w.converted_to_id = monthly_record.id

    db.session.commit()
    logger.info(f"[KPI Convert] Converted {len(eval_sources)} weekly evaluations into DB Monthly entry (id={monthly_record.id}).")
    return monthly_record



def convert_monthly_to_quarterly_records(employee_id: str = None, record_ids: list = None, quarter: int = None, year: int = None) -> KpiEvaluation:
    """
    On-demand conversion from Monthly records to 1 Quarterly record.
    Supports both JSON store and PostgreSQL database records.
    """
    store = read_eval_store()
    json_responses = store.get("responses", [])

    matched_json_monthly = []
    rid_set = set()
    if record_ids and len(record_ids) > 0:
        for rid in record_ids:
            s = str(rid).strip()
            rid_set.add(s)
            rid_set.add(s.replace("resp_", ""))
            rid_set.add(f"resp_{s.replace('resp_', '')}")
    json_data = read_eval_store()
    store = json_data
    for r in json_data.get("responses", []):
        if r.get("is_archived") or r.get("status") == "Archived":
            continue
        freq = (r.get("frequency") or r.get("periodType") or "").lower()
        form_name = (r.get("form") or "").lower()
        period_name = (r.get("periodName") or "").lower()
        is_month = freq == "monthly" or "month" in form_name or "month" in period_name
        if not is_month:
            continue

        emp_code = str(r.get("employeeCode") or r.get("employeeId") or "")
        emp_db_id = str(r.get("employee_db_id") or "")
        target_emp = str(employee_id or "")
        if target_emp and emp_code != target_emp and emp_db_id != target_emp:
            continue
        if record_ids and r.get("id") not in record_ids:
            continue
        matched_json_monthly.append(r)

    # 2. Fetch from DB if not in JSON
    db_monthly = []
    if not matched_json_monthly:
        query = KpiEvaluation.query.filter(
            or_(
                KpiEvaluation.is_archived.is_(False),
                KpiEvaluation.is_archived.is_(None)
            )
        )
        if employee_id:
            query = query.filter(
                or_(
                    KpiEvaluation.employee_id == str(employee_id),
                    KpiEvaluation.employee_name == str(employee_id)
                )
            )
        if record_ids:
            query = query.filter(KpiEvaluation.id.in_(record_ids))
        else:
            query = query.filter(
                or_(
                    KpiEvaluation.frequency == "monthly",
                    KpiEvaluation.form.ilike("%month%"),
                    KpiEvaluation.description.ilike("%month%")
                )
            )
        db_monthly = query.order_by(KpiEvaluation.from_date.asc(), KpiEvaluation.id.asc()).all()

    eval_sources = matched_json_monthly or db_monthly
    if not eval_sources:
        return None

    first_src = eval_sources[0]
    team_name = _get_field(first_src, "team_name", "teamName", "department", default="Team")
    team_id = _get_field(first_src, "team_id", "teamId", default="")
    emp_id = _get_field(first_src, "employee_id", "employeeCode", "employeeId", default=employee_id or "")
    emp_name = _get_field(first_src, "employee_name", "employeeName", default="Employee")
    reporting_manager = _get_field(first_src, "reporting_manager", "managerName", default="")
    reporting_manager_id = _get_field(first_src, "reporting_manager_id", "managerId", default="")
    service_manager = _get_field(first_src, "service_manager", default="")
    service_manager_id = _get_field(first_src, "service_manager_id", default="")

    dates = []
    for r in eval_sources:
        d_val = _get_field(r, "startDate", "from_date", "endDate", "to_date")
        if isinstance(d_val, (date, datetime)):
            dates.append(d_val if isinstance(d_val, date) else d_val.date())
        elif isinstance(d_val, str) and d_val[:10]:
            try:
                dates.append(datetime.strptime(d_val[:10], "%Y-%m-%d").date())
            except Exception:
                pass

    ref_date = dates[0] if dates else date.today()
    q = quarter or get_quarter_from_month(ref_date.month)
    y = year or ref_date.year

    months, q_start, q_end = get_quarter_months_and_dates(q, y)

    stats = calculate_evaluation_working_days(emp_id, q_start, q_end)
    working_days_count = max(stats.get("working_days", 1), 1)
    aggregated_cats = aggregate_categories_metrics(eval_sources, working_days_count)

    emp_scores = []
    for r in eval_sources:
        val = _get_field(r, "employeeOverallScore", "employee_overall_score", "earned_score")
        try:
            if val is not None and float(val) > 0:
                emp_scores.append(float(val))
        except (ValueError, TypeError):
            pass
    avg_emp_score = round(sum(emp_scores) / len(emp_scores), 2) if emp_scores else 0.0

    mgr_scores = []
    for r in eval_sources:
        val = _get_field(r, "managerScore", "manager_score")
        try:
            if val is not None and float(val) > 0:
                mgr_scores.append(float(val))
        except (ValueError, TypeError):
            pass
    avg_mgr_score = round(sum(mgr_scores) / len(mgr_scores), 2) if mgr_scores else None

    all_remarks = []
    for r in eval_sources:
        rem = _get_field(r, "employeeRemarks", "employee_remark", default="")
        if rem and str(rem).strip():
            all_remarks.append(str(rem).strip())
    joined_emp_remarks = " | ".join(dict.fromkeys(all_remarks)) if all_remarks else f"Quarterly aggregation from {len(eval_sources)} monthly evaluations"

    mgr_remarks = []
    for r in eval_sources:
        rem = _get_field(r, "managerRemarks", "manager_remark", default="")
        if rem and str(rem).strip():
            mgr_remarks.append(str(rem).strip())
    joined_mgr_remarks = " | ".join(dict.fromkeys(mgr_remarks)) if mgr_remarks else None

    period_str = f"Q{q} {y} - Stage {q}"
    form_title = f"Q{q} Performance Metrics - {team_name}"
    desc_text = f"Performance evaluation for {team_name} ({period_str})"

    now = datetime.utcnow()
    quarterly_record = KpiEvaluation(
        form=form_title,
        team_id=str(team_id),
        team_name=team_name,
        metrics_data=aggregated_cats,
        performance_metrics=form_title,
        description=desc_text,
        target_score="100",
        weightage="100",
        employee_overall_score=avg_emp_score,
        employee_remark=joined_emp_remarks,
        manager_score=avg_mgr_score,
        manager_approve_score=str(avg_mgr_score) if avg_mgr_score is not None else "",
        manager_remark=joined_mgr_remarks,
        employee_id=str(emp_id),
        employee_name=emp_name,
        reporting_manager=reporting_manager,
        reporting_manager_id=str(reporting_manager_id),
        manager_id=str(reporting_manager_id),
        service_manager=service_manager,
        service_manager_id=str(service_manager_id),
        frequency="quarterly",
        from_date=q_start,
        to_date=q_end,
        working_days=working_days_count,
        leave_days=stats.get("leave_days", 0),
        holiday_days=stats.get("holiday_days", 0),
        status="Manager Reviewed" if avg_mgr_score is not None else "Assigned to Employee",
        is_archived=False,
        created_at=now,
        updated_at=now
    )

    db.session.add(quarterly_record)
    db.session.flush()

    # Soft archive monthly records in JSON store
    matched_ids = {r.get("id") for r in matched_json_monthly}
    for r in store.get("responses", []):
        if r.get("id") in matched_ids:
            r["is_archived"] = True
            r["status"] = "Archived"
            r["converted_to_id"] = quarterly_record.id
    write_eval_store(store)

    if db_monthly:
        for m in db_monthly:
            m.is_archived = True
            m.status = "Archived"
            m.converted_to_id = quarterly_record.id

    db.session.commit()
    logger.info(f"[KPI Manual Convert] Converted {len(eval_sources)} monthly evaluation(s) into quarterly entry (id={quarterly_record.id}).")
    return quarterly_record


def convert_quarterly_to_yearly_records(employee_id: str = None, record_ids: list = None, year: int = None) -> KpiEvaluation:
    """
    On-demand conversion from Quarterly records to 1 Annual/Yearly record.
    Supports both JSON store and PostgreSQL database records.
    """
    store = read_eval_store()
    json_responses = store.get("responses", [])

    matched_json_quarterly = []
    rid_set = set()
    if record_ids and len(record_ids) > 0:
        for rid in record_ids:
            s = str(rid).strip()
            rid_set.add(s)
            rid_set.add(s.replace("resp_", ""))
            rid_set.add(f"resp_{s.replace('resp_', '')}")

    for r in json_responses:
        freq = str(r.get("frequency") or "").strip().lower()
        form_name = str(r.get("form") or "").lower()
        period_name = str(r.get("periodName") or "").lower()
        is_quarter = freq == "quarterly" or "quarter" in form_name or "quarter" in period_name or any(q in form_name for q in ["q1", "q2", "q3", "q4"])
        if not is_quarter:
            continue
        if r.get("is_archived") or str(r.get("status") or "").lower() == "archived":
            continue

        r_id = str(r.get("id") or "")
        r_db_id = str(r.get("db_id") or "")
        r_emp = str(r.get("employeeCode") or r.get("employeeId") or "").strip()

        if rid_set:
            if r_id not in rid_set and r_db_id not in rid_set:
                continue
        elif employee_id:
            if r_emp != str(employee_id).strip() and str(r.get("employeeId") or "").strip() != str(employee_id).strip():
                continue
        matched_json_quarterly.append(r)

    db_quarterly = []
    if not matched_json_quarterly:
        query = KpiEvaluation.query.filter(
            or_(KpiEvaluation.is_archived == False, KpiEvaluation.is_archived.is_(None))
        )
        if record_ids and len(record_ids) > 0:
            int_rids = _parse_int_rids(record_ids)
            if int_rids:
                query = query.filter(KpiEvaluation.id.in_(int_rids))
            else:
                query = query.filter(False)
        elif employee_id:
            query = query.filter(
                KpiEvaluation.employee_id == str(employee_id),
                or_(
                    KpiEvaluation.frequency == "quarterly",
                    KpiEvaluation.form.ilike("%Q1%"),
                    KpiEvaluation.form.ilike("%Q2%"),
                    KpiEvaluation.form.ilike("%Q3%"),
                    KpiEvaluation.form.ilike("%Q4%"),
                    KpiEvaluation.form.ilike("%quarter%")
                )
            )
        db_quarterly = query.order_by(KpiEvaluation.from_date.asc(), KpiEvaluation.id.asc()).all()

    eval_sources = matched_json_quarterly or db_quarterly
    if not eval_sources:
        return None

    sample = eval_sources[0]
    emp_id = _get_field(sample, "employeeId", "employeeCode", "employee_id", default="")
    emp_name = _get_field(sample, "employeeName", "employee_name", default=f"Employee {emp_id}")
    team_id = _get_field(sample, "teamId", "team_id", default="General")
    team_name = _get_field(sample, "teamName", "team_name", default="Team")
    reporting_manager = _get_field(sample, "reportingManager", "reporting_manager", default="")
    reporting_manager_id = _get_field(sample, "reporting_manager_id", "manager_id", "managerId", default="")
    service_manager = _get_field(sample, "serviceManager", "service_manager", default="")
    service_manager_id = _get_field(sample, "service_manager_id", "serviceManagerId", default="")

    dates = []
    for r in eval_sources:
        d_val = _get_field(r, "startDate", "from_date", "endDate", "to_date")
        if isinstance(d_val, (date, datetime)):
            dates.append(d_val if isinstance(d_val, date) else d_val.date())
        elif isinstance(d_val, str) and d_val[:10]:
            try:
                dates.append(datetime.strptime(d_val[:10], "%Y-%m-%d").date())
            except Exception:
                pass

    ref_date = dates[0] if dates else date.today()
    y = year or ref_date.year

    y_start = date(y, 1, 1)
    y_end = date(y, 12, 31)

    stats = calculate_evaluation_working_days(emp_id, y_start, y_end)
    working_days_count = max(stats.get("working_days", 1), 1)
    aggregated_cats = aggregate_categories_metrics(eval_sources, working_days_count)

    emp_scores = []
    for r in eval_sources:
        val = _get_field(r, "employeeOverallScore", "employee_overall_score", "earned_score")
        try:
            if val is not None and float(val) > 0:
                emp_scores.append(float(val))
        except (ValueError, TypeError):
            pass
    avg_emp_score = round(sum(emp_scores) / len(emp_scores), 2) if emp_scores else 0.0

    mgr_scores = []
    for r in eval_sources:
        val = _get_field(r, "managerScore", "manager_score")
        try:
            if val is not None and float(val) > 0:
                mgr_scores.append(float(val))
        except (ValueError, TypeError):
            pass
    avg_mgr_score = round(sum(mgr_scores) / len(mgr_scores), 2) if mgr_scores else None

    all_remarks = []
    for r in eval_sources:
        rem = _get_field(r, "employeeRemarks", "employee_remark", default="")
        if rem and str(rem).strip():
            all_remarks.append(str(rem).strip())
    joined_emp_remarks = " | ".join(dict.fromkeys(all_remarks)) if all_remarks else f"Annual executive aggregation from {len(eval_sources)} quarterly evaluations"

    mgr_remarks = []
    for r in eval_sources:
        rem = _get_field(r, "managerRemarks", "manager_remark", default="")
        if rem and str(rem).strip():
            mgr_remarks.append(str(rem).strip())
    joined_mgr_remarks = " | ".join(dict.fromkeys(mgr_remarks)) if mgr_remarks else None

    period_str = f"Year {y} Annual Executive Evaluation"
    form_title = f"{y} Annual Performance Metrics - {team_name}"
    desc_text = f"Annual executive evaluation for {team_name} ({period_str})"

    now = datetime.utcnow()
    yearly_record = KpiEvaluation(
        form=form_title,
        team_id=str(team_id),
        team_name=team_name,
        metrics_data=aggregated_cats,
        performance_metrics=form_title,
        description=desc_text,
        target_score="100",
        weightage="100",
        employee_overall_score=avg_emp_score,
        employee_remark=joined_emp_remarks,
        manager_score=avg_mgr_score,
        manager_approve_score=str(avg_mgr_score) if avg_mgr_score is not None else "",
        manager_remark=joined_mgr_remarks,
        employee_id=str(emp_id),
        employee_name=emp_name,
        reporting_manager=reporting_manager,
        reporting_manager_id=str(reporting_manager_id),
        manager_id=str(reporting_manager_id),
        service_manager=service_manager,
        service_manager_id=str(service_manager_id),
        frequency="yearly",
        from_date=y_start,
        to_date=y_end,
        working_days=working_days_count,
        leave_days=stats.get("leave_days", 0),
        holiday_days=stats.get("holiday_days", 0),
        status="Manager Reviewed" if avg_mgr_score is not None else "Assigned to Employee",
        is_archived=False,
        created_at=now,
        updated_at=now
    )

    db.session.add(yearly_record)
    db.session.flush()

    # Soft archive quarterly records in JSON store
    matched_ids = {r.get("id") for r in matched_json_quarterly}
    for r in store.get("responses", []):
        if r.get("id") in matched_ids:
            r["is_archived"] = True
            r["status"] = "Archived"
            r["converted_to_id"] = yearly_record.id
    write_eval_store(store)

    if db_quarterly:
        for q in db_quarterly:
            q.is_archived = True
            q.status = "Archived"
            q.converted_to_id = yearly_record.id

    db.session.commit()
    logger.info(f"[KPI Manual Convert] Converted {len(eval_sources)} quarterly evaluation(s) into yearly entry (id={yearly_record.id}).")
    return yearly_record


def convert_evaluations_tier(employee_id: str, from_frequency: str, to_frequency: str, record_ids: list = None) -> KpiEvaluation:
    """
    Generic dispatcher for all conversion tiers.
    Supported:
    - daily -> weekly
    - weekly -> monthly
    - monthly -> quarterly
    - quarterly -> yearly
    """
    from_f = (from_frequency or "").strip().lower()
    to_f = (to_frequency or "").strip().lower()

    if from_f == "daily" and to_f == "weekly":
        return convert_daily_to_weekly_records(employee_id=employee_id, record_ids=record_ids)
    elif from_f == "weekly" and to_f == "monthly":
        return convert_weekly_to_monthly_records(employee_id=employee_id, record_ids=record_ids)
    elif from_f == "monthly" and to_f == "quarterly":
        return convert_monthly_to_quarterly_records(employee_id=employee_id, record_ids=record_ids)
    elif from_f == "quarterly" and to_f == "yearly":
        return convert_quarterly_to_yearly_records(employee_id=employee_id, record_ids=record_ids)
    else:
        raise ValueError(
            f"Unsupported conversion tier: from '{from_frequency}' to '{to_frequency}'. "
            f"Valid tiers: daily->weekly, weekly->monthly, monthly->quarterly, quarterly->yearly."
        )



def try_rollup_weekly_to_monthly_evaluations(employee_id: str, month: int, year: int) -> KpiEvaluation:
    """
    Rolls up all 'weekly' kpi_evaluations for an employee in a completed month into a 'monthly' entry.
    HARD DELETES the weekly rows after monthly entry is created!
    """
    # Check if this month has passed or is at its end
    today = date.today()
    current_month_start = date(today.year, today.month, 1)
    target_month_start = date(year, month, 1)

    # Only roll up completed months (or if month < current month)
    if target_month_start >= current_month_start:
        return None

    weekly_records = KpiEvaluation.query.filter(
        KpiEvaluation.employee_id == str(employee_id),
        KpiEvaluation.frequency == "weekly",
        extract('month', KpiEvaluation.to_date) == month,
        extract('year', KpiEvaluation.to_date) == year
    ).order_by(KpiEvaluation.from_date.asc()).all()

    if not weekly_records or len(weekly_records) < 2:
        return None

    sample = weekly_records[0]
    # Month range
    m_start = date(year, month, 1)
    # Last day of month
    if month == 12:
        m_end = date(year, 12, 31)
    else:
        m_end = date(year, month + 1, 1) - timedelta(days=1)

    stats = calculate_evaluation_working_days(employee_id, m_start, m_end)
    aggregated_cats = aggregate_categories_metrics(weekly_records, stats["working_days"])

    emp_scores = [r.employee_overall_score for r in weekly_records if r.employee_overall_score is not None and r.employee_overall_score > 0]
    avg_emp_score = round(sum(emp_scores) / len(emp_scores), 2) if emp_scores else 0.0

    mgr_scores = [r.manager_score for r in weekly_records if r.manager_score is not None and r.manager_score > 0]
    avg_mgr_score = round(sum(mgr_scores) / len(mgr_scores), 2) if mgr_scores else None

    month_name = m_start.strftime("%B")
    period_str = f"{month_name} {year}"
    form_title = f"{month_name} {year} Performance Metrics - {sample.team_name or 'Team'}"
    desc_text = f"Performance evaluation for {sample.team_name or 'Team'} ({period_str})"

    now = datetime.utcnow()
    monthly_record = KpiEvaluation(
        form=form_title,
        team_id=sample.team_id,
        team_name=sample.team_name,
        metrics_data=aggregated_cats,
        performance_metrics=form_title,
        description=desc_text,
        target_score="100",
        weightage="100",
        employee_overall_score=avg_emp_score,
        manager_score=avg_mgr_score,
        manager_approve_score=str(avg_mgr_score) if avg_mgr_score is not None else "",
        employee_id=sample.employee_id,
        employee_name=sample.employee_name,
        reporting_manager=sample.reporting_manager,
        reporting_manager_id=sample.reporting_manager_id,
        manager_id=sample.manager_id,
        service_manager=sample.service_manager,
        service_manager_id=sample.service_manager_id,
        frequency="monthly",
        from_date=m_start,
        to_date=m_end,
        working_days=stats["working_days"],
        leave_days=stats["leave_days"],
        holiday_days=stats["holiday_days"],
        status="Manager Reviewed" if avg_mgr_score is not None else "Assigned to Employee",
        created_at=now,
        updated_at=now
    )

    db.session.add(monthly_record)

    # Auto-delete commented out as requested (records preserved)
    # for w in weekly_records:
    #     db.session.delete(w)

    db.session.commit()
    logger.info(f"[KPI Rollup] Rolled up {len(weekly_records)} weekly evaluation(s) for emp={employee_id} into monthly entry (id={monthly_record.id}).")

    # Cascade to Quarterly
    quarter = get_quarter_from_month(month)
    try_rollup_monthly_to_quarterly_evaluations(employee_id, quarter, year)
    return monthly_record


def try_rollup_monthly_to_quarterly_evaluations(employee_id: str, quarter: int, year: int) -> KpiEvaluation:
    """
    Rolls up 3 'monthly' kpi_evaluations into a 'quarterly' entry.
    HARD DELETES the monthly rows once quarterly entry is stored!
    """
    months, q_start, q_end = get_quarter_months_and_dates(quarter, year)
    today = date.today()
    curr_q = get_quarter_from_month(today.month)

    # Only roll up completed quarters
    if year == today.year and quarter >= curr_q:
        return None

    monthly_records = KpiEvaluation.query.filter(
        KpiEvaluation.employee_id == str(employee_id),
        KpiEvaluation.frequency == "monthly",
        extract('month', KpiEvaluation.to_date).in_(months),
        extract('year', KpiEvaluation.to_date) == year
    ).order_by(KpiEvaluation.from_date.asc()).all()

    if not monthly_records or len(monthly_records) < 3:
        return None

    sample = monthly_records[0]

    stats = calculate_evaluation_working_days(employee_id, q_start, q_end)
    aggregated_cats = aggregate_categories_metrics(monthly_records, stats["working_days"])

    emp_scores = [r.employee_overall_score for r in monthly_records if r.employee_overall_score is not None and r.employee_overall_score > 0]
    avg_emp_score = round(sum(emp_scores) / len(emp_scores), 2) if emp_scores else 0.0

    mgr_scores = [r.manager_score for r in monthly_records if r.manager_score is not None and r.manager_score > 0]
    avg_mgr_score = round(sum(mgr_scores) / len(mgr_scores), 2) if mgr_scores else None

    period_str = f"Q{quarter} {year} - Stage {quarter}"
    form_title = f"Q{quarter} Performance Metrics - {sample.team_name or 'Team'}"
    desc_text = f"Performance evaluation for {sample.team_name or 'Team'} ({period_str})"

    now = datetime.utcnow()
    quarterly_record = KpiEvaluation(
        form=form_title,
        team_id=sample.team_id,
        team_name=sample.team_name,
        metrics_data=aggregated_cats,
        performance_metrics=form_title,
        description=desc_text,
        target_score="100",
        weightage="100",
        employee_overall_score=avg_emp_score,
        manager_score=avg_mgr_score,
        manager_approve_score=str(avg_mgr_score) if avg_mgr_score is not None else "",
        employee_id=sample.employee_id,
        employee_name=sample.employee_name,
        reporting_manager=sample.reporting_manager,
        reporting_manager_id=sample.reporting_manager_id,
        manager_id=sample.manager_id,
        service_manager=sample.service_manager,
        service_manager_id=sample.service_manager_id,
        frequency="quarterly",
        from_date=q_start,
        to_date=q_end,
        working_days=stats["working_days"],
        leave_days=stats["leave_days"],
        holiday_days=stats["holiday_days"],
        status="Manager Reviewed" if avg_mgr_score is not None else "Assigned to Employee",
        created_at=now,
        updated_at=now
    )

    db.session.add(quarterly_record)

    # Auto-delete commented out as requested (records preserved)
    # for m in monthly_records:
    #     db.session.delete(m)

    db.session.commit()
    logger.info(f"[KPI Rollup] Rolled up {len(monthly_records)} monthly evaluation(s) for emp={employee_id} into quarterly entry (id={quarterly_record.id}).")

    # Cascade to Yearly
    try_rollup_quarterly_to_yearly_evaluations(employee_id, year)
    return quarterly_record


def try_rollup_quarterly_to_yearly_evaluations(employee_id: str, year: int) -> KpiEvaluation:
    """
    Rolls up 4 'quarterly' kpi_evaluations into a permanent 'yearly' entry.
    HARD DELETES the quarterly rows! Only Yearly rows are permanent in DB.
    """
    today = date.today()
    if year >= today.year:
        return None

    quarterly_records = KpiEvaluation.query.filter(
        KpiEvaluation.employee_id == str(employee_id),
        KpiEvaluation.frequency == "quarterly",
        extract('year', KpiEvaluation.to_date) == year
    ).order_by(KpiEvaluation.from_date.asc()).all()

    if not quarterly_records or len(quarterly_records) < 4:
        return None

    sample = quarterly_records[0]
    y_start = date(year, 1, 1)
    y_end = date(year, 12, 31)

    stats = calculate_evaluation_working_days(employee_id, y_start, y_end)
    aggregated_cats = aggregate_categories_metrics(quarterly_records, stats["working_days"])

    emp_scores = [r.employee_overall_score for r in quarterly_records if r.employee_overall_score is not None and r.employee_overall_score > 0]
    avg_emp_score = round(sum(emp_scores) / len(emp_scores), 2) if emp_scores else 0.0

    mgr_scores = [r.manager_score for r in quarterly_records if r.manager_score is not None and r.manager_score > 0]
    avg_mgr_score = round(sum(mgr_scores) / len(mgr_scores), 2) if mgr_scores else None

    period_str = f"Year {year} Annual Executive Evaluation"
    form_title = f"{year} Annual Performance Metrics - {sample.team_name or 'Team'}"
    desc_text = f"Annual executive evaluation for {sample.team_name or 'Team'} ({period_str})"

    now = datetime.utcnow()
    yearly_record = KpiEvaluation(
        form=form_title,
        team_id=sample.team_id,
        team_name=sample.team_name,
        metrics_data=aggregated_cats,
        performance_metrics=form_title,
        description=desc_text,
        target_score="100",
        weightage="100",
        employee_overall_score=avg_emp_score,
        manager_score=avg_mgr_score,
        manager_approve_score=str(avg_mgr_score) if avg_mgr_score is not None else "",
        employee_id=sample.employee_id,
        employee_name=sample.employee_name,
        reporting_manager=sample.reporting_manager,
        reporting_manager_id=sample.reporting_manager_id,
        manager_id=sample.manager_id,
        service_manager=sample.service_manager,
        service_manager_id=sample.service_manager_id,
        frequency="yearly",
        from_date=y_start,
        to_date=y_end,
        working_days=stats["working_days"],
        leave_days=stats["leave_days"],
        holiday_days=stats["holiday_days"],
        status="Approved",
        created_at=now,
        updated_at=now
    )

    db.session.add(yearly_record)

    # Auto-delete commented out as requested (records preserved)
    # for q in quarterly_records:
    #     db.session.delete(q)

    db.session.commit()
    logger.info(f"[KPI Rollup] Rolled up 4 quarterly evaluations for emp={employee_id} {year} into permanent Yearly entry.")
    return yearly_record


def auto_rollup_kpi_evaluations_job() -> int:
    """
    Checks all completed daily evaluations older than the current week and aggregates them into weekly,
    deleting the daily rows. Then cascades to monthly, quarterly, and yearly.
    """
    today = date.today()
    current_week_start = today - timedelta(days=today.weekday()) # Monday of current week

    # Find daily evaluations older than the current week
    older_daily = KpiEvaluation.query.filter(
        KpiEvaluation.frequency == "daily",
        KpiEvaluation.from_date < current_week_start
    ).all()

    if not older_daily:
        return 0

    # Group by employee and week (week_start, week_end)
    grouped = {}
    for d in older_daily:
        if not d.from_date:
            continue
        w_start = d.from_date - timedelta(days=d.from_date.weekday())
        w_end = w_start + timedelta(days=6)
        key = (d.employee_id, w_start, w_end)
        grouped.setdefault(key, []).append(d)

    rolled_count = 0
    for (emp_id, w_start, w_end), records in grouped.items():
        try:
            res = rollup_daily_to_weekly_evaluations(emp_id, w_start, w_end)
            if res:
                rolled_count += 1
        except Exception as e:
            db.session.rollback()
            logger.error(f"[Auto Rollup Job] Failed to roll up daily evaluations for {emp_id} ({w_start} - {w_end}): {e}", exc_info=True)

    return rolled_count
