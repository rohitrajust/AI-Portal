import os
from pathlib import Path
from dotenv import load_dotenv

# Secrets for the consolidated server live alongside this application.
PROJECT_ROOT = Path(__file__).resolve().parent
LOCAL_ENV_PATH = PROJECT_ROOT / ".env"

# `override=False` means explicitly supplied operating-system variables always
# win.
load_dotenv(LOCAL_ENV_PATH, override=False)


def _env(*names, default=None):
    """Return the first non-empty environment variable from `names`.

    Service-scoped names are always checked before legacy shared names.  This
    permits each migrated application to keep a separate provider credential
    while retaining compatibility with an earlier consolidated `.env`.
    """
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def _bool_env(name, default=True):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


class Config:
    ENV_FILE = str(LOCAL_ENV_PATH)
    # Flask core
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "change-me-in-production")
    JSON_SORT_KEYS = False
    SESSION_COOKIE_SECURE = False  # Set True in production with HTTPS
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = 86400 * 7  # 7 days

    # Legacy shared provider names, retained only as fallbacks for an older
    # local .env. New deployments should use the service-scoped names below.
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

    # Service-scoped credentials. They may intentionally hold different keys
    # for the same provider because they originate from separate applications.
    ARENA_GROQ_API_KEY = _env("ARENA_GROQ_API_KEY", "GROQ_API_KEY")
    ARENA_NVIDIA_API_KEY = _env("ARENA_NVIDIA_API_KEY", "NVIDIA_API_KEY")
    TUTOR_GROQ_API_KEY = _env("TUTOR_GROQ_API_KEY", "GROQ_API_KEY")
    UIDESIGN_GROQ_API_KEY = _env("UIDESIGN_GROQ_API_KEY", "GROQ_API_KEY")
    UIDESIGN_NVIDIA_API_KEY = _env("UIDESIGN_NVIDIA_API_KEY", "NVIDIA_API_KEY")
    DOCGEN_GROQ_API_KEY = _env("DOCGEN_GROQ_API_KEY", "GROQ_API_KEY")
    DOCGEN_NVIDIA_API_KEY = _env("DOCGEN_NVIDIA_API_KEY", "NVIDIA_API_KEY")
    DOCGEN_HF_API_KEY = _env("DOCGEN_HF_API_KEY", "HF_API_KEY")
    DOCGEN_HF_TOKEN = _env("DOCGEN_HF_TOKEN", "HF_TOKEN")
    DOCGEN_HUGGINGFACE_API_KEY = _env("DOCGEN_HUGGINGFACE_API_KEY", "HUGGINGFACE_API_KEY")
    DOCGEN_OPENROUTER_API_KEY = _env("DOCGEN_OPENROUTER_API_KEY", "OPENROUTER_API_KEY")
    TRANSLATOR_DEEPGRAM_API_KEY = _env("TRANSLATOR_DEEPGRAM_API_KEY", "DEEPGRAM_API_KEY")
    TRANSLATOR_DEEPL_API_KEY = _env("TRANSLATOR_DEEPL_API_KEY", "DEEPL_API_KEY")
    WHITEBOARD_NVIDIA_API_KEY = _env("WHITEBOARD_NVIDIA_API_KEY", "NVIDIA_API_KEY")

    # Shared provider endpoints
    GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    GROQ_CA_BUNDLE = os.getenv("GROQ_CA_BUNDLE") or None
    GROQ_TLS_VERIFY = _bool_env("GROQ_TLS_VERIFY", default=True)
    NVIDIA_CA_BUNDLE = os.getenv("NVIDIA_CA_BUNDLE") or None
    NVIDIA_TLS_VERIFY = _bool_env("NVIDIA_TLS_VERIFY", default=True)
    DOCGEN_HF_CA_BUNDLE = os.getenv("DOCGEN_HF_CA_BUNDLE") or None
    DOCGEN_HF_TLS_VERIFY = _bool_env("DOCGEN_HF_TLS_VERIFY", default=True)
    DOCGEN_OPENROUTER_CA_BUNDLE = os.getenv("DOCGEN_OPENROUTER_CA_BUNDLE") or None
    DOCGEN_OPENROUTER_TLS_VERIFY = _bool_env("DOCGEN_OPENROUTER_TLS_VERIFY", default=True)
    WHITEBOARD_NVIDIA_BASE_URL = _env("WHITEBOARD_NVIDIA_BASE_URL", "NVIDIA_BASE_URL", default="https://integrate.api.nvidia.com/v1")

    # AI Model Arena: one model from each provider.
    ARENA_GROQ_MODEL = os.getenv("ARENA_GROQ_MODEL", "openai/gpt-oss-20b")
    ARENA_NVIDIA_MODEL = os.getenv("ARENA_NVIDIA_MODEL", "meta/llama-3.1-8b-instruct")

    # AI Tutor: Groq is the current tutor implementation's provider.
    TUTOR_GROQ_MODEL = _env("TUTOR_GROQ_MODEL", "GROQ_MODEL", default="openai/gpt-oss-120b")

    # Voice Document Generator. Legacy LLM_* names are retained as fallbacks
    # so an existing local .env continues to work after this update.
    DOCGEN_LLM_PROVIDER = os.getenv("DOCGEN_LLM_PROVIDER", os.getenv("LLM_PROVIDER", "groq"))
    DOCGEN_LLM_BASE_URL = os.getenv("DOCGEN_LLM_BASE_URL", os.getenv("LLM_BASE_URL", None))
    # Legacy provider-agnostic model override. It cannot be correct for more than one
    # provider at a time, so the per-provider names below take precedence. Prefer those.
    DOCGEN_LLM_MODEL = os.getenv("DOCGEN_LLM_MODEL", os.getenv("LLM_MODEL", None))

    # Per-provider model overrides for the document generator. Setting the one that
    # matches DOCGEN_LLM_PROVIDER means switching providers can never send a model id
    # belonging to a different provider.
    DOCGEN_GROQ_MODEL = os.getenv("DOCGEN_GROQ_MODEL") or None
    DOCGEN_NVIDIA_MODEL = os.getenv("DOCGEN_NVIDIA_MODEL") or None
    DOCGEN_HF_MODEL = os.getenv("DOCGEN_HF_MODEL") or None
    DOCGEN_OPENROUTER_MODEL = os.getenv("DOCGEN_OPENROUTER_MODEL") or None

    # Request timeout for the document generator's provider calls. Free-tier models
    # are queued and slow: a 2000-token generation measured ~67s, overrunning the
    # previous hardcoded 60s. Raise this further if you pick an even slower model.
    DOCGEN_LLM_TIMEOUT = int(os.getenv("DOCGEN_LLM_TIMEOUT", "180"))

    # Optional OpenRouter attribution headers. They only affect openrouter.ai
    # rankings and are omitted from the request when unset.
    DOCGEN_OPENROUTER_REFERER = os.getenv("DOCGEN_OPENROUTER_REFERER") or None
    DOCGEN_OPENROUTER_TITLE = os.getenv("DOCGEN_OPENROUTER_TITLE") or None

    # UI Sketch-to-Design: NVIDIA analyzes the image; Groq builds/generates UI.
    UIDESIGN_NVIDIA_VISION_MODEL = os.getenv("UIDESIGN_NVIDIA_VISION_MODEL", "meta/llama-3.2-11b-vision-instruct")
    UIDESIGN_GROQ_PROMPT_MODEL = os.getenv("UIDESIGN_GROQ_PROMPT_MODEL", "qwen/qwen3.6-27b")
    UIDESIGN_GROQ_GENERATOR_MODEL = os.getenv("UIDESIGN_GROQ_GENERATOR_MODEL", "openai/gpt-oss-120b")
    WHITEBOARD_NVIDIA_MODEL = _env("WHITEBOARD_NVIDIA_MODEL", "NVIDIA_MODEL")

    # Whiteboard specific
    WHITEBOARD_YOLO_MODEL_PATH = os.getenv("WHITEBOARD_YOLO_MODEL_PATH", "yolov8n.pt")
    WHITEBOARD_MAX_UPLOAD_SIZE = int(os.getenv("WHITEBOARD_MAX_UPLOAD_SIZE", 10 * 1024 * 1024))
    WHITEBOARD_ALLOWED_EXTENSIONS = os.getenv("WHITEBOARD_ALLOWED_EXTENSIONS", "jpg,jpeg,png,webp,bmp").split(",")

