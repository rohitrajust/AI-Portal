import requests
from flask import current_app


def call_groq(prompt, system_prompt):
    """Model A - via Groq (OpenAI-compatible chat completions)"""
    api_key = current_app.config.get("ARENA_GROQ_API_KEY")
    if not api_key:
        raise ValueError("ARENA_GROQ_API_KEY not set in config")
    
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": current_app.config["ARENA_GROQ_MODEL"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "max_tokens": 300,
    }
    url = current_app.config["GROQ_BASE_URL"].rstrip("/") + "/chat/completions"
    verify = current_app.config["GROQ_CA_BUNDLE"] or current_app.config["GROQ_TLS_VERIFY"]
    resp = requests.post(url, headers=headers, json=payload, timeout=30, verify=verify)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def call_nvidia(prompt, system_prompt):
    """Model B - via Nvidia NIM (OpenAI-compatible chat completions)"""
    api_key = current_app.config.get("ARENA_NVIDIA_API_KEY")
    if not api_key:
        raise ValueError("ARENA_NVIDIA_API_KEY not set in config")
    
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {
        "model": current_app.config["ARENA_NVIDIA_MODEL"],
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
        "top_p": 0.7,
        "max_tokens": 300,
        "stream": False,
    }
    url = current_app.config["NVIDIA_BASE_URL"].rstrip("/") + "/chat/completions"
    verify = current_app.config["NVIDIA_CA_BUNDLE"] or current_app.config["NVIDIA_TLS_VERIFY"]
    resp = requests.post(url, headers=headers, json=payload, timeout=60, verify=verify)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def judge_debate(topic, transcript):
    """Uses Groq to act as a neutral judge and declare a winner with reasoning."""
    debate_text = "\n\n".join(f"{turn['speaker']}: {turn['text']}" for turn in transcript)

    system_prompt = (
        "You are a neutral, impartial debate judge. Evaluate based on logic, evidence, persuasiveness, and response quality. "
        "Do not favor either model by name."
    )
    user_prompt = (
        f"Topic: {topic}\n\nDebate transcript:\n{debate_text}\n\n"
        "Give your verdict:\nWinner: [Model A or Model B or Tie]\nReasoning: [2-3 sentences]"
    )

    return call_groq(user_prompt, system_prompt)


def run_debate(topic, rounds=5):
    """Model A's reply becomes Model B's prompt, and vice versa, for `rounds` turns."""
    system_a = f"You are Debater A debating: '{topic}'. Respond in 3-4 sentences, be persuasive, engage directly."
    system_b = f"You are Debater B debating: '{topic}'. Take a contrasting stance. Respond in 3-4 sentences, engage directly."

    transcript = []
    current_message = f"Give your opening statement on: '{topic}'."
    speaker = "A"

    for i in range(rounds * 2):
        if speaker == "A":
            reply = call_groq(current_message, system_a)
            transcript.append({"speaker": "Model A (Groq)", "text": reply})
            current_message = reply
            speaker = "B"
        else:
            reply = call_nvidia(current_message, system_b)
            transcript.append({"speaker": "Model B (Nvidia)", "text": reply})
            current_message = reply
            speaker = "A"
    return transcript
