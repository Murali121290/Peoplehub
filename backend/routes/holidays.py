import calendar
from datetime import datetime, date, timedelta
from utils.compat import Blueprint, request, jsonify
from models.database import db
from models.holiday import Holiday, HolidayOverride
from middleware.auth import auth_required, access_level_required

holidays_bp = Blueprint("holidays", __name__)

def get_weekly_offs_for_month(year, month):
    weeks = calendar.monthcalendar(year, month)
    weekly_offs = []
    working_saturdays = []
    
    sat_count = 0
    for week in weeks:
        sat = week[5]
        sun = week[6]
        
        if sat != 0:
            sat_count += 1
            sat_date = date(year, month, sat)
            if sat_count in [2, 4]:
                weekly_offs.append({
                    "date": sat_date.strftime("%Y-%m-%d"),
                    "name": "Weekly Off (2nd Saturday)" if sat_count == 2 else "Weekly Off (4th Saturday)",
                    "day": "Saturday",
                    "holiday_type": "Weekly Off"
                })
            else:
                working_saturdays.append({
                    "date": sat_date.strftime("%Y-%m-%d"),
                    "name": "Working Day (Saturday)",
                    "day": "Saturday",
                    "holiday_type": "Working Day"
                })
        
        if sun != 0:
            sun_date = date(year, month, sun)
            weekly_offs.append({
                "date": sun_date.strftime("%Y-%m-%d"),
                "name": "Weekly Off (Sunday)",
                "day": "Sunday",
                "holiday_type": "Weekly Off"
            })
            
    return weekly_offs, working_saturdays

def get_month_schedule(year, month, include_unpublished=False):
    # Get last day of month
    _, last_day = calendar.monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)
    
    # Fetch overrides
    overrides = HolidayOverride.query.filter(
        HolidayOverride.date >= start_date,
        HolidayOverride.date <= end_date
    ).all()
    overrides_dict = {o.date.strftime("%Y-%m-%d"): o for o in overrides}
    
    # Fetch custom holidays
    holiday_query = Holiday.query.filter(
        Holiday.date >= start_date,
        Holiday.date <= end_date
    )
    if not include_unpublished:
        holiday_query = holiday_query.filter(Holiday.is_published == True)
    custom_holidays = holiday_query.all()
    custom_holidays_dict = {h.date.strftime("%Y-%m-%d"): h for h in custom_holidays}
    
    schedule = []
    
    for day in range(1, last_day + 1):
        cur_date = date(year, month, day)
        date_str = cur_date.strftime("%Y-%m-%d")
        day_name = cur_date.strftime("%A")
        
        # Check override
        if date_str in overrides_dict:
            override = overrides_dict[date_str]
            if override.override_type == "Holiday":
                schedule.append({
                    "date": date_str,
                    "name": override.name or "Holiday Override",
                    "day": day_name,
                    "holiday_type": override.holiday_type or "Holiday",
                    "is_holiday": True,
                    "is_override": True
                })
            else: # Working Day
                schedule.append({
                    "date": date_str,
                    "name": override.name or "Working Day",
                    "day": day_name,
                    "holiday_type": "Working Day",
                    "is_holiday": False,
                    "is_override": True
                })
        # Check custom holiday
        elif date_str in custom_holidays_dict:
            h = custom_holidays_dict[date_str]
            schedule.append({
                "date": date_str,
                "name": h.name,
                "day": day_name,
                "holiday_type": h.holiday_type,
                "is_holiday": True,
                "is_override": False,
                "is_published": h.is_published
            })
        # Check Sunday
        elif day_name == "Sunday":
            schedule.append({
                "date": date_str,
                "name": "Weekly Off (Sunday)",
                "day": day_name,
                "holiday_type": "Weekly Off",
                "is_holiday": True,
                "is_override": False
            })
        # Check Saturday
        elif day_name == "Saturday":
            # Count Saturday number in current month
            sat_count = 0
            for d in range(1, day + 1):
                if date(year, month, d).strftime("%A") == "Saturday":
                    sat_count += 1
            
            if sat_count in [2, 4]:
                schedule.append({
                    "date": date_str,
                    "name": f"Weekly Off (2nd Saturday)" if sat_count == 2 else f"Weekly Off (4th Saturday)",
                    "day": day_name,
                    "holiday_type": "Weekly Off",
                    "is_holiday": True,
                    "is_override": False
                })
            else:
                suffix = "st" if sat_count == 1 else ("rd" if sat_count == 3 else "th")
                schedule.append({
                    "date": date_str,
                    "name": f"Working Day ({sat_count}{suffix} Saturday)",
                    "day": day_name,
                    "holiday_type": "Working Day",
                    "is_holiday": False,
                    "is_override": False
                })
        else:
            schedule.append({
                "date": date_str,
                "name": "Working Day",
                "day": day_name,
                "holiday_type": "Working Day",
                "is_holiday": False,
                "is_override": False
            })
            
    return schedule

