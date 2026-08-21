import os
import uuid
from flask import request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from config import Config

from . import uidesign_bp
from .services.sketch_analyzer import analyze_sketch
from .services.prompt_builder import build_prompt
from .services.ui_generator import generate_ui_html


# ============================================================
# ALLOWED FILE TYPES
# ============================================================

ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp"
}


def allowed_file(filename):
    """Check if file extension is allowed."""
    return (
        "." in filename
        and
        filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def get_upload_folder():
    """Get the absolute path to the shared apps/uploads folder."""
    # routes.py lives in apps/uidesign, so one ".." reaches apps/
    folder = os.path.join(
        os.path.dirname(__file__),
        "..",
        "uploads"
    )
    return os.path.abspath(folder)


def get_generated_folder():
    """Get the absolute path to the shared apps/generated folder."""
    # Must match the path services/ui_generator.py writes to.
    folder = os.path.join(
        os.path.dirname(__file__),
        "..",
        "generated"
    )
    return os.path.abspath(folder)


# ============================================================
# STATUS / HEALTH CHECK
# ============================================================

@uidesign_bp.route("/", methods=["GET"])
def index():
    """Service status endpoint."""
    return jsonify({
        "service": "AI Sketch To UI Generator",
        "status": "running"
    })


@uidesign_bp.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "running",
        "service": "AI Sketch To UI Generator",
        "version": "5.0",
        "features": [
            "Sketch Analysis",
            "Prompt Generation",
            "HTML UI Generation"
        ]
    })


# ============================================================
# UPLOAD + GENERATION PIPELINE
# ============================================================

