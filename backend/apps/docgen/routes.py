import json
from flask import request, jsonify, send_file

from . import docgen_bp

# Import local utils (copied from original project)
from .utils.llm_client import call_llm, LLMError
from .utils.doc_generator import build_docx, DOCUMENT_TEMPLATES


@docgen_bp.route("/", methods=["GET"])
def index():
    return jsonify({"service": "voice-doc-generator", "status": "running"})


@docgen_bp.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json(force=True)
    transcript = (data.get("transcript") or "").strip()
    forced_type = data.get("doc_type")

    if not transcript:
        return jsonify({"error": "Empty transcript"}), 400

    valid_doc_types = set(DOCUMENT_TEMPLATES.keys())
    if forced_type not in valid_doc_types:
        forced_type = None

    type_list = ", ".join(DOCUMENT_TEMPLATES.keys())
    system_prompt = f"""You are a business analyst assistant. A user has verbally narrated some
requirements/context. Your job in THIS step is NOT to write the final document -- it is to:
1. Decide which document type best fits: {type_list}.
   {"The user explicitly requested: " + forced_type if forced_type else
    "Infer it from phrases like 'write me a BRD', 'draft a mail', 'create a user story', 'proposal document'. If unclear, pick the closest fit."}
2. Propose a section-by-section layout for that document type, with a short 1-2 line
   draft/summary of what will go in each section, based on what the user said.

Respond ONLY with valid JSON, no markdown fences, no commentary, in this exact shape:
{{
  "doc_type": "<one of: {type_list}>",
  "sections": [
    {{"heading": "<section name>", "draft": "<1-3 sentence draft content for this section based on the transcript>"}}
  ],
  "clarifying_note": "<optional: one short sentence flagging any info that seems missing, or empty string>"
}}"""
    user_prompt = f"Transcript:\n\"\"\"\n{transcript}\n\"\"\""
    try:
        raw = call_llm(system_prompt, user_prompt, temperature=0.3)
        parsed = _safe_json_parse(raw)
    except LLMError as e:
        return jsonify({"error": str(e)}), 502

    if not parsed or "sections" not in parsed:
        return jsonify({"error": "Could not parse a valid layout from the model response", "raw": raw}), 502

    if parsed.get("doc_type") not in valid_doc_types:
        parsed["doc_type"] = forced_type or "BRD"
    parsed["sections"] = [
        {
            "heading": str(section.get("heading", "")).strip() or "Content",
            "draft": str(section.get("draft", "")).strip(),
        }
        for section in parsed.get("sections", [])
        if isinstance(section, dict)
    ]
    parsed.setdefault("clarifying_note", "")

    return jsonify(parsed)


@docgen_bp.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True)
    transcript = (data.get("transcript") or "").strip()
    doc_type = data.get("doc_type")
    sections = data.get("sections") or []

    if not transcript or not doc_type or not sections:
        return jsonify({"error": "Missing transcript, doc_type, or sections"}), 400

    layout_str = "\n".join(f"- {s['heading']}: {s.get('draft', '')}" for s in sections)
    system_prompt = f"Write a complete {doc_type} using layout:\n{layout_str}"
    user_prompt = f"Original transcript:\n{transcript}"
    try:
        document_text = call_llm(system_prompt, user_prompt, temperature=0.4, max_tokens=2000)
    except LLMError as e:
        return jsonify({"error": str(e)}), 502

    return jsonify({"document_text": document_text, "doc_type": doc_type})


@docgen_bp.route("/api/download", methods=["POST"])
def download():
    data = request.get_json(force=True)
    doc_type = data.get("doc_type", "Document")
    document_text = data.get("document_text", "")
    if not document_text:
        return jsonify({"error": "No document text supplied"}), 400
    path = build_docx(doc_type, document_text)
    filename = f"{doc_type.replace(' ', '_')}.docx"
    return send_file(path, as_attachment=True, download_name=filename)


def _safe_json_parse(raw: str):
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            try:
                return json.loads(raw[start:end + 1])
            except json.JSONDecodeError:
                return None
        return None
