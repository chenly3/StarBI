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

langchain_core = types.ModuleType("langchain_core")
langchain_messages = types.ModuleType("langchain_core.messages")
langchain_messages.BaseMessage = object
langchain_messages.SystemMessage = object
langchain_messages.HumanMessage = object
langchain_messages.AIMessage = object
sys.modules.setdefault("langchain_core", langchain_core)
sys.modules.setdefault("langchain_core.messages", langchain_messages)

common_utils = types.ModuleType("common.utils.utils")
common_utils.equals_ignore_case = lambda left, right: str(left).lower() == str(right).lower()
sys.modules.setdefault("common.utils.utils", common_utils)


class FakeResult:
    def __init__(self, *, one_value: Any = None, all_value: list[Any] | None = None):
        self.one_value = one_value
        self.all_value = list(all_value or [])

    def one(self):
        return self.one_value

    def all(self):
        return list(self.all_value)


class FakeSession:
    def __init__(self):
        self.results = [
            FakeResult(one_value=5),
            FakeResult(one_value=2),
            FakeResult(one_value=4),
            FakeResult(all_value=["SQL syntax error", "timeout waiting for database"]),
        ]

    def exec(self, _statement):
        return self.results.pop(0)


def test_analytics_router_contract():
    from apps.analytics.api import router

    routes = {(route.path, tuple(sorted(route.methods))) for route in router.routes}

    assert ("/analytics/dashboard", ("GET",)) in routes


def test_dashboard_returns_query_success_and_failure_summary():
    from apps.analytics.api import dashboard

    result = asyncio.run(dashboard(FakeSession(), limit=10))

    data = result["data"]
    assert result["success"] is True
    assert data["totalQueries"] == 5
    assert data["successfulQueries"] == 2
    assert data["failedQueries"] == 2
    assert data["successRate"] == 40.0
    assert {"reason": "sql", "count": 1} in data["failureReasons"]
    assert {"reason": "timeout", "count": 1} in data["failureReasons"]
