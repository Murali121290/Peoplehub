import os
import jwt
from datetime import datetime, timedelta
import contextvars
from functools import wraps
import inspect
from fastapi import HTTPException, Request

JWT_SECRET_KEY = os.environ.get(
    'JWT_SECRET_KEY',
    'peoplehub-enterprise-super-secret-jwt-key-2026-secure'
)

_jwt_identity_var = contextvars.ContextVar("jwt_identity", default=None)

def create_access_token(identity: str, expires_delta: timedelta = None):
    if not expires_delta:
        expires_delta = timedelta(hours=24)
    expire = datetime.utcnow() + expires_delta
    payload = {
        "sub": str(identity),
        "type": "access",
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

def create_refresh_token(identity: str, expires_delta: timedelta = None):
    if not expires_delta:
        expires_delta = timedelta(days=30)
    expire = datetime.utcnow() + expires_delta
    payload = {
        "sub": str(identity),
        "type": "refresh",
        "exp": expire
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

def get_jwt_identity():
    return _jwt_identity_var.get()

def verify_jwt_in_request():
    identity = _jwt_identity_var.get()
    if not identity:
        raise RuntimeError("Missing or invalid token")


def jwt_required():
    def decorator(func):
        if inspect.iscoroutinefunction(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                identity = _jwt_identity_var.get()
                if not identity:
                    raise HTTPException(
                        status_code=401,
                        detail="Missing or invalid token"
                    )
                return await func(*args, **kwargs)
            return wrapper
        else:
            @wraps(func)
            def wrapper(*args, **kwargs):
                identity = _jwt_identity_var.get()
                if not identity:
                    raise HTTPException(
                        status_code=401,
                        detail="Missing or invalid token"
                    )
                return func(*args, **kwargs)
            return wrapper
    return decorator

# Helper to decode and set context
def decode_and_set_jwt_context(token: str) -> bool:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        identity = payload.get("sub")
        token_type = payload.get("type")
        if identity and token_type == "access":
            _jwt_identity_var.set(identity)
            return True
    except jwt.PyJWTError:
        pass
    _jwt_identity_var.set(None)
    return False
