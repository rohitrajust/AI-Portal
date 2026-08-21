import io
import uuid
from typing import Any, Dict, Optional
from flask import current_app, request, jsonify
from PIL import Image

from . import whiteboard_bp

# Import processor from services (copied below). We'll lazily instantiate it so
# we can access Flask app config at runtime.
from .services.whiteboard_processor import WhiteboardProcessor

_processor: Optional[WhiteboardProcessor] = None


def get_processor() -> WhiteboardProcessor:
    global _processor
    if _processor is None:
        _processor = WhiteboardProcessor()
    return _processor


uploaded_images: Dict[str, Dict[str, Any]] = {}


@whiteboard_bp.route("/upload", methods=["POST"])
def upload_image():
    file = request.files.get("file") or request.files.get("image")
    if not file:
        return jsonify({"success": False, "error": "File must be provided"}), 400

    content_type = file.content_type or "image/png"
    image_data = file.read()
    if len(image_data) > current_app.config.get("WHITEBOARD_MAX_UPLOAD_SIZE", 10 * 1024 * 1024):
        return jsonify({"error": "File size exceeds maximum limit"}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in current_app.config.get("WHITEBOARD_ALLOWED_EXTENSIONS", ["jpg", "jpeg", "png", "webp", "bmp"]):
        return jsonify({"error": "Invalid file extension"}), 400

    width, height = 800, 600
    try:
        with Image.open(io.BytesIO(image_data)) as img:
            width, height = img.width, img.height
    except Exception:
        pass

    image_id = str(uuid.uuid4())
    uploaded_images[image_id] = {
        "data": image_data,
        "filename": file.filename or f"{image_id}.png",
        "content_type": content_type,
        "size": len(image_data),
        "width": width,
        "height": height,
    }

    return jsonify({"success": True, "image_id": image_id, "width": width, "height": height})


@whiteboard_bp.route("/process", methods=["POST"])
def process_whiteboard():
    data = request.get_json(force=True)
    image_id = data.get("image_id")
    if image_id not in uploaded_images:
        return jsonify({"error": "Uploaded image ID not found"}), 404

    image_info = uploaded_images[image_id]
    try:
        processor = get_processor()
        # processor.process_image is async in original; run in event loop
        import asyncio

        processed = asyncio.run(
            processor.process_image(
                image_data=image_info["data"],
                filename=image_info["filename"],
                content_type=image_info["content_type"],
            )
        )

        return jsonify({
            "success": True,
            "whiteboard_id": image_id,
            "mermaid_code": getattr(processed, "mermaid_code", None),
            "canvas_json": getattr(processed, "canvas_json", None),
            "svg": getattr(processed, "svg", None),
        })
    except Exception as e:
        return jsonify({"success": False, "whiteboard_id": image_id, "error": str(e)}), 500


@whiteboard_bp.route("/process-direct", methods=["POST"])
def process_whiteboard_direct():
    file = request.files.get("file") or request.files.get("image")
    if not file:
        return jsonify({"error": "File required"}), 400
    image_data = file.read()
    try:
        processor = get_processor()
        import asyncio

        processed = asyncio.run(
            processor.process_image(
                image_data=image_data,
                filename=file.filename or "whiteboard.png",
                content_type=file.content_type or "image/png",
            )
        )

        return jsonify({
            "success": True,
            "whiteboard_id": str(uuid.uuid4()),
            "mermaid_code": getattr(processed, "mermaid_code", None),
            "canvas_json": getattr(processed, "canvas_json", None),
            "svg": getattr(processed, "svg", None),
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@whiteboard_bp.route("/health")
def health_check():
    return jsonify({"status": "healthy", "service": "AI Whiteboard Cam"})


@whiteboard_bp.route("/image/<image_id>")
def get_image_info(image_id: str):
    if image_id not in uploaded_images:
        return jsonify({"error": "Image not found"}), 404
    info = uploaded_images[image_id]
    return jsonify({
        "image_id": image_id,
        "filename": info["filename"],
        "content_type": info["content_type"],
        "size": info["size"],
        "width": info.get("width"),
        "height": info.get("height"),
    })


@whiteboard_bp.route("/image/<image_id>", methods=["DELETE"])
def delete_image(image_id: str):
    if image_id not in uploaded_images:
        return jsonify({"error": "Image not found"}), 404
    del uploaded_images[image_id]
    return jsonify({"success": True})
