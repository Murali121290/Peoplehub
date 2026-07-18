import re
import inspect
import contextvars
from functools import wraps
from typing import List
from fastapi import APIRouter, Request, HTTPException, Response as FastApiResponse
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from io import BytesIO
from utils.jwt_helper import _jwt_identity_var, decode_and_set_jwt_context

# Contextvar to hold the current request object
_request_var = contextvars.ContextVar("current_request", default=None)

class FilesWrapper:
    """Wrapper for files dictionary to support .get() method"""
    def __init__(self, files_dict):
        self._files = files_dict or {}

    def get(self, key, default=None):
        return self._files.get(key, default)

    def __getitem__(self, key):
        return self._files[key]

    def __contains__(self, key):
        return key in self._files

    def items(self):
        return self._files.items()

    def keys(self):
        return self._files.keys()

    def values(self):
        return self._files.values()

class RequestProxy:
    def __getattr__(self, name):
        req = _request_var.get()
        if req is None:
            raise RuntimeError("Working outside of request context.")
        return getattr(req, name)

    @property
    def json(self):
        req = _request_var.get()
        return getattr(req, "_cached_json", {})

    def get_json(self, force=False, silent=False):
        return self.json

    @property
    def args(self):
        req = _request_var.get()
        if req is None:
            return ArgsWrapper({})
        return ArgsWrapper(req.query_params)

    @property
    def form(self):
        req = _request_var.get()
        return getattr(req, "_cached_form", {})

    @property
    def files(self):
        req = _request_var.get()
        if req is None:
            return FilesWrapper({})
        files_dict = getattr(req, "_cached_files", {})
        return FilesWrapper(files_dict)


class ArgsWrapper:
    def __init__(self, query_params):
        self.query_params = query_params

    def get(self, key, default=None, type=None):
        val = self.query_params.get(key)
        if val is None:
            return default
        if type is not None:
            try:
                return type(val)
            except (ValueError, TypeError):
                return default
        return val

    def __getitem__(self, key):
        return self.query_params[key]

    def __contains__(self, key):
        return key in self.query_params

# Global proxy variable mimicking request context
request = RequestProxy()

def jsonify(content=None, **kwargs):
    if content is not None:
        return content
    return kwargs

def convert_path_flask_to_fastapi(path: str) -> str:
    # Converts Flask paths like /<int:id> into Starlette /{id:int}
    path = re.sub(r'<int:([^>]+)>', r'{\1:int}', path)
    path = re.sub(r'<string:([^>]+)>', r'{\1}', path)
    path = re.sub(r'<([^>:]+)>', r'{\1}', path)
    return path


def format_response(res):
    if isinstance(res, tuple):
        body, status_code = res
        if isinstance(body, (Response, JSONResponse, FileResponse)):
            body.status_code = status_code
            return body
        if isinstance(body, (dict, list)):
            return JSONResponse(status_code=status_code, content=body)
        return Response(content=str(body), status_code=status_code)
    return res

