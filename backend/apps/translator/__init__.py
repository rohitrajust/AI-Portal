from flask import Blueprint

translator_bp = Blueprint("translator", __name__)


def init_sock(app):
    """Create a Sock instance and register WS handlers from .ws module."""
    try:
        from flask_sock import Sock

        sock = Sock(app)
        # Import ws module that exposes a register(sock) function
        try:
            from . import ws as _ws

            _ws.register(sock)
        except Exception:
            # If ws module or register fails, continue with a no-op sock
            pass
        return sock
    except Exception:
        return None


from . import routes  # noqa