# =========================================================================
# EMPLOYEE ROUTE: GET HOLIDAYS CALENDAR (Published Only)
# =========================================================================
@holidays_bp.route("/employee/holidays", methods=["GET"])
@auth_required
def get_employee_holidays():
    try:
        # Determine target month & year
        target_month = request.args.get("month", default=datetime.today().month, type=int)
        target_year = request.args.get("year", default=datetime.today().year, type=int)
        
        # 1. Fetch current month's schedule
        schedule = get_month_schedule(target_year, target_month, include_unpublished=False)
        current_month_holidays = [item for item in schedule if item["is_holiday"]]
        
        # 2. Get standard weekly offs
        standard_weekly_offs, _ = get_weekly_offs_for_month(target_year, target_month)
        
        # 3. Calculate next 5 upcoming holidays (include current, next, and third month)
        today = date.today()
        all_schedule = []
        for offset in range(3):
            # Compute future year and month
            m = today.month + offset
            y = today.year
            if m > 12:
                m = m - 12
                y = y + 1
            all_schedule.extend(get_month_schedule(y, m, include_unpublished=False))
            
        upcoming = []
        for item in all_schedule:
            item_date = datetime.strptime(item["date"], "%Y-%m-%d").date()
            if item["is_holiday"] and item_date >= today:
                days_left = (item_date - today).days
                days_left_str = "Today" if days_left == 0 else f"{days_left} days left"
                upcoming.append({
                    "name": item["name"],
                    "date": item["date"],
                    "day": item["day"],
                    "holiday_type": item["holiday_type"],
                    "days_remaining": days_left_str
                })
                
        # Sort and take 5
        upcoming.sort(key=lambda x: x["date"])
        upcoming_holidays = upcoming[:5]
        
        # 4. Fetch overrides list (for responsiveness check)
        start_date = date(target_year, target_month, 1)
        _, last_day = calendar.monthrange(target_year, target_month)
        end_date = date(target_year, target_month, last_day)
        overrides = HolidayOverride.query.filter(
            HolidayOverride.date >= start_date,
            HolidayOverride.date <= end_date
        ).all()
        
        all_published = Holiday.query.filter_by(is_published=True).order_by(Holiday.date.asc()).all()
        all_overrides = HolidayOverride.query.all()
        
        override_dict = {o.date.strftime("%Y-%m-%d"): o for o in all_overrides if o.date}
        published_list = []
        
        for h in all_published:
            if not h.date:
                continue
            h_date_str = h.date.strftime("%Y-%m-%d")
            
            if h_date_str in override_dict:
                ov = override_dict[h_date_str]
                if ov.override_type == "Working Day":
                    pass # Cancelled holiday
                elif ov.override_type == "Holiday":
                    d = ov.to_dict()
                    d["is_published"] = True
                    d["day"] = h.day
                    published_list.append(d)
                del override_dict[h_date_str]
            else:
                published_list.append(h.to_dict())
                
        for date_str, ov in override_dict.items():
            if ov.override_type == "Holiday":
                d = ov.to_dict()
                d["is_published"] = True
                d["day"] = ov.date.strftime("%A") if ov.date else ""
                published_list.append(d)
                
        published_list.sort(key=lambda x: x.get("date") or "")

        return jsonify({
            "current_month_schedule": schedule,
            "current_month_holidays": current_month_holidays,
            "weekly_offs": standard_weekly_offs,
            "upcoming_holidays": upcoming_holidays,
            "published_holidays": published_list,
            "overrides": [o.to_dict() for o in overrides]
        }), 200
        
    except Exception as e:
        print("GET EMPLOYEE HOLIDAYS ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

# =========================================================================
# ADMIN ROUTE: GET ALL CUSTOM HOLIDAYS (Both Published & Draft)
# =========================================================================
@holidays_bp.route("/holidays", methods=["GET"])
@auth_required
@access_level_required("admin", "hr")
def get_admin_holidays():
    try:
        # Returns raw list of custom holidays from database
        holidays = Holiday.query.order_by(Holiday.date.asc()).all()
        overrides = HolidayOverride.query.order_by(HolidayOverride.date.asc()).all()
        return jsonify({
            "holidays": [h.to_dict() for h in holidays],
            "overrides": [o.to_dict() for o in overrides]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================================================================
# ADMIN ROUTE: GET HOLIDAY TYPES
# =========================================================================
@holidays_bp.route("/holidays/types", methods=["GET"])
@auth_required
@access_level_required("admin", "hr")
def get_holiday_types():
    try:
        types = db.session.query(Holiday.holiday_type).distinct().all()
        # Handle cases where there might be no holidays yet by providing defaults
        default_types = ["National Holiday", "Festival Holiday", "Company Holiday", "Weekly Off"]
        db_types = [t[0] for t in types if t[0]]
        
        # Merge and keep unique
        all_types = list(set(default_types + db_types))
        all_types.sort()
        
        return jsonify({"types": all_types}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================================================================
# ADMIN ROUTE: CREATE HOLIDAY
# =========================================================================
@holidays_bp.route("/holidays", methods=["POST"])
@auth_required
@access_level_required("admin", "hr")
def create_holiday():
    try:
        data = request.get_json()
        name = data.get("name")
        date_str = data.get("date")
        holiday_type = data.get("holiday_type", "Festival Holiday")
        is_published = data.get("is_published", False)
        
        if not name or not date_str:
            return jsonify({"error": "Name and date are required"}), 400
            
        parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        day_name = parsed_date.strftime("%A")
        
        # Check if already exists
        existing = Holiday.query.filter_by(date=parsed_date).first()
        if existing:
            return jsonify({"error": "A holiday already exists on this date"}), 400
            
        new_holiday = Holiday(
            name=name,
            date=parsed_date,
            day=day_name,
            holiday_type=holiday_type,
            is_published=is_published
        )
        db.session.add(new_holiday)
        db.session.commit()
        
        return jsonify({"success": True, "holiday": new_holiday.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# =========================================================================
# ADMIN ROUTE: UPDATE HOLIDAY
# =========================================================================
@holidays_bp.route("/holidays/<int:id>", methods=["PUT"])
@auth_required
@access_level_required("admin", "hr")
def update_holiday(id):
    try:
        holiday = Holiday.query.get(id)
        if not holiday:
            return jsonify({"error": "Holiday not found"}), 404
            
        data = request.get_json()
        holiday.name = data.get("name", holiday.name)
        date_str = data.get("date")
        if date_str:
            parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            holiday.date = parsed_date
            holiday.day = parsed_date.strftime("%A")
            
        holiday.holiday_type = data.get("holiday_type", holiday.holiday_type)
        holiday.is_published = data.get("is_published", holiday.is_published)
        
        db.session.commit()
        return jsonify({"success": True, "holiday": holiday.to_dict()}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# =========================================================================
# ADMIN ROUTE: DELETE HOLIDAY
# =========================================================================
@holidays_bp.route("/holidays/<int:id>", methods=["DELETE"])
@auth_required
@access_level_required("admin", "hr")
def delete_holiday(id):
    try:
        holiday = Holiday.query.get(id)
        if not holiday:
            return jsonify({"error": "Holiday not found"}), 404
            
        db.session.delete(holiday)
        db.session.commit()
        return jsonify({"success": True, "message": "Holiday deleted"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# =========================================================================
# ADMIN ROUTE: PUBLISH ALL HOLIDAYS (Bulk publish)
# =========================================================================
@holidays_bp.route("/holidays/publish", methods=["POST"])
@auth_required
@access_level_required("admin", "hr")
def publish_holidays():
    try:
        unpublished = Holiday.query.filter_by(is_published=False).all()
        for h in unpublished:
            h.is_published = True
        db.session.commit()
        return jsonify({"success": True, "message": f"Published {len(unpublished)} holidays"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# =========================================================================
# ADMIN ROUTE: MANAGE OVERRIDES (Working/Holiday swap for Weekend)
# =========================================================================
@holidays_bp.route("/holidays/override", methods=["POST"])
@auth_required
@access_level_required("admin", "hr")
def manage_override():
    try:
        data = request.get_json()
        date_str = data.get("date")
        override_type = data.get("override_type") # "Working Day" or "Holiday"
        name = data.get("name")
        holiday_type = data.get("holiday_type")
        
        if not date_str or not override_type:
            return jsonify({"error": "Date and override_type are required"}), 400
            
        parsed_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Check if override already exists
        existing = HolidayOverride.query.filter_by(date=parsed_date).first()
        if existing:
            if override_type == "none": # Clear override
                db.session.delete(existing)
                db.session.commit()
                return jsonify({"success": True, "message": "Override cleared"}), 200
            else:
                existing.override_type = override_type
                existing.name = name
                existing.holiday_type = holiday_type
        else:
            if override_type != "none":
                new_override = HolidayOverride(
                    date=parsed_date,
                    override_type=override_type,
                    name=name,
                    holiday_type=holiday_type
                )
                db.session.add(new_override)
                
        db.session.commit()
        return jsonify({"success": True, "message": "Override saved successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
