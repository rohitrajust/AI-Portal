from flask import Blueprint

docgen_bp = Blueprint("docgen", __name__)

from . import routes  # noqa: E402, F401
