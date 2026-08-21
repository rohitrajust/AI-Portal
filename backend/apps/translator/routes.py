from flask import jsonify, current_app, request
from . import translator_bp
from .engine import translate_to_english


@translator_bp.route("/", methods=["GET"])
def info():
    return jsonify({"service": "Real-Time Translator", "status": "running (ws placeholder)"})


@translator_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "proto": "websocket", "ws_path": "/api/translator/ws"})


@translator_bp.route("/api/translate", methods=["POST"])
def translate():
    """Translate Japanese text to English.

    Mirrors the WebSocket `flush` behaviour over plain HTTP so the Next.js
    proxy at app/api/translator/route.ts has a REST endpoint to call. On
    failure this returns a non-2xx status so that proxy falls back to its
    secondary translator rather than surfacing an empty result.
    """
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "Missing translator text in request body."}), 400

    english = translate_to_english(text)
    if english is None:
        return jsonify({"error": "Translation provider unavailable."}), 502

    return jsonify({"japanese": text, "english": english})
