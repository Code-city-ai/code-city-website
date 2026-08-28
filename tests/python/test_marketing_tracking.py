import json
import os
import re
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from api._tracking import TrackingError, hash_client_address, is_obvious_bot, validate_payload


class MarketingTrackingValidationTests(unittest.TestCase):
    def payload(self):
        now = datetime.now(timezone.utc).isoformat()
        return {
            "eventId": str(uuid.uuid4()),
            "visitorId": str(uuid.uuid4()),
            "sessionId": str(uuid.uuid4()),
            "eventName": "page_viewed",
            "occurredAt": now,
            "sessionStartedAt": now,
            "path": "/contact",
            "referrer": "https://www.google.com/",
            "utmSource": "google",
            "utmMedium": "cpc",
            "utmCampaign": "code-city-launch",
            "gclid": "AbC-123-XyZ",
            "campaignExternalId": "campaign-42",
            "attributionPresent": True,
            "attributionTouchOccurred": True,
            "attributionCapturedAt": datetime.now(timezone.utc).isoformat(),
            "deviceType": "desktop",
            "properties": {"component": "contact-hero", "ignored": "never stored"},
        }

    def test_validates_and_maps_public_payload_to_rpc_shape(self):
        result = validate_payload(self.payload())
        self.assertEqual(result["p_event_name"], "page_viewed")
        self.assertEqual(result["p_path"], "/contact")
        self.assertEqual(result["p_properties"], {"component": "contact-hero"})
        self.assertEqual(result["p_gclid"], "AbC-123-XyZ")
        self.assertEqual(result["p_campaign_external_id"], "campaign-42")
        self.assertIs(result["p_attribution_present"], True)
        self.assertIs(result["p_touch_occurred"], True)
        self.assertIsNotNone(result["p_attribution_captured_at"])
        self.assertEqual(result["p_session_started_at"], result["p_occurred_at"])

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

    def test_strips_referrer_query_and_fragment_before_storage(self):
        payload = self.payload()
        payload["referrer"] = "https://example.com/search?q=private-token#result"
        result = validate_payload(payload)
        self.assertEqual(result["p_referrer"], "https://example.com/search")

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

    def test_old_clients_derive_attribution_presence(self):
        payload = self.payload()
        payload.pop("attributionPresent")
        payload.pop("attributionTouchOccurred")
        payload.pop("attributionCapturedAt")
        result = validate_payload(payload)
        self.assertIs(result["p_attribution_present"], True)
        self.assertIs(result["p_touch_occurred"], True)
        self.assertEqual(result["p_attribution_captured_at"], result["p_occurred_at"])

    def test_rejects_non_boolean_attribution_flag(self):
        payload = self.payload()
        payload["attributionPresent"] = "yes"
        with self.assertRaises(TrackingError):
            validate_payload(payload)

    def test_rejects_non_boolean_touch_flag(self):
        payload = self.payload()
        payload["attributionTouchOccurred"] = "yes"
        with self.assertRaises(TrackingError):
            validate_payload(payload)

    def test_rejects_touch_without_attribution_context(self):
        payload = self.payload()
        payload.update({
            "utmSource": "",
            "utmMedium": "",
            "utmCampaign": "",
            "gclid": "",
            "campaignExternalId": "",
            "attributionPresent": False,
            "attributionTouchOccurred": True,
            "attributionCapturedAt": None,
        })
        with self.assertRaises(TrackingError):
            validate_payload(payload)

    def test_rejects_capture_time_outside_the_session_window(self):
        payload = self.payload()
        payload["attributionCapturedAt"] = "2026-01-01T00:00:00Z"
        with self.assertRaises(TrackingError):
            validate_payload(payload)

    def test_accepts_original_touch_in_a_continuously_active_long_session(self):
        payload = self.payload()
        captured = datetime.now(timezone.utc) - timedelta(hours=2)
        payload["sessionStartedAt"] = captured.isoformat()
        payload["attributionCapturedAt"] = captured.isoformat()
        payload["attributionTouchOccurred"] = False
        result = validate_payload(payload)
        self.assertEqual(result["p_attribution_captured_at"], captured.isoformat().replace("+00:00", "Z"))
        self.assertIs(result["p_touch_occurred"], False)

    def test_identifiers_cannot_suppress_attribution_with_a_false_flag(self):
        payload = self.payload()
        payload["attributionPresent"] = False
        payload["attributionTouchOccurred"] = False
        result = validate_payload(payload)
        self.assertIs(result["p_attribution_present"], True)

    def test_python_payload_keys_match_the_latest_database_rpc_contract(self):
        payload_keys = set(validate_payload(self.payload())) | {"p_ip_hash"}
        migration = (
            Path(__file__).resolve().parents[2]
            / "supabase/migrations/20260828194000_harden_attribution_semantics.sql"
        ).read_text(encoding="utf-8")
        match = re.search(
            r"create function public\.record_marketing_event_v2\((.*?)\n\)\nreturns boolean",
            migration,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(match)
        sql_keys = set(re.findall(r"\b(p_[a-z0-9_]+)\s+(?:uuid|text|timestamptz|boolean|jsonb)\b", match.group(1)))
        self.assertEqual(payload_keys, sql_keys)

    def test_sql_checks_session_ownership_before_mutating_a_visitor(self):
        migration = (
            Path(__file__).resolve().parents[2]
            / "supabase/migrations/20260828194000_harden_attribution_semantics.sql"
        ).read_text(encoding="utf-8")
        match = re.search(
            r"create or replace function public\.upsert_marketing_identity\(.*?\n\$\$;",
            migration,
            flags=re.DOTALL,
        )
        self.assertIsNotNone(match)
        function_sql = match.group(0)
        session_lock = function_sql.index(
            "pg_advisory_xact_lock(hashtextextended(p_session_key::text, 1))"
        )
        ownership_check = function_sql.index(
            "v_existing_session_visitor_key is distinct from p_visitor_key"
        )
        visitor_mutation = function_sql.index("insert into public.marketing_visitors")
        self.assertLess(session_lock, ownership_check)
        self.assertLess(ownership_check, visitor_mutation)

    def test_detects_obvious_automated_user_agents(self):
        self.assertTrue(is_obvious_bot("Mozilla/5.0 compatible; Googlebot/2.1"))
        self.assertTrue(is_obvious_bot("HeadlessChrome/126.0"))
        self.assertFalse(is_obvious_bot("Mozilla/5.0 Chrome/126.0 Safari/537.36"))


if __name__ == "__main__":
    unittest.main()
