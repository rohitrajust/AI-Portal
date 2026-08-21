from flask import Blueprint

whiteboard_bp = Blueprint("whiteboard", __name__)

from . import routes  # noqa
