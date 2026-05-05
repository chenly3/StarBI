from pathlib import Path
import hmac
from hashlib import sha256
import sys
import time
import unittest
from unittest.mock import patch

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from apps.system.middleware.internal_user import build_internal_user, verify_internal_signature


def _signature(secret: str, user_id: str, org_id: str, timestamp: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        f"{user_id}:{org_id}:{timestamp}".encode("utf-8"),
        sha256,
    ).hexdigest()


class InternalUserMiddlewareTest(unittest.TestCase):

    def test_internal_user_uses_forwarded_dataease_org_without_admin_grant(self):
        user = build_internal_user("4", "44")

        self.assertIsNotNone(user)
        self.assertEqual(4, user.id)
        self.assertEqual(44, user.oid)
        self.assertFalse(user.isAdmin)
        self.assertEqual(0, user.weight)

    def test_internal_user_rejects_missing_org_header(self):
        self.assertIsNone(build_internal_user("4", None))
        self.assertIsNone(build_internal_user("4", "0"))

    def test_internal_signature_accepts_dataease_signed_scope(self):
        timestamp = str(int(time.time()))
        signature = _signature("starbi-secret", "4", "44", timestamp)

        with patch("apps.system.middleware.internal_user.settings.STARBI_SQLBOT_ASSISTANT_SECRET", "starbi-secret"):
            self.assertTrue(verify_internal_signature("4", "44", timestamp, signature))

    def test_internal_signature_rejects_spoofed_or_stale_headers(self):
        timestamp = str(int(time.time()))
        stale_timestamp = str(int(time.time()) - 600)

        with patch("apps.system.middleware.internal_user.settings.STARBI_SQLBOT_ASSISTANT_SECRET", "starbi-secret"):
            self.assertFalse(verify_internal_signature("4", "44", timestamp, "bad-signature"))
            self.assertFalse(verify_internal_signature("4", "44", stale_timestamp, _signature("starbi-secret", "4", "44", stale_timestamp)))
            self.assertFalse(verify_internal_signature("4", "44", timestamp, None))

    def test_internal_signature_rejects_when_dataease_secret_is_missing(self):
        timestamp = str(int(time.time()))
        signature = _signature("public-or-framework-secret", "4", "44", timestamp)

        with patch("apps.system.middleware.internal_user.settings.STARBI_SQLBOT_ASSISTANT_SECRET", ""):
            self.assertFalse(verify_internal_signature("4", "44", timestamp, signature))


if __name__ == "__main__":
    unittest.main()
