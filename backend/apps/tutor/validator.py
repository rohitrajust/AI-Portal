import re

INJECTION_PATTERNS = [
    r"ignore previous instructions",
    r"ignore all instructions",
    r"forget your instructions",
    r"system prompt",
    r"reveal your prompt",
    r"show your prompt",
    r"developer message",
    r"act as",
    r"jailbreak",
    r"bypass",
]

ALLOWED_PHASES = {"eliciting", "correcting", "reinforcing", "mastered"}
ALLOWED_DIFFICULTIES = {"beginner", "intermediate", "advanced", ""}


def validate_input(user_input):
    """Validate user input before sending to LLM."""
    if not user_input or len(user_input.strip()) == 0:
        return False, "Message cannot be empty."
    if len(user_input) > 3000:
        return False, "Message is too long."
    
    lower = user_input.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lower):
            return False, "Unsafe prompt detected."
    return True, ""


def validate_metadata(meta):
    """Validate metadata structure."""
    required = ["topic", "phase", "mastery", "difficulty", "confidence", "needs_clarification", "user_said", "correction", "learning_goal", "next_skill"]
    for field in required:
        if field not in meta:
            return False
    return True


def validate_output(answer, meta):
    """Validate LLM output."""
    if not answer or len(answer.strip()) < 10:
        return False, "Response too short."
    if not validate_metadata(meta):
        return False, "Metadata validation failed."
    
    score, penalties = schema_consistency_score(meta)
    if score < 50:
        return False, {"confidence": 0, "precision": 0, "recall": 0, "accuracy": 0}
    
    return True, {
        "confidence": int(meta.get("confidence", 0)),
        "precision": int(meta.get("precision", 0)),
        "recall": int(meta.get("recall", 0)),
        "accuracy": int(meta.get("accuracy", 0))
    }


def schema_consistency_score(meta):
    """Consistency checks on metadata."""
    score = 100
    penalties = []

    if meta.get("phase") not in ALLOWED_PHASES:
        score -= 25
        penalties.append("phase invalid")
    if meta.get("difficulty") not in ALLOWED_DIFFICULTIES:
        score -= 10
        penalties.append("difficulty invalid")
    
    try:
        mastery = int(meta.get("mastery", 0))
        if not (0 <= mastery <= 100):
            score -= 10
    except (TypeError, ValueError):
        score -= 15

    return max(0, min(score, 100)), penalties


def safe_metadata():
    """Return safe default metadata."""
    return {
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
