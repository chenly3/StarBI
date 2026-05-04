from pathlib import Path
import sys
import unittest

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from apps.system.middleware.internal_user import build_internal_user


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


if __name__ == "__main__":
    unittest.main()
