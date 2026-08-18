"""
utils/uploads.py
Centralized helper to resolve the uploads base directory.

- In Docker: UPLOADS_DIR=/opt/uploads (mounted named volume via docker-compose)
- In local dev: defaults to /opt/uploads as well (matches the volume mount default)
  Set UPLOADS_DIR to any local path in your .env to override.
"""
import os

def get_uploads_dir() -> str:
    """Return the base uploads directory, always absolute."""
    return os.environ.get("UPLOADS_DIR", "/opt/uploads")

def get_upload_path(*parts: str) -> str:
    """
    Build a full absolute path under the uploads directory.
    Example: get_upload_path("employees", "42", "profile.jpg")
             -> /opt/uploads/employees/42/profile.jpg
    """
    return os.path.join(get_uploads_dir(), *parts)

def ensure_upload_dir(*parts: str) -> str:
    """
    Build and create (if needed) a subdirectory under uploads.
    Returns the full absolute directory path.
    Example: ensure_upload_dir("shift_requests")
             -> /opt/uploads/shift_requests  (directory is created)
    """
    path = get_upload_path(*parts)
    os.makedirs(path, exist_ok=True)
    return path
