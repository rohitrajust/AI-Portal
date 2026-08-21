from typing import Optional
from flask import current_app

try:
    import deepl
except ImportError:
    deepl = None


def translate_to_english(japanese_text: str) -> Optional[str]:
    """Translate Japanese text to English using DeepL API."""
    if not deepl:
        print("[WARNING] deepl library not installed")
        return None
    
    try:
        api_key = current_app.config.get("TRANSLATOR_DEEPL_API_KEY") if hasattr(current_app, 'config') else None
        if not api_key:
            print("[DeepL ERROR] TRANSLATOR_DEEPL_API_KEY not set")
            return None
        
        client = deepl.Translator(api_key, verify_ssl=False)
        result = client.translate_text(
            japanese_text,
            source_lang="JA",
            target_lang="EN-US",
        )
        return result.text
    except Exception as exc:
        print("[DeepL ERROR] Translation failed:", exc)
        return None
