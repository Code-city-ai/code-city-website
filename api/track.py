"""Vercel Python endpoint for privacy-conscious first-party marketing events."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from typing import Any

from api._tracking import (
    TrackingError,
    hash_client_address,
    is_obvious_bot,
    record_event,
    validate_origin,
    validate_payload,
)


class handler(BaseHTTPRequestHandler):
    server_version = "CodeCityTracking/1.0"

    def _write_json(self, status: int, body: dict[str, Any], origin: str) -> None:
        encoded = json.dumps(body, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Access-Control-Allow-Origin", origin or "https://codecity.ai")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(encoded)

    def do_OPTIONS(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        try:
            origin = validate_origin(self.headers.get("Origin"))
        except TrackingError as error:
            self._write_json(error.status, {"error": error.message}, "")
            return
        self._write_json(204, {}, origin)

    def do_POST(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        origin = ""
        try:
            origin = validate_origin(self.headers.get("Origin"))
            content_length = int(self.headers.get("Content-Length", "0"))
            if content_length < 2 or content_length > 12_000:
                raise TrackingError("invalid_size", "Request size is invalid.", 413)

            raw_body = self.rfile.read(content_length)
            try:
                payload = json.loads(raw_body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise TrackingError("invalid_json", "Valid JSON is required.") from exc

            if is_obvious_bot(self.headers.get("User-Agent")):
                self._write_json(202, {"accepted": False}, origin)
                return

            validated = validate_payload(payload)
            vercel_forwarded = (self.headers.get("X-Vercel-Forwarded-For") or "").split(",", 1)[0].strip()
            real_ip = (self.headers.get("X-Real-IP") or "").strip()
            forwarded_chain = [part.strip() for part in (self.headers.get("X-Forwarded-For") or "").split(",") if part.strip()]
            client_address = vercel_forwarded or real_ip or (forwarded_chain[-1] if forwarded_chain else "unknown")
            validated["p_ip_hash"] = hash_client_address(client_address)
            accepted = record_event(validated)
            self._write_json(202, {"accepted": accepted}, origin)
        except TrackingError as error:
            self._write_json(error.status, {"error": error.message, "code": error.code}, origin)
        except Exception:
            self._write_json(500, {"error": "Tracking request failed."}, origin)

    def log_message(self, format: str, *args: Any) -> None:
        return
