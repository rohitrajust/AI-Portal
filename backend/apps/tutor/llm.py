import os
import re
import json
import requests
import urllib3
from flask import current_app
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# System prompt for Socratic tutoring
SYSTEM_PROMPT = """You are an expert Socratic tutor helping a learner understand topics through guided discovery.

Your role is to:
1. Ask clarifying questions to understand what the learner already knows
2. Guide them to correct understanding through questions, not direct answers
3. Provide hints and scaffolding when they're stuck
4. Celebrate progress and build confidence

Keep responses concise (2-3 sentences) and focused on one concept at a time.

After your visible response, add a JSON metadata block in markdown code fence:
```meta
{
  "topic": "what concept is being discussed",
  "phase": "eliciting|correcting|reinforcing|mastered",
  "mastery": 0-100,
  "confidence": 0-100,
  "precision": 0-100,
  "recall": 0-100,
  "accuracy": 0-100,
  "difficulty": "beginner|intermediate|advanced|",
  "needs_clarification": false,
  "user_said": "what the student actually said or misunderstood",
  "correction": "what needs correction if any",
  "learning_goal": "what skill we're building",
  "next_skill": "what skill comes next"
}
```
"""


def build_messages(history):
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history
    ]


def split_reply(raw_text):
    meta = {
        "topic": "",
        "phase": "eliciting",
        "mastery": 0,
        "difficulty": "",
        "confidence": 0,
        "precision": 0,
        "recall": 0,
        "accuracy": 0,
        "needs_clarification": False,
        "user_said": "",
        "correction": "",
        "learning_goal": "",
        "next_skill": ""
    }

    visible = raw_text
    meta_re = re.compile(r"```meta\s*(\{.*?\})\s*```", re.DOTALL)
    match = meta_re.search(raw_text)

    if match:
        visible = raw_text[:match.start()].strip()
        try:
            parsed = json.loads(match.group(1))
            meta.update(parsed)
        except Exception:
            pass

    return visible, meta


def call_groq(messages):
    api_key = current_app.config.get("TUTOR_GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("TUTOR_GROQ_API_KEY not set in config")

    response = requests.post(
        current_app.config["GROQ_BASE_URL"].rstrip("/") + "/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": current_app.config["TUTOR_GROQ_MODEL"],
            "messages": messages,
            "temperature": 0.4,
            "max_tokens": 700
        },
        timeout=60,
        verify=current_app.config["GROQ_CA_BUNDLE"] or current_app.config["GROQ_TLS_VERIFY"],
    )

    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]


def ask_llm(history, retries=2):
    messages = build_messages(history)
    last_error = None

    for _ in range(retries + 1):
        try:
            raw = call_groq(messages)
            answer, meta = split_reply(raw)
            return answer, meta
        except Exception as e:
            last_error = e

    raise RuntimeError(str(last_error))
