from pathlib import Path
import hmac
from hashlib import sha256
import sys
import time
import unittest
from unittest.mock import patch
from urllib.parse import quote_plus

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from apps.system.middleware.internal_user import build_internal_user, verify_internal_signature


def _legacy_signature(secret: str, user_id: str, org_id: str, timestamp: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        f"{user_id}:{org_id}:{timestamp}".encode("utf-8"),
        sha256,
    ).hexdigest()


def _signature(
    secret: str,
    user_id: str,
    org_id: str,
    account: str,
    name: str,
    is_admin: str,
    is_ws_admin: str,
    timestamp: str,
) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        "\n".join([user_id, org_id, account, name, is_admin, is_ws_admin, timestamp]).encode("utf-8"),
        sha256,
    ).hexdigest()


class InternalUserMiddlewareTest(unittest.TestCase):

    def test_internal_user_uses_forwarded_dataease_org_without_admin_grant(self):
        user = build_internal_user("4", "44", quote_plus("analyst"), quote_plus("分析用户"), "false", "false")

        self.assertIsNotNone(user)
        self.assertEqual(4, user.id)
        self.assertEqual(44, user.oid)
        self.assertEqual("analyst", user.account)
        self.assertEqual("分析用户", user.name)
        self.assertFalse(user.isAdmin)
        self.assertEqual(0, user.weight)

    def test_internal_dataease_system_admin_maps_to_sqlbot_admin(self):
        user = build_internal_user("4", "44", "ops_admin", "Ops+Admin", "true", "true")

        self.assertIsNotNone(user)
        self.assertEqual(4, user.id)
        self.assertEqual(44, user.oid)
        self.assertEqual("ops_admin", user.account)
        self.assertTrue(user.isAdmin)
        self.assertEqual(1, user.weight)

    def test_internal_dataease_workspace_admin_maps_to_sqlbot_ws_admin(self):
        user = build_internal_user("2", "99", "org_admin", quote_plus("组织管理员"), "false", "true")

        self.assertIsNotNone(user)
        self.assertEqual(2, user.id)
        self.assertEqual(99, user.oid)
        self.assertFalse(user.isAdmin)
        self.assertEqual(1, user.weight)

    def test_internal_legacy_dataease_admin_mapping_is_kept(self):
        user = build_internal_user("1", "1")

        self.assertIsNotNone(user)
        self.assertEqual(1, user.id)
        self.assertEqual(1, user.oid)
        self.assertEqual("admin", user.account)
        self.assertTrue(user.isAdmin)

    def test_internal_user_rejects_missing_org_header(self):
        self.assertIsNone(build_internal_user("4", None))
        self.assertIsNone(build_internal_user("4", "0"))

    def test_internal_signature_accepts_dataease_signed_scope(self):
        timestamp = str(int(time.time()))
        signature = _signature("starbi-secret", "4", "44", "analyst", quote_plus("分析用户"), "false", "false", timestamp)

        with patch("apps.system.middleware.internal_user.settings.STARBI_SQLBOT_ASSISTANT_SECRET", "starbi-secret"):
            self.assertTrue(verify_internal_signature("4", "44", "analyst", quote_plus("分析用户"), "false", "false", timestamp, signature))

    def test_internal_signature_accepts_legacy_scope_without_claim_headers(self):
        timestamp = str(int(time.time()))
        signature = _legacy_signature("starbi-secret", "4", "44", timestamp)

        with patch("apps.system.middleware.internal_user.settings.STARBI_SQLBOT_ASSISTANT_SECRET", "starbi-secret"):
            self.assertTrue(verify_internal_signature("4", "44", None, None, None, None, timestamp, signature))

    def test_internal_signature_rejects_tampered_admin_claims(self):
        timestamp = str(int(time.time()))
        signature = _signature("starbi-secret", "4", "44", "analyst", "Analyst", "false", "false", timestamp)

        with patch("apps.system.middleware.internal_user.settings.STARBI_SQLBOT_ASSISTANT_SECRET", "starbi-secret"):
            self.assertFalse(verify_internal_signature("4", "44", "analyst", "Analyst", "true", "true", timestamp, signature))

    def test_internal_signature_rejects_spoofed_or_stale_headers(self):
        timestamp = str(int(time.time()))
        stale_timestamp = str(int(time.time()) - 600)
        stale_signature = _signature("starbi-secret", "4", "44", "analyst", "Analyst", "false", "false", stale_timestamp)

        with patch("apps.system.middleware.internal_user.settings.STARBI_SQLBOT_ASSISTANT_SECRET", "starbi-secret"):
            self.assertFalse(verify_internal_signature("4", "44", "analyst", "Analyst", "false", "false", timestamp, "bad-signature"))
            self.assertFalse(verify_internal_signature("4", "44", "analyst", "Analyst", "false", "false", stale_timestamp, stale_signature))
            self.assertFalse(verify_internal_signature("4", "44", "analyst", "Analyst", "false", "false", timestamp, None))

    def test_internal_signature_rejects_when_dataease_secret_is_missing(self):
        timestamp = str(int(time.time()))
        signature = _signature("public-or-framework-secret", "4", "44", "analyst", "Analyst", "false", "false", timestamp)

        with patch("apps.system.middleware.internal_user.settings.STARBI_SQLBOT_ASSISTANT_SECRET", ""):
            self.assertFalse(verify_internal_signature("4", "44", "analyst", "Analyst", "false", "false", timestamp, signature))


if __name__ == "__main__":
    unittest.main()
