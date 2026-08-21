from flask import Blueprint

arena_bp = Blueprint("arena", __name__)

from . import routes  # noqa