def make_compat_wrapper(func):
    sig = inspect.signature(func)
    has_request_param = "request" in sig.parameters

    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        # request will be injected via kwargs by FastAPI
        req: Request = kwargs.get("request")
        if not req:
            raise RuntimeError("FastAPI Request object was not passed to wrapper.")

        _request_var.set(req)

        # Cache JSON body
        if req.headers.get("content-type", "").startswith("application/json"):
            try:
                req._cached_json = await req.json()
            except Exception:
                req._cached_json = {}
        else:
            req._cached_json = {}

        # Cache form/files
        if "multipart/form-data" in req.headers.get("content-type", "") or "application/x-www-form-urlencoded" in req.headers.get("content-type", ""):
            try:
                form_data = await req.form()
                req._cached_form = dict(form_data)
                # Extract files (UploadFile objects have 'filename' attribute)
                files_dict = {}
                for key, value in form_data.items():
                    if hasattr(value, "filename") and value.filename:
                        files_dict[key] = value
                req._cached_files = files_dict
            except Exception as e:
                print(f"Error caching form/files: {e}")
                req._cached_form = {}
                req._cached_files = {}

        # Set up JWT Identity context
        auth_header = req.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            decode_and_set_jwt_context(token)
        else:
            _jwt_identity_var.set(None)

        # Build kwargs for original function
        call_kwargs = kwargs.copy()
        if not has_request_param:
            call_kwargs.pop("request", None)

        try:
            if inspect.iscoroutinefunction(func):
                res = await func(*args, **call_kwargs)
            else:
                res = func(*args, **call_kwargs)
        except HTTPException as he:
            raise he
        except Exception as e:
            import traceback
            traceback.print_exc()
            return JSONResponse(status_code=500, content={"success": False, "error": str(e)})

        return format_response(res)

    # Rewrite signature to include the path parameters and inject the Request object
    parameters = list(sig.parameters.values())
    if "request" not in sig.parameters:
        parameters.append(
            inspect.Parameter(
                "request",
                inspect.Parameter.POSITIONAL_OR_KEYWORD,
                annotation=Request
            )
        )
    async_wrapper.__signature__ = sig.replace(parameters=parameters)
    return async_wrapper

class Blueprint(APIRouter):
    def __init__(self, name: str, import_name: str = None, url_prefix: str = ""):
        super().__init__(prefix=url_prefix)

    def route(self, path: str, methods: List[str] = None, **kwargs):
        if methods is None:
            methods = ["GET"]
        def decorator(func):
            converted_path = convert_path_flask_to_fastapi(path)
            wrapped = make_compat_wrapper(func)
            super(Blueprint, self).add_api_route(
                converted_path,
                wrapped,
                methods=methods,
                **kwargs
            )
            return func
        return decorator

    def get(self, path: str, **kwargs):
        return self.route(path, methods=["GET"], **kwargs)

    def post(self, path: str, **kwargs):
        return self.route(path, methods=["POST"], **kwargs)

    def put(self, path: str, **kwargs):
        return self.route(path, methods=["PUT"], **kwargs)

    def delete(self, path: str, **kwargs):
        return self.route(path, methods=["DELETE"], **kwargs)

class ResponseCompat(FastApiResponse):
    def __init__(self, content=None, status_code=200, headers=None, media_type=None, mimetype=None, **kwargs):
        mtype = media_type or mimetype
        # standard FastApiResponse accepts content as bytes/str. If content is none or dict, handle.
        super().__init__(content=content, status_code=status_code, headers=headers, media_type=mtype, **kwargs)

Response = ResponseCompat

def send_file(filename_or_fp, mimetype=None, as_attachment=False, download_name=None):
    headers = {}
    if as_attachment and download_name:
        headers["Content-Disposition"] = f'attachment; filename="{download_name}"'
        
    if isinstance(filename_or_fp, BytesIO):
        filename_or_fp.seek(0)
        return StreamingResponse(filename_or_fp, media_type=mimetype, headers=headers)
        
    return FileResponse(filename_or_fp, media_type=mimetype, headers=headers)

# current_app mock configuration proxy
from config.config import Config
import os

class ConfigProxy:
    def get(self, name, default=None):
        return getattr(Config, name, default)

class CurrentAppMock:
    config = ConfigProxy()
    
    @property
    def root_path(self):
        # Maps to backend folder
        return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

current_app = CurrentAppMock()


# Monkey-patch starlette.datastructures.UploadFile to support Flask-like synchronous read() and save() methods
from starlette.datastructures import UploadFile

def upload_file_read_sync(self, size: int = -1) -> bytes:
    try:
        self.file.seek(0)
    except Exception:
        pass
    return self.file.read(size)

def upload_file_save_sync(self, destination) -> None:
    try:
        self.file.seek(0)
    except Exception:
        pass
    if isinstance(destination, str):
        with open(destination, "wb") as f:
            f.write(self.file.read())
    else:
        destination.write(self.file.read())

UploadFile.read = upload_file_read_sync
UploadFile.save = upload_file_save_sync

