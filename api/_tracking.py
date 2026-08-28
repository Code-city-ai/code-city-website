"""Validation and Supabase transport for Code City's first-party tracker."""

from __future__ import annotations

import hashlib
import json
import os
import re
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlparse


EVENT_NAMES = {
    "page_viewed",
    "session_started",
    "session_engaged",
    "cta_clicked",
    "contact_form_started",
    "contact_form_submitted",
    "support_form_started",
    "support_form_submitted",
    "inquiry_submitted",
}

PROPERTY_KEYS = {
    "component",
    "destination",
    "form_type",
    "label",
    "project_type",
}

DEFAULT_ORIGINS = {
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "https://codecity.ai",
    "https://www.codecity.ai",
    "https://code-city-website.vercel.app",
}

BOT_USER_AGENT = re.compile(
    r"(?:bot|crawler|spider|slurp|headlesschrome|facebookexternalhit|preview)",
    re.IGNORECASE,
)


class TrackingError(ValueError):
    """A public-safe validation or configuration error."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def allowed_origins() -> set[str]:
    configured = {
        origin.strip().rstrip("/")
        for origin in os.environ.get("ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    }
    return DEFAULT_ORIGINS | configured


def clean_origin(origin: str | None) -> str:
    return (origin or "").strip().rstrip("/")


def validate_origin(origin: str | None) -> str:
    cleaned = clean_origin(origin)
    if cleaned not in allowed_origins():
        raise TrackingError("origin_not_allowed", "Origin not allowed.", 403)
    return cleaned


def _clean_text(value: Any, field: str, max_length: int, *, required: bool = False) -> str | None:
    if value in (None, ""):
        if required:
            raise TrackingError("invalid_input", f"{field} is required.")
        return None
    if not isinstance(value, str):
        raise TrackingError("invalid_input", f"{field} must be text.")
    cleaned = value.strip()
    if required and not cleaned:
        raise TrackingError("invalid_input", f"{field} is required.")
    if len(cleaned) > max_length:
        raise TrackingError("invalid_input", f"{field} is too long.")
    return cleaned or None


def _clean_uuid(value: Any, field: str) -> str:
    if not isinstance(value, str):
        raise TrackingError("invalid_input", f"{field} is required.")
    try:
        return str(uuid.UUID(value))
    except (ValueError, AttributeError) as exc:
        raise TrackingError("invalid_input", f"{field} is invalid.") from exc


def _parse_timestamp(value: Any, field: str, *, required: bool) -> datetime | None:
    raw = _clean_text(value, field, 50, required=required)
    if raw is None:
        return None
    assert raw is not None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError as exc:
        raise TrackingError("invalid_input", f"{field} is invalid.") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _clean_timestamp(value: Any) -> str:
    parsed = _parse_timestamp(value, "occurredAt", required=True)
    assert parsed is not None
    now = datetime.now(timezone.utc)
    if parsed < now - timedelta(days=1) or parsed > now + timedelta(minutes=5):
        raise TrackingError("invalid_input", "occurredAt is outside the accepted window.")
    return parsed.isoformat().replace("+00:00", "Z")


def _clean_session_timestamp(value: Any, field: str, occurred_at: str) -> str | None:
    parsed = _parse_timestamp(value, field, required=False)
    if parsed is None:
        return None
    occurred = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
    if parsed < occurred - timedelta(days=7) or parsed > occurred + timedelta(minutes=5):
        raise TrackingError("invalid_input", f"{field} is outside the accepted session window.")
    return parsed.isoformat().replace("+00:00", "Z")


def _clean_properties(value: Any) -> dict[str, str | int | float | bool]:
    if value in (None, ""):
        return {}
    if not isinstance(value, dict):
        raise TrackingError("invalid_input", "properties must be an object.")

    cleaned: dict[str, str | int | float | bool] = {}
    for key, item in value.items():
        if key not in PROPERTY_KEYS or isinstance(item, (dict, list)) or item is None:
            continue
        if isinstance(item, str):
            cleaned[key] = item.strip()[:200]
        elif isinstance(item, (bool, int, float)):
            cleaned[key] = item

    if len(json.dumps(cleaned, separators=(",", ":")).encode("utf-8")) > 4096:
        raise TrackingError("invalid_input", "properties are too large.")
    return cleaned


def _clean_referrer(value: Any) -> str | None:
    referrer = _clean_text(value, "referrer", 1000)
    if not referrer:
        return None
    parsed = urlparse(referrer)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise TrackingError("invalid_input", "referrer is invalid.")
    return parsed._replace(params="", query="", fragment="").geturl()


def is_obvious_bot(user_agent: str | None) -> bool:
    """Exclude obvious automated traffic from product-demand reporting."""

    return bool(BOT_USER_AGENT.search(user_agent or ""))


def validate_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise TrackingError("invalid_input", "A JSON object is required.")

    event_name = _clean_text(payload.get("eventName"), "eventName", 80, required=True)
    if event_name not in EVENT_NAMES:
        raise TrackingError("invalid_input", "eventName is not supported.")

    path = _clean_text(payload.get("path"), "path", 500)
    if path and not path.startswith("/"):
        raise TrackingError("invalid_input", "path must be site-relative.")

    referrer = _clean_referrer(payload.get("referrer"))

    device_type = _clean_text(payload.get("deviceType"), "deviceType", 16) or "unknown"
    if device_type not in {"desktop", "mobile", "tablet", "bot", "unknown"}:
        device_type = "unknown"

    attribution = {
        "p_utm_source": _clean_text(payload.get("utmSource"), "utmSource", 120),
        "p_utm_medium": _clean_text(payload.get("utmMedium"), "utmMedium", 120),
        "p_utm_campaign": _clean_text(payload.get("utmCampaign"), "utmCampaign", 190),
        "p_utm_content": _clean_text(payload.get("utmContent"), "utmContent", 190),
        "p_utm_term": _clean_text(payload.get("utmTerm"), "utmTerm", 190),
        "p_gclid": _clean_text(payload.get("gclid"), "gclid", 255),
        "p_fbclid": _clean_text(payload.get("fbclid"), "fbclid", 255),
        "p_msclkid": _clean_text(payload.get("msclkid"), "msclkid", 255),
        "p_ttclid": _clean_text(payload.get("ttclid"), "ttclid", 255),
        "p_campaign_external_id": _clean_text(payload.get("campaignExternalId"), "campaignExternalId", 255),
        "p_adset_external_id": _clean_text(payload.get("adsetExternalId"), "adsetExternalId", 255),
        "p_ad_external_id": _clean_text(payload.get("adExternalId"), "adExternalId", 255),
    }
    attribution_present_value = payload.get("attributionPresent")
    if attribution_present_value is not None and not isinstance(attribution_present_value, bool):
        raise TrackingError("invalid_input", "attributionPresent must be true or false.")
    attribution_present = bool(attribution_present_value) or any(value for value in attribution.values())

    touch_occurred_value = payload.get("attributionTouchOccurred")
    if touch_occurred_value is not None and not isinstance(touch_occurred_value, bool):
        raise TrackingError("invalid_input", "attributionTouchOccurred must be true or false.")
    touch_occurred = attribution_present if touch_occurred_value is None else touch_occurred_value

    occurred_at = _clean_timestamp(payload.get("occurredAt"))
    session_started_at = _clean_session_timestamp(payload.get("sessionStartedAt"), "sessionStartedAt", occurred_at) or occurred_at
    attribution_captured_at = _clean_session_timestamp(
        payload.get("attributionCapturedAt"),
        "attributionCapturedAt",
        occurred_at,
    )
    if attribution_present and attribution_captured_at is None:
        # Compatibility for a short-lived cached v1 browser bundle. New clients
        # always send the original session touch time.
        attribution_captured_at = occurred_at
    if attribution_captured_at is not None:
        captured = datetime.fromisoformat(attribution_captured_at.replace("Z", "+00:00"))
        started = datetime.fromisoformat(session_started_at.replace("Z", "+00:00"))
        if captured < started - timedelta(minutes=5):
            raise TrackingError("invalid_input", "attributionCapturedAt predates the session.")
    if touch_occurred and not attribution_present:
        raise TrackingError("invalid_input", "A new attribution touch requires attribution context.")

    return {
        "p_event_id": _clean_uuid(payload.get("eventId"), "eventId"),
        "p_visitor_key": _clean_uuid(payload.get("visitorId"), "visitorId"),
        "p_session_key": _clean_uuid(payload.get("sessionId"), "sessionId"),
        "p_session_started_at": session_started_at,
        "p_event_name": event_name,
        "p_occurred_at": occurred_at,
        "p_path": path,
        "p_referrer": referrer,
        **attribution,
        "p_attribution_present": attribution_present,
        "p_touch_occurred": touch_occurred,
        "p_attribution_captured_at": attribution_captured_at,
        "p_device_type": device_type,
        "p_properties": _clean_properties(payload.get("properties")),
    }


def hash_client_address(address: str) -> str:
    salt = os.environ.get("TRACKING_HASH_SALT", "")
    if len(salt) < 16:
        raise TrackingError(
            "tracking_not_configured",
            "First-party tracking is not configured.",
            503,
        )
    return hashlib.sha256(f"{salt}:{address or 'unknown'}".encode("utf-8")).hexdigest()


def _supabase_server_headers(api_key: str) -> dict[str, str]:
    headers = {
        "apikey": api_key,
        "Content-Type": "application/json",
        "User-Agent": "code-city-tracker/1.0",
    }
    # New sb_secret keys authenticate through `apikey` and are not JWTs. The
    # legacy service-role key remains a JWT and still uses Authorization while
    # the project completes its key migration.
    if not api_key.startswith("sb_secret_"):
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def record_event(payload: dict[str, Any]) -> bool:
    supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not supabase_url or not service_role_key:
        raise TrackingError(
            "tracking_not_configured",
            "First-party tracking is not configured.",
            503,
        )

    request = urllib.request.Request(
        f"{supabase_url}/rest/v1/rpc/record_marketing_event_v2",
        data=json.dumps(payload, separators=(",", ":")).encode("utf-8"),
        headers=_supabase_server_headers(service_role_key),
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            body = response.read().decode("utf-8")
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
        raise TrackingError(
            "tracking_unavailable",
            "First-party tracking is temporarily unavailable.",
            503,
        ) from exc

    return json.loads(body or "false") is True
