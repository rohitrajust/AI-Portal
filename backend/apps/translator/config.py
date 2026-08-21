import os
from flask import current_app
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_KEY = current_app.config.get("DEEPGRAM_API_KEY") if hasattr(current_app, 'config') else os.getenv("DEEPGRAM_API_KEY", "")
DEEPL_API_KEY = current_app.config.get("DEEPL_API_KEY") if hasattr(current_app, 'config') else os.getenv("DEEPL_API_KEY", "")
DEEPGRAM_MODEL = "nova-2"
SOURCE_LANGUAGE = "ja"
SAMPLE_RATE = 16000
ENDPOINTING_MS = 100
UTTERANCE_END_MS = 1000
TRANSCRIPT_JOINER = " "
MAX_RECONNECT_ATTEMPTS = 5
RECONNECT_DELAY_SECONDS = 2
