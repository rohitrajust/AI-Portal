import os
import re
import uuid
from flask import request, jsonify, session, render_template
from dotenv import load_dotenv
from . import tutor_bp
from .llm import ask_llm
from .validator import validate_input, validate_output, safe_metadata

load_dotenv()

MAX_HISTORY_MESSAGES = 24


def build_tutoring_prompt(user_message):
    """Enhance prompt with Socratic hints if asking about a concept."""
    text = (user_message or "").strip()
    if not text:
        return text

    lowered = text.lower()
    concept_match = re.search(
        r"\b(what is|what are|define|explain|tell me about|describe)\b\s+([a-z0-9 _-]{1,40})",
        lowered,
    )

    if concept_match:
        term = concept_match.group(2).strip().strip("?".strip())
        if term:
            return (
                f"{text}\n\nTutor behavior: the learner is asking about '{term}'. "
                "Start by asking what they already think it means. Do not define immediately."
            )

    return text


@tutor_bp.route("/", methods=["GET"])
def index():
    if "tutor_history" not in session:
        session["tutor_history"] = []
        session["tutor_ledger"] = {}
        session["tutor_session_id"] = str(uuid.uuid4())

    return jsonify({"service": "AI Tutor", "status": "running"})


@tutor_bp.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()

    valid, error = validate_input(user_message)
    if not valid:
        return jsonify({"error": error}), 400

    history = session.get("tutor_history", [])
    ledger = session.get("tutor_ledger", {})

    history.append({"role": "user", "content": user_message})
    history = history[-MAX_HISTORY_MESSAGES:]

    if history and history[-1].get("role") == "user":
        history[-1] = {"role": "user", "content": build_tutoring_prompt(history[-1].get("content", ""))}

    try:
        answer, meta = ask_llm(history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if meta is None:
        meta = safe_metadata()

    valid, result = validate_output(answer, meta)
    if not valid:
        evaluation = result if isinstance(result, dict) else {}
        return jsonify({
            "reply": result if isinstance(result, str) else "I need a clearer answer to guide you effectively.",
            "phase": meta.get("phase", ""),
            "topic": meta.get("topic", ""),
            "mastery": meta.get("mastery", 0),
            "confidence": evaluation.get("confidence", 0),
            "precision": evaluation.get("precision", 0),
            "recall": evaluation.get("recall", 0),
            "accuracy": evaluation.get("accuracy", 0),
            "ledger": ledger
        })

    confidence = result.get("confidence", 0)
    history.append({"role": "assistant", "content": answer})
    session["tutor_history"] = history

    topic = meta.get("topic", "").strip()

    def _normalize_topic(t):
        t = t.strip().lower()
        if t.endswith('s') and not t.endswith('ss'):
            t = t[:-1]
        return t

    norm_topic = _normalize_topic(topic)
    if norm_topic:
        try:
            mastery = int(float(meta.get("mastery", 0)))
        except Exception:
            mastery = 0
        mastery = max(0, min(100, mastery))
        previous = int(ledger.get(norm_topic, 0))
        ALPHA = 0.4
        new_mastery = int(round(previous + ALPHA * (mastery - previous)))
        ledger[norm_topic] = max(previous, new_mastery)
        session["tutor_ledger"] = ledger

    return jsonify({
        "reply": answer,
        "topic": topic,
        "phase": meta.get("phase", ""),
        "mastery": ledger.get(norm_topic, 0) if norm_topic else 0,
        "confidence": confidence,
        "precision": result.get("precision", 0),
        "recall": result.get("recall", 0),
        "accuracy": result.get("accuracy", 0),
        "difficulty": meta.get("difficulty", ""),
        "learning_goal": meta.get("learning_goal", ""),
        "next_skill": meta.get("next_skill", ""),
        "ledger": ledger
    })


@tutor_bp.route("/api/reset", methods=["POST"])
def reset():
    session["tutor_history"] = []
    session["tutor_ledger"] = {}
    return jsonify({"ok": True})
