"""Redis-backed cache for the full Employee list.

Employee.query.all() (optionally filtered in Python by callers on .status or
.is_active) is re-run at ~20 call sites across the backend. This module caches
a lightweight projection - plain columns only, no db.LargeBinary blobs
(profile_image/resume_file/aadhaar_file/pan_file/degree_certificate) and no
relationships - and returns detached, read-only objects on a cache hit.

Only point READ-ONLY call sites at get_all_employees_cached(). Any call site
that mutates an Employee instance and commits it (e.g. leave balance credit
jobs) must keep using Employee.query.all()/get() directly, since a cached
copy can't be saved back.

Caching is a pure optimization: any Redis failure (unreachable, not
configured) falls back to a live DB query, never breaks the request.
"""
import json
import os
from datetime import date, datetime
from types import SimpleNamespace

_redis_client = None
_redis_init_attempted = False

CACHE_KEY = "peoplehub:employees:all:v1"
CACHE_TTL_SECONDS = 30

# Plain columns actually read across the call sites this cache serves.
# Deliberately excludes LargeBinary columns and the `team` relationship.
CACHE_FIELDS = [
    "id", "user_id", "employee_id", "first_name", "last_name", "email", "phone",
    "department", "designation", "reporting_manager", "shift_timing", "work_mode",
    "salary", "sick_leave", "casual_leave", "privilege_leave", "joining_date",
    "is_active", "status", "deactivation_reason", "last_working_date", "dob",
    "gender", "team_id", "pf_number", "uan_number", "esi_number", "account_number",
    "salary_paid", "salary_paid_date",
]

_DATE_FIELDS = {"joining_date", "dob", "last_working_date", "salary_paid_date"}


def _get_redis():
    global _redis_client, _redis_init_attempted
    if _redis_client is not None or _redis_init_attempted:
        return _redis_client
    _redis_init_attempted = True
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        return None
    try:
        import redis
        _redis_client = redis.from_url(redis_url, socket_connect_timeout=1, socket_timeout=1)
        _redis_client.ping()
    except Exception:
        _redis_client = None
    return _redis_client


def _serialize(employees):
    rows = []
    for e in employees:
        row = {}
        for field in CACHE_FIELDS:
            value = getattr(e, field, None)
            if isinstance(value, (date, datetime)):
                value = value.isoformat()
            row[field] = value
        row["has_profile_image"] = getattr(e, "profile_image", None) is not None
        rows.append(row)
    return rows


def _deserialize(rows):
    result = []
    for row in rows:
        data = dict(row)
        for field in _DATE_FIELDS:
            if data.get(field):
                try:
                    data[field] = date.fromisoformat(data[field])
                except (TypeError, ValueError):
                    pass
        # Callers only ever truthy-check `.profile_image` (never read the
        # blob itself) - this placeholder preserves that truthiness without
        # caching the actual binary data.
        data["profile_image"] = True if data.get("has_profile_image") else None
        result.append(SimpleNamespace(**data))
    return result


def get_all_employees_cached():
    """Read-only substitute for Employee.query.all(). Returns detached
    objects on a cache hit (SimpleNamespace, plain columns only) or real
    ORM instances on a cache miss/Redis-unavailable fallback - either way,
    only attribute reads are safe, never mutate the returned objects.
    """
    from models.employee import Employee

    client = _get_redis()
    if client is not None:
        try:
            cached = client.get(CACHE_KEY)
            if cached:
                return _deserialize(json.loads(cached))
        except Exception:
            pass

    employees = Employee.query.all()

    if client is not None:
        try:
            client.setex(CACHE_KEY, CACHE_TTL_SECONDS, json.dumps(_serialize(employees)))
        except Exception:
            pass

    return employees


def invalidate_employee_cache():
    client = _get_redis()
    if client is None:
        return
    try:
        client.delete(CACHE_KEY)
    except Exception:
        pass
