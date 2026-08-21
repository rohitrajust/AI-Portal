import json
import requests
from flask import jsonify, request, Response, stream_with_context
from . import arena_bp
from .llm import call_groq, call_nvidia, judge_debate, run_debate


def generate_debate_stream(topic, rounds):
    """SSE stream generator for live debate updates."""
    system_a = f"You are Debater A debating: '{topic}'. Respond in 3-4 sentences, be persuasive, engage directly."
    system_b = f"You are Debater B debating: '{topic}'. Take a contrasting stance. Respond in 3-4 sentences, engage directly."

    transcript = []
    current_message = f"Give your opening statement on: '{topic}'."
    speaker = "A"
    failed = False

    for i in range(rounds * 2):
        thinking_label = "Model A (Groq)" if speaker == "A" else "Model B (Nvidia)"
        yield f"data: {json.dumps({'type': 'thinking', 'speaker': thinking_label})}\n\n"

        try:
            if speaker == "A":
                reply = call_groq(current_message, system_a)
                turn = {"speaker": "Model A (Groq)", "text": reply}
                speaker = "B"
            else:
                reply = call_nvidia(current_message, system_b)
                turn = {"speaker": "Model B (Nvidia)", "text": reply}
                speaker = "A"
            transcript.append(turn)
            current_message = reply
            yield f"data: {json.dumps({'type': 'turn', 'turn': turn})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
            failed = True
            break

    if failed:
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return

    try:
        verdict = judge_debate(topic, transcript)
        yield f"data: {json.dumps({'type': 'verdict', 'verdict': verdict})}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    yield f"data: {json.dumps({'type': 'done'})}\n\n"


@arena_bp.route("/", methods=["GET"])
def info():
    return jsonify({"service": "AI Model Arena", "status": "running"})


@arena_bp.route("/api/debate", methods=["POST"])
def debate():
    data = request.get_json()
    topic = data.get("topic", "").strip()
    rounds = int(data.get("rounds", 5))

    if not topic:
        return jsonify({"error": "Topic is required"}), 400
    if rounds < 1 or rounds > 20:
        return jsonify({"error": "Rounds must be between 1 and 20"}), 400

    try:
        transcript = run_debate(topic, rounds)
        verdict = judge_debate(topic, transcript)
        return jsonify({"topic": topic, "rounds": rounds, "transcript": transcript, "verdict": verdict})
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"LLM API error: {str(e)}"}), 502
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@arena_bp.route("/api/debate/stream", methods=["POST"])
def debate_stream():
    data = request.get_json()
    topic = data.get("topic", "").strip()
    rounds = int(data.get("rounds", 5))

    if not topic:
        return jsonify({"error": "Topic is required"}), 400
    if rounds < 1 or rounds > 20:
        return jsonify({"error": "Rounds must be between 1 and 20"}), 400

    return Response(
        stream_with_context(generate_debate_stream(topic, rounds)),
        mimetype="text/event-stream"
    )
