import json
import requests
from flask import current_app


class LLMError(Exception):
    pass


# Each provider declares its own endpoint, default model, credential names, the
# per-provider model override to consult, and its TLS settings. Keeping all of it
# in the table avoids the if/elif chains that previously had to be edited in two
# places whenever a provider was added.
DEFAULT_PROVIDERS = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1/chat/completions",
        "model": "openai/gpt-oss-120b",
        "env_keys": ["DOCGEN_GROQ_API_KEY"],
        "model_key": "DOCGEN_GROQ_MODEL",
        "tls": ("GROQ_CA_BUNDLE", "GROQ_TLS_VERIFY"),
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1/chat/completions",
        "model": "meta/llama-3.1-70b-instruct",
        "env_keys": ["DOCGEN_NVIDIA_API_KEY"],
        "model_key": "DOCGEN_NVIDIA_MODEL",
        "tls": ("NVIDIA_CA_BUNDLE", "NVIDIA_TLS_VERIFY"),
    },
    "huggingface": {
        "base_url": "https://router.huggingface.co/v1/chat/completions",
        "model": "openai/gpt-oss-120b:fastest",
        "env_keys": ["DOCGEN_HF_API_KEY", "DOCGEN_HF_TOKEN", "DOCGEN_HUGGINGFACE_API_KEY"],
        "model_key": "DOCGEN_HF_MODEL",
        "tls": ("DOCGEN_HF_CA_BUNDLE", "DOCGEN_HF_TLS_VERIFY"),
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1/chat/completions",
        "model": "openai/gpt-oss-20b:free",
        "env_keys": ["DOCGEN_OPENROUTER_API_KEY"],
        "model_key": "DOCGEN_OPENROUTER_MODEL",
        "tls": ("DOCGEN_OPENROUTER_CA_BUNDLE", "DOCGEN_OPENROUTER_TLS_VERIFY"),
    },
}


def _resolve_model(cfg):
    """Pick the model id, preferring the provider-scoped override.

    `DOCGEN_LLM_MODEL` is provider-agnostic, so a value left over from a previous
    provider would otherwise be sent to the new one and rejected. The per-provider
    name wins to make switching providers safe.
    """
    return (
        current_app.config.get(cfg["model_key"])
        or current_app.config.get("DOCGEN_LLM_MODEL")
        or cfg["model"]
    )


def _resolve_verify(cfg):
    """A CA bundle path if one is configured, else the boolean verify flag."""
    ca_bundle_key, verify_key = cfg["tls"]
    return current_app.config.get(ca_bundle_key) or current_app.config.get(verify_key, True)


def _extract_content(resp):
    """Pull the message text out of an OpenAI-compatible response.

    OpenRouter can answer HTTP 200 with an `error` object and no `choices`, so that
    case is checked first to surface the real message instead of a KeyError.
    """
    try:
        data = resp.json()
    except ValueError as e:
        raise LLMError(f"Provider returned non-JSON response: {resp.text[:300]}") from e

    error = data.get("error")
    if error:
        message = error.get("message") if isinstance(error, dict) else str(error)
        raise LLMError(f"LLM API error: {message}")

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as e:
        raise LLMError(f"Unexpected response shape: {e}") from e


def call_llm(system_prompt: str, user_prompt: str, temperature: float = 0.3, max_tokens: int = 1200) -> str:
    provider = (current_app.config.get("DOCGEN_LLM_PROVIDER") if current_app else None) or "groq"
    provider = provider.lower().strip()

    cfg = DEFAULT_PROVIDERS.get(provider)
    if cfg is None:
        # Previously this fell back to Groq, which then failed with a confusing
        # "missing key for provider groq" naming a provider nobody selected.
        raise LLMError(
            f"Unknown DOCGEN_LLM_PROVIDER {provider!r}. "
            f"Expected one of: {', '.join(sorted(DEFAULT_PROVIDERS))}."
        )

    base_url = current_app.config.get("DOCGEN_LLM_BASE_URL") or cfg["base_url"]
    model = _resolve_model(cfg)

    api_key = None
    for k in cfg["env_keys"]:
        api_key = current_app.config.get(k) or api_key

    if not api_key:
        raise LLMError(f"Missing API key for provider {provider}: expected one of {cfg['env_keys']}")

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    if provider == "openrouter":
        # Optional; used only for attribution on openrouter.ai rankings.
        referer = current_app.config.get("DOCGEN_OPENROUTER_REFERER")
        title = current_app.config.get("DOCGEN_OPENROUTER_TITLE")
        if referer:
            headers["HTTP-Referer"] = referer
        if title:
            headers["X-Title"] = title

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        resp = requests.post(
            base_url,
            headers=headers,
            json=payload,
            timeout=current_app.config.get("DOCGEN_LLM_TIMEOUT", 180),
            verify=_resolve_verify(cfg),
        )
    except requests.exceptions.SSLError as e:
        # Behind a TLS-intercepting proxy, point DOCGEN_<PROVIDER>_CA_BUNDLE at the
        # corporate root CA. Raised as LLMError so the route returns JSON rather than
        # letting the exception escape as an HTML 500 the frontend cannot parse.
        raise LLMError(
            f"TLS verification failed for {provider}. Set the provider's CA bundle "
            f"(e.g. DOCGEN_OPENROUTER_CA_BUNDLE) to your corporate root CA. Detail: {e}"
        ) from e
    except requests.exceptions.RequestException as e:
        raise LLMError(
            f"Could not reach {provider} at {base_url}: {e}. "
            f"If this is a read timeout, raise DOCGEN_LLM_TIMEOUT or pick a faster model."
        ) from e

    if resp.status_code != 200:
        raise LLMError(f"LLM API error {resp.status_code}: {resp.text[:500]}")

    return _extract_content(resp)
