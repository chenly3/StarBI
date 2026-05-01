import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from apps.system.bootstrap import (
    DEFAULT_STARBI_ASSISTANT_ID,
    build_default_starbi_assistant,
    ensure_default_starbi_assistant,
)


class BootstrapAssistantTests(unittest.TestCase):
    def test_default_starbi_assistant_uses_stable_id_and_secret(self):
        env = {
            **os.environ,
            "STARBI_SQLBOT_ASSISTANT_SECRET": "starbi-secret",
            "STARBI_PUBLIC_URL": "http://192.168.1.163:9080",
        }
        with patch.dict(os.environ, env, clear=True):
            assistant = build_default_starbi_assistant()

        self.assertEqual(assistant.id, DEFAULT_STARBI_ASSISTANT_ID)
        self.assertEqual(assistant.name, "StarBI")
        self.assertEqual(assistant.type, 4)
        self.assertEqual(assistant.domain, "http://192.168.1.163:9080")
        self.assertEqual(assistant.app_secret, "starbi-secret")
        self.assertEqual(assistant.oid, 1)

    def test_existing_default_assistant_syncs_explicit_secret_and_domain(self):
        existing = build_default_starbi_assistant()
        existing.app_secret = "old-secret"
        existing.domain = "http://old-host:9080"
        session = FakeSession(existing)
        env = {
            **os.environ,
            "STARBI_SQLBOT_ASSISTANT_SECRET": "new-secret",
            "STARBI_PUBLIC_URL": "http://new-host:9080",
        }

        with patch.dict(os.environ, env, clear=True):
            assistant = ensure_default_starbi_assistant(session)

        self.assertEqual(assistant.app_secret, "new-secret")
        self.assertEqual(assistant.domain, "http://new-host:9080")
        self.assertEqual(session.added, [assistant])

    def test_existing_default_assistant_syncs_page_embed_type(self):
        existing = build_default_starbi_assistant()
        existing.type = 0
        session = FakeSession(existing)

        assistant = ensure_default_starbi_assistant(session)

        self.assertEqual(assistant.type, 4)
        self.assertEqual(session.added, [assistant])


class FakeSession:
    def __init__(self, assistant):
        self.assistant = assistant
        self.added = []

    def get(self, model, item_id):
        return self.assistant if item_id == self.assistant.id else None

    def add(self, item):
        self.added.append(item)


if __name__ == "__main__":
    unittest.main()
