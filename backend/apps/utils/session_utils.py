from flask import session


def ns_key(app_name: str, key: str) -> str:
    return f"{app_name}_{key}"


def get_ns(session_key: str, default=None):
    return session.get(session_key, default)


def set_ns(session_key: str, value):
    session[session_key] = value


def get_for_app(app_name: str, key: str, default=None):
    return get_ns(ns_key(app_name, key), default)


def set_for_app(app_name: str, key: str, value):
    set_ns(ns_key(app_name, key), value)
