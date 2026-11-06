"""Shared Redis client for request-level caching.

One connection pool per worker process (instead of a new connection + PING on
every request). Caching is a pure optimization: if Redis is unreachable this
returns None and callers fall back to Postgres. After a failure we retry
connecting at most every RETRY_AFTER_SECONDS so a Redis outage doesn't add a
connect timeout to every request.
"""
import json
import os
import time

_client = None
_client_url = None
_last_failure = 0.0
RETRY_AFTER_SECONDS = 30


def _candidate_urls():
    url = os.environ.get("REDIS_URL") or "redis://redis:6379/0"
    urls = [url]
    if "localhost" in url or "127.0.0.1" in url:
        urls += ["redis://redis:6379/0", "redis://peoplehub_redis:6379/0"]
    return urls


def get_redis():
    """Return a shared Redis client (decode_responses=True), or None."""
    global _client, _client_url, _last_failure
    if _client is not None:
        return _client
    if _last_failure and time.monotonic() - _last_failure < RETRY_AFTER_SECONDS:
        return None
    try:
        import redis
    except Exception:
        _last_failure = time.monotonic()
        return None
    for u in _candidate_urls():
        try:
            client = redis.from_url(
                u,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=1,
                health_check_interval=30,
            )
            client.ping()
            _client = client
            _client_url = u
            return _client
        except Exception:
            continue
    _last_failure = time.monotonic()
    return None


def get_redis_url():
    """URL of the Redis instance get_redis() connected to, or None."""
    return _client_url if get_redis() is not None else None


def cache_get_json(key):
    """Return the decoded JSON value for key, or None on miss/error."""
    r = get_redis()
    if r is None:
        return None
    try:
        raw = r.get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def cache_set_json(key, value, ttl_seconds):
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception:
        pass


def cache_delete(*keys):
    r = get_redis()
    if r is None or not keys:
        return
    try:
        r.delete(*keys)
    except Exception:
        pass
