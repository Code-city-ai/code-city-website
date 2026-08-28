import json
import os
import unittest
import uuid
from datetime import datetime, timezone
from unittest.mock import patch

from api._tracking import TrackingError, hash_client_address, validate_payload


class MarketingTrackingValidationTests(unittest.TestCase):
    def payload(self):
        return {
            "eventId": str(uuid.uuid4()),
            "visitorId": str(uuid.uuid4()),
            "sessionId": str(uuid.uuid4()),
            "eventName": "page_viewed",
            "occurredAt": datetime.now(timezone.utc).isoformat(),
            "path": "/contact",
            "referrer": "https://www.google.com/",
            "utmSource": "google",
            "utmMedium": "cpc",
            "utmCampaign": "code-city-launch",
            "deviceType": "desktop",
            "properties": {"component": "contact-hero", "ignored": "never stored"},
        }

    def test_validates_and_maps_public_payload_to_rpc_shape(self):
        result = validate_payload(self.payload())
        self.assertEqual(result["p_event_name"], "page_viewed")
        self.assertEqual(result["p_path"], "/contact")
        self.assertEqual(result["p_properties"], {"component": "contact-hero"})

    def test_rejects_unknown_events(self):
        payload = self.payload()
        payload["eventName"] = "password_captured"
        with self.assertRaises(TrackingError):
            validate_payload(payload)

    def test_rejects_absolute_paths(self):
        payload = self.payload()
        payload["path"] = "https://attacker.example/collect"
        with self.assertRaises(TrackingError):
            validate_payload(payload)

    def test_drops_nested_and_unknown_properties(self):
        payload = self.payload()
        payload["properties"] = {
            "label": "Start a project",
            "email": "not-allowed@example.com",
            "component": {"nested": "not allowed"},
        }
        result = validate_payload(payload)
        self.assertEqual(result["p_properties"], {"label": "Start a project"})
        self.assertNotIn("email", json.dumps(result))

    def test_hashes_client_address_with_server_only_salt(self):
        with patch.dict(os.environ, {"TRACKING_HASH_SALT": "0123456789abcdef"}, clear=False):
            first = hash_client_address("203.0.113.10")
            second = hash_client_address("203.0.113.10")
        self.assertEqual(first, second)
        self.assertEqual(len(first), 64)
        self.assertNotIn("203.0.113.10", first)

    def test_requires_a_real_hash_salt(self):
        with patch.dict(os.environ, {"TRACKING_HASH_SALT": "short"}, clear=False):
            with self.assertRaises(TrackingError) as context:
                hash_client_address("203.0.113.10")
        self.assertEqual(context.exception.status, 503)


if __name__ == "__main__":
    unittest.main()
