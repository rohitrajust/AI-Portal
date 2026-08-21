from flask import Blueprint

tutor_bp = Blueprint("tutor", __name__)

from . import routes  # noqa