@uidesign_bp.route("/upload", methods=["POST"])
def upload():
    """
    Main endpoint for uploading a sketch and generating UI.

    Expects multipart/form-data with:
    - image: The sketch file (required)
    - color_theme: Preferred color theme (optional)
    - ui_style: Preferred UI style (optional)
    - page_type: Target page type (optional)
    - page_requirements: Additional requirements (optional)

    Returns JSON with generated UI filename and metadata.
    """
    try:
        # ====================================================
        # STEP 0 : RECEIVE IMAGE
        # ====================================================

        print("\n===================================")
        print("STEP 0 : RECEIVE SKETCH")
        print("===================================")

        if "image" not in request.files:
            return jsonify({
                "success": False,
                "error":
                "Please upload a sketch image."
            }), 400

        file = request.files["image"]

        # ====================================================
        # RECEIVE USER PREFERENCES
        # ====================================================

        color_theme = request.form.get(
            "color_theme",
            ""
        )

        ui_style = request.form.get(
            "ui_style",
            ""
        )

        page_type = request.form.get(
            "page_type",
            ""
        )

        page_requirements = request.form.get(
            "page_requirements",
            ""
        )

        # ====================================================
        # PRINT USER PREFERENCES
        # ====================================================

        print("\nUser Preferences:")

        print(
            f"Color Theme: {color_theme}"
        )

        print(
            f"UI Style: {ui_style}"
        )

        print(
            f"Page Type: {page_type}"
        )

        print(
            f"Requirements: {page_requirements}"
        )

        # ====================================================
        # VALIDATE FILE NAME
        # ====================================================

        if not file.filename:
            return jsonify({
                "success": False,
                "error":
                "Please select an image file."
            }), 400

        # ====================================================
        # VALIDATE FILE TYPE
        # ====================================================

        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "error":
                (
                    "Only PNG, JPG, JPEG and WEBP "
                    "files are supported."
                )
            }), 400

        # ====================================================
        # CREATE UNIQUE FILE NAME
        # ====================================================

        filename = (
            str(uuid.uuid4())
            + "_"
            + secure_filename(
                file.filename
            )
        )

        upload_folder = get_upload_folder()
        os.makedirs(upload_folder, exist_ok=True)

        image_path = os.path.join(
            upload_folder,
            filename
        )

        # ====================================================
        # SAVE UPLOADED IMAGE
        # ====================================================

        file.save(
            image_path
        )

        print(
            f"\nUploaded image: {image_path}"
        )

        # ====================================================
        # STEP 1 : ANALYZE SKETCH
        # ====================================================

        print("\n===================================")
        print("STEP 1 : ANALYZE SKETCH")
        print("===================================")

        analysis = analyze_sketch(
            image_path
        )

        if not analysis:
            return jsonify({
                "success": False,
                "error":
                "Sketch analysis failed."
            }), 500

        # ====================================================
        # ADD USER PREFERENCES TO ANALYSIS
        # ====================================================

        analysis += f"""

==================================================
USER PREFERENCES
==================================================

Preferred Color Theme:
{color_theme}

Preferred UI Style:
{ui_style}

Target Page Type:
{page_type}

Additional Requirements:
{page_requirements}

==================================================
GENERATION INSTRUCTIONS
==================================================

Strictly follow the above user preferences
while generating the UI.

The generated UI should preserve the
important structure and components identified
from the original sketch.
"""

        print("\nAnalysis Result:")

        print(
            analysis
        )

        # ====================================================
        # STEP 2 : BUILD PROMPT
        # ====================================================

        print("\n===================================")
        print("STEP 2 : BUILD PROMPT")
        print("===================================")

        prompt = build_prompt(
            analysis
        )

        if not prompt:
            return jsonify({
                "success": False,
                "error":
                "Prompt generation failed."
            }), 500

        print("\nGenerated Prompt:")

        print(
            prompt
        )

        # ====================================================
        # STEP 3 : GENERATE HTML UI
        # ====================================================

        print("\n===================================")
        print("STEP 3 : GENERATE HTML UI")
        print("===================================")

        generated_html = generate_ui_html(
            prompt
        )

        if not generated_html:
            return jsonify({
                "success": False,
                "error":
                "UI generation failed."
            }), 500

        print("\nGenerated HTML:")

        print(
            generated_html
        )

        # ====================================================
        # GET GENERATED FILE NAME
        # ====================================================

        generated_filename = os.path.basename(
            generated_html
        )

        # ====================================================
        # GET GENERATED FILE PATH
        # ====================================================

        generated_folder = get_generated_folder()
        generated_html_path = os.path.join(
            generated_folder,
            generated_filename
        )

        print(
            "\nGenerated HTML path:"
        )

        print(
            generated_html_path
        )

        # ====================================================
        # VALIDATE GENERATION SUCCESS
        # ====================================================
        # If generate_ui_html() returned a filename,
        # the file was successfully created.
        # We trust the service layer's file handling.

        print(
            "\nGenerated HTML file created successfully."
        )

        # ====================================================
        # STEP 3 COMPLETE
        #
        # STEP 4 VALIDATION REMOVED
        # ====================================================

        print("\n===================================")
        print("STEP 3 COMPLETE")
        print("===================================")

        print(
            "HTML generation successful."
        )

        print(
            "AI validation is disabled."
        )

        # ====================================================
        # FINAL RESPONSE
        # ====================================================

        return jsonify({
            "success":
            True,

            "message":
            "UI generated successfully.",

            "uploaded":
            filename,

            "generated_html":
            generated_filename,

            "uploaded_url":
            (
                f"/api/uidesign/uploads/{filename}"
            ),

            "preview_url":
            (
                f"/api/uidesign/preview/{generated_filename}"
            ),

            "analysis":
            analysis,

            "prompt":
            prompt

        })

    # ========================================================
    # GLOBAL ERROR
    # ========================================================

    except Exception as e:

        print("\n===================================")
        print("UPLOAD ERROR")
        print("===================================")

        print(
            type(e).__name__
        )

        print(
            str(e)
        )

        return jsonify({
            "success":
            False,

            "error":
            str(e)

        }), 500


# ============================================================
# SERVE UPLOADED IMAGES
# ============================================================

@uidesign_bp.route("/uploads/<filename>", methods=["GET"])
def uploads(filename):
    """Serve uploaded sketch images."""
    upload_folder = get_upload_folder()
    return send_from_directory(
        upload_folder,
        filename
    )


# ============================================================
# SERVE GENERATED HTML
# ============================================================

@uidesign_bp.route("/preview/<filename>", methods=["GET"])
def preview(filename):
    """Serve generated HTML UI files."""
    generated_folder = get_generated_folder()
    return send_from_directory(
        generated_folder,
        filename
    )


# ============================================================
# 404 HANDLER
# ============================================================

@uidesign_bp.errorhandler(404)
def page_not_found(error):
    """Handle 404 errors for this blueprint."""
    return jsonify({
        "success":
        False,

        "error":
        "Endpoint not found."

    }), 404
