from flask import Blueprint

uidesign_bp = Blueprint("uidesign", __name__)

from . import routes  # noqa: E402, F401
