"""Non-invasive smoke test script (assumes server is running on localhost:5000).

This script performs simple HTTP checks against the consolidated endpoints.
It does not start the server itself.
"""
import requests


def check(path):
    url = f"http://localhost:5000{path}"
    try:
        r = requests.get(url, timeout=5)
        print(path, "->", r.status_code, r.text[:200])
    except Exception as e:
        print(path, "-> error:", e)


if __name__ == "__main__":
    paths = [
        "/api/health",
        "/api/arena/",
        "/api/tutor/",
        "/api/translator/",
        "/api/docgen/",
        "/api/whiteboard/health",
        "/api/uidesign/",
    ]
    for p in paths:
        check(p)
