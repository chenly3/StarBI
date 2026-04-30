import asyncio
import sys
import types
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

deps = types.ModuleType("common.core.deps")
deps.SessionDep = Any
sys.modules.setdefault("common.core.deps", deps)


class FakeResult:
    def __init__(self, items: list[Any]):
        self._items = items

    def all(self):
        return list(self._items)

    def first(self):
        return self._items[0] if self._items else None


class FakeSession:
    def __init__(self, items: list[Any] | None = None):
        self.items = list(items or [])
        self.committed = False

    def exec(self, _statement):
        return FakeResult(self.items)

    def add(self, item):
        item.id = len(self.items) + 1
        self.items.append(item)

    def commit(self):
        self.committed = True

    def refresh(self, _item):
        return None


def test_disambiguation_router_contract():
    from apps.disambiguation.api import router

    routes = {(route.path, tuple(sorted(route.methods))) for route in router.routes}

    assert ("/disambiguation/history", ("GET",)) in routes
    assert ("/disambiguation/history", ("POST",)) in routes


def test_save_history_uses_forwarded_user_header_when_body_omits_user():
    from apps.disambiguation.api import DisambiguationHistoryIn, save_history

    session = FakeSession()
    payload = DisambiguationHistoryIn(
        questionPattern="近30天销售额",
        resolution={"datasource": {"value": "sales"}},
    )

    result = asyncio.run(save_history(session, payload, x_de_user_id="42", x_de_org_id="7"))

    assert session.committed is True
    assert result["success"] is True
    assert result["data"]["userId"] == 42
    assert result["data"]["orgId"] == 7
    assert result["data"]["questionPattern"] == "近30天销售额"
    assert result["data"]["resolution"]["datasource"]["value"] == "sales"
