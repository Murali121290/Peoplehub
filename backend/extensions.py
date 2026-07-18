import socketio as socketio_module
import contextvars
import inspect
import asyncio
import os

# Contextvar to store active socket session ID
_socket_sid_var = contextvars.ContextVar("socket_sid", default=None)

class SocketIOCompat:
    def __init__(self):
        # python-socketio Server in ASGI mode
        cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
        self.server = socketio_module.AsyncServer(cors_allowed_origins=cors_origins, async_mode="asgi")
        self.asgi_app = None

    def init_app(self, app):
        self.asgi_app = socketio_module.ASGIApp(self.server, app)

    def on(self, event_name):
        def decorator(func):
            @self.server.on(event_name)
            async def wrapper(sid, data=None, *args, **kwargs):
                _socket_sid_var.set(sid)
                sig = inspect.signature(func)
                params_count = len(sig.parameters)
                if inspect.iscoroutinefunction(func):
                    if params_count == 0:
                        return await func()
                    elif params_count == 1:
                        return await func(data)
                    else:
                        return await func(sid, data)
                else:
                    if params_count == 0:
                        return func()
                    elif params_count == 1:
                        return func(data)
                    else:
                        return func(sid, data)
            return func
        return decorator

    def emit(self, event, data=None, room=None, to=None, **kwargs):
        target = room or to
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.server.emit(event, data, to=target, **kwargs))
        except RuntimeError:
            # If no running event loop, run synchronously using new event loop
            asyncio.run(self.server.emit(event, data, to=target, **kwargs))

socketio = SocketIOCompat()

def join_room(room):
    sid = _socket_sid_var.get()
    if sid:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(socketio.server.enter_room(sid, str(room)))
        except RuntimeError:
            asyncio.run(socketio.server.enter_room(sid, str(room)))

def leave_room(room):
    sid = _socket_sid_var.get()
    if sid:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(socketio.server.leave_room(sid, str(room)))
        except RuntimeError:
            asyncio.run(socketio.server.leave_room(sid, str(room)))

def emit(event, data=None, room=None, to=None, broadcast=True, **kwargs):
    sid = _socket_sid_var.get()
    target = room or to
    if not target and not broadcast:
        target = sid
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(socketio.server.emit(event, data, to=target, **kwargs))
    except RuntimeError:
        asyncio.run(socketio.server.emit(event, data, to=target, **kwargs))