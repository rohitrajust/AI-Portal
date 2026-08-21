import logging
import sys

from flask import Flask, jsonify
from flask_cors import CORS

# On Windows stdout defaults to cp1252, so printing non-ASCII model output
# (e.g. the arrow in "Login -> Dashboard") raises UnicodeEncodeError and
# aborts the request. Force UTF-8 so diagnostics can never break a response.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from apps.arena import arena_bp
from apps.tutor import tutor_bp
from apps.translator import translator_bp, init_sock
from apps.docgen import docgen_bp
from apps.whiteboard import whiteboard_bp
from apps.uidesign import uidesign_bp
from config import Config


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend
    # The Next.js dev server uses 3000, but falls back to 3001 when that
    # port is already taken. Both host spellings are listed because
    # localhost and 127.0.0.1 are distinct browser origins.
    CORS(app, origins=[
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:3001", "http://127.0.0.1:3001",
    ])

    # Register blueprints with URL prefixes
    app.register_blueprint(arena_bp, url_prefix="/api/arena")
    app.register_blueprint(tutor_bp, url_prefix="/api/tutor")
    app.register_blueprint(translator_bp, url_prefix="/api/translator")
    app.register_blueprint(docgen_bp, url_prefix="/api/docgen")
    app.register_blueprint(whiteboard_bp, url_prefix="/api/whiteboard")
    app.register_blueprint(uidesign_bp, url_prefix="/api/uidesign")

    # Initialize translator WebSocket integration (flask-sock)
    try:
        init_sock(app)
    except Exception as e:
        print(f"[WARNING] Failed to initialize WebSocket support: {e}")

    @app.route("/api/health", methods=["GET"])
    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "message": "AiPortal unified backend",
            "apps": ["arena", "tutor", "translator", "docgen", "whiteboard", "uidesign"]
        })

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=False)
