import importlib.util
import sys
import types
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


class FakeResult:
    def __init__(self, items: list[Any]):
        self._items = items

    def all(self) -> list[Any]:
        return list(self._items)


class FakeSession:
    def __init__(self):
        self._items: dict[type, list[Any]] = defaultdict(list)
        self._next_id = 1

    def seed(self, item: Any) -> Any:
        if hasattr(item, "id") and getattr(item, "id", None) is None:
            item.id = self._next_id
            self._next_id += 1
        self._items[type(item)].append(item)
        return item

    def add(self, item: Any) -> None:
        self.seed(item)

    def delete(self, item: Any) -> None:
        model_items = self._items.get(type(item), [])
        try:
            model_items.remove(item)
        except ValueError:
            return

    def commit(self) -> None:
        return None

    def refresh(self, item: Any) -> None:
        return None

    def exec(self, statement: Any) -> FakeResult:
        model = statement.column_descriptions[0]["entity"]
        return FakeResult(self._items[model])


def install_fake_db_module(session: FakeSession):
    db_module = sys.modules.get("common.core.db")
    if db_module is None:
        db_module = types.ModuleType("common.core.db")

        def get_session():
            yield db_module.current_session

        db_module.get_session = get_session
        sys.modules["common.core.db"] = db_module

    db_module.current_session = session
    return db_module.get_session


@contextmanager
def load_learning_router(session: FakeSession):
    saved_modules = {
        "common.core.db": sys.modules.get("common.core.db"),
        "common.core.deps": sys.modules.get("common.core.deps"),
        "apps.query_resource_learning.api": sys.modules.get("apps.query_resource_learning.api"),
    }
    sys.modules.pop("common.core.deps", None)
    sys.modules.pop("apps.query_resource_learning.api", None)
    install_fake_db_module(session)

    try:
        from apps.query_resource_learning.api import router

        yield router
    finally:
        for name, module in saved_modules.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module


@contextmanager
def build_client(
    session: FakeSession,
    *,
    current_user: Any | None = None,
):
    with load_learning_router(session) as router:
        from common.core.deps import get_current_user

        app = FastAPI()
        if current_user is None:
            current_user = types.SimpleNamespace(
                oid=1,
                account="ws_admin_tester",
                weight=1,
                isAdmin=False,
            )
        app.dependency_overrides[get_current_user] = lambda: current_user
        app.include_router(router)

        with TestClient(app) as client:
            yield client


def install_stubbed_api_dependencies() -> dict[str, types.ModuleType | None]:
    stub_module_names = [
        "apps.chat.api",
        "apps.chat.api.chat",
        "apps.dashboard.api",
        "apps.dashboard.api.dashboard_api",
        "apps.data_training.api",
        "apps.data_training.api.data_training",
        "apps.datasource.api",
        "apps.datasource.api.datasource",
        "apps.datasource.api.table_relation",
        "apps.datasource.api.recommended_problem",
        "apps.mcp",
        "apps.mcp.mcp",
        "apps.system.api",
        "apps.system.api.login",
        "apps.system.api.user",
        "apps.system.api.aimodel",
        "apps.system.api.workspace",
        "apps.system.api.assistant",
        "apps.system.api.parameter",
        "apps.system.api.apikey",
        "apps.system.api.variable_api",
        "apps.terminology.api",
        "apps.terminology.api.terminology",
        "apps.settings.api",
        "apps.settings.api.base",
    ]
    saved_modules: dict[str, types.ModuleType | None] = {
        name: sys.modules.get(name) for name in stub_module_names
    }

    def make_router_module(name: str) -> types.ModuleType:
        from fastapi import APIRouter

        module = types.ModuleType(name)
        module.router = APIRouter()
        return module

    def register_package(name: str) -> types.ModuleType:
        module = types.ModuleType(name)
        module.__path__ = []  # type: ignore[attr-defined]
        sys.modules[name] = module
        return module

    chat_api = register_package("apps.chat.api")
    chat_api.chat = make_router_module("apps.chat.api.chat")
    sys.modules["apps.chat.api.chat"] = chat_api.chat

    dashboard_api = register_package("apps.dashboard.api")
    dashboard_api.dashboard_api = make_router_module("apps.dashboard.api.dashboard_api")
    sys.modules["apps.dashboard.api.dashboard_api"] = dashboard_api.dashboard_api

    data_training_api = register_package("apps.data_training.api")
    data_training_api.data_training = make_router_module("apps.data_training.api.data_training")
    sys.modules["apps.data_training.api.data_training"] = data_training_api.data_training

    datasource_api = register_package("apps.datasource.api")
    datasource_api.datasource = make_router_module("apps.datasource.api.datasource")
    datasource_api.table_relation = make_router_module("apps.datasource.api.table_relation")
    datasource_api.recommended_problem = make_router_module("apps.datasource.api.recommended_problem")
    sys.modules["apps.datasource.api.datasource"] = datasource_api.datasource
    sys.modules["apps.datasource.api.table_relation"] = datasource_api.table_relation
    sys.modules["apps.datasource.api.recommended_problem"] = datasource_api.recommended_problem

    mcp_package = register_package("apps.mcp")
    mcp_package.mcp = make_router_module("apps.mcp.mcp")
    sys.modules["apps.mcp.mcp"] = mcp_package.mcp

    system_api = register_package("apps.system.api")
    for module_name in (
        "login",
        "user",
        "aimodel",
        "workspace",
        "assistant",
        "parameter",
        "apikey",
        "variable_api",
    ):
        full_name = f"apps.system.api.{module_name}"
        submodule = make_router_module(full_name)
        setattr(system_api, module_name, submodule)
        sys.modules[full_name] = submodule

    terminology_api = register_package("apps.terminology.api")
    terminology_api.terminology = make_router_module("apps.terminology.api.terminology")
    sys.modules["apps.terminology.api.terminology"] = terminology_api.terminology

    settings_api = register_package("apps.settings.api")
    settings_api.base = make_router_module("apps.settings.api.base")
    sys.modules["apps.settings.api.base"] = settings_api.base

    return saved_modules


def restore_modules(saved_modules: dict[str, types.ModuleType | None]) -> None:
    for name, module in saved_modules.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module


def test_list_learning_resources_returns_persisted_status_and_score():
    from apps.query_resource_learning.models import (
        QueryResourceLearningResult,
        QueryResourceLearningScore,
        QueryResourceLearningTask,
    )

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-1", status="succeeded"))
    session.seed(
        QueryResourceLearningResult(
            resource_id="resource-1",
            semantic_profile={"dataset_name": "Sales Dataset"},
        )
    )
    session.seed(
        QueryResourceLearningScore(
            resource_id="resource-1",
            grade="A",
            score=97,
            signals=[],
        )
    )
    with build_client(session) as client:
        response = client.get("/query-resource-learning/resources")

    assert response.status_code == 200
    assert response.json() == [
        {
            "resource_id": "resource-1",
            "name": "Sales Dataset",
            "learning_status": "succeeded",
            "quality_grade": "A",
            "quality_score": 97,
        }
    ]


def test_learn_resource_persists_task_and_returns_created_status():
    from apps.query_resource_learning.models import (
        QueryResourceLearningResult,
        QueryResourceLearningScore,
        QueryResourceLearningTask,
    )

    session = FakeSession()
    with build_client(session) as client:
        response = client.post("/query-resource-learning/resources/resource-9/learn")

    assert response.status_code == 200
    assert response.json() == {
        "task_id": 1,
        "resource_id": "resource-9",
        "task_status": "succeeded",
    }

    saved_tasks = session._items[QueryResourceLearningTask]
    assert len(saved_tasks) == 1
    assert saved_tasks[0].resource_id == "resource-9"
    assert saved_tasks[0].status == "succeeded"
    assert saved_tasks[0].trigger_type == "manual"
    assert saved_tasks[0].started_at is not None
    assert saved_tasks[0].finished_at is not None
    assert saved_tasks[0].failure_reason is None

    saved_results = session._items[QueryResourceLearningResult]
    assert len(saved_results) == 1
    assert saved_results[0].resource_id == "resource-9"
    assert saved_results[0].semantic_profile["dataset_name"] == "resource-9"
    assert isinstance(saved_results[0].sample_values, list)
    assert isinstance(saved_results[0].recommended_questions, list)

    saved_scores = session._items[QueryResourceLearningScore]
    assert len(saved_scores) == 1
    assert saved_scores[0].resource_id == "resource-9"
    assert saved_scores[0].grade in {"A", "B", "C", "D"}
    assert saved_scores[0].score >= 0
    assert isinstance(saved_scores[0].signals, list)


def test_learn_resource_uses_injected_executor_to_build_real_learning_assets():
    from apps.query_resource_learning.models import (
        QueryResourceLearningResult,
        QueryResourceLearningScore,
        QueryResourceLearningTask,
    )

    session = FakeSession()

    with load_learning_router(session) as router:
        learn_endpoint = next(route.endpoint for route in router.routes if route.path == "/query-resource-learning/resources/{resource_id}/learn")

        fake_payload = {
            "resource_id": "datasource:12",
            "task_id": 1,
            "task_status": "pending",
            "task": QueryResourceLearningTask(
                id=1,
                resource_id="datasource:12",
                status="succeeded",
            ),
            "result": QueryResourceLearningResult(
                resource_id="datasource:12",
                semantic_profile={
                    "dataset_name": "销售数据集",
                    "fields": [{"field_name": "region"}],
                    "terminology_mappings": [{"term": "GMV", "target": "sales_amount"}],
                    "sql_examples": [{"question": "最近30天 GMV", "sql": "select 1"}],
                },
                sample_values=[{"field": "region", "values": ["华东"]}],
                recommended_questions=["最近30天 GMV"],
            ),
            "score": QueryResourceLearningScore(
                resource_id="datasource:12",
                grade="A",
                score=92,
                signals=["字段完整度高"],
            ),
        }

        previous_executor = learn_endpoint.__globals__.get("execute_learning_for_resource")
        learn_endpoint.__globals__["execute_learning_for_resource"] = lambda _session, resource_id: fake_payload
        try:
            app = FastAPI()
            app.include_router(router)
            with TestClient(app) as client:
                response = client.post("/query-resource-learning/resources/datasource:12/learn")
        finally:
            if previous_executor is None:
                learn_endpoint.__globals__.pop("execute_learning_for_resource", None)
            else:
                learn_endpoint.__globals__["execute_learning_for_resource"] = previous_executor

    assert response.status_code == 200
    assert response.json() == {
        "task_id": 1,
        "resource_id": "datasource:12",
        "task_status": "pending",
    }

    saved_tasks = session._items[QueryResourceLearningTask]
    saved_results = session._items[QueryResourceLearningResult]
    saved_scores = session._items[QueryResourceLearningScore]

    assert len(saved_tasks) == 1
    assert len(saved_results) == 1
    assert len(saved_scores) == 1
    assert saved_results[0].semantic_profile["dataset_name"] == "销售数据集"
    assert saved_results[0].recommended_questions == ["最近30天 GMV"]
    assert saved_scores[0].score == 92
    assert saved_scores[0].signals == ["字段完整度高"]


def test_save_feedback_returns_relearning_suggestion():
    session = FakeSession()
    with build_client(session) as client:
        response = client.post(
            "/query-resource-learning/resources/resource-9/feedback",
            json={
                "failure_rate": 12,
                "downvote_rate": 20,
                "schema_changed": False,
            },
        )

    assert response.status_code == 200
    assert response.json() == {
        "resource_id": "resource-9",
        "accepted": True,
        "relearning_suggested": True,
        "trigger_reason": "downvote_rate_high",
        "relearning_advice": "近期点踩率偏高，建议重新学习并补充推荐问法与术语映射。",
    }


def test_save_feedback_validates_structured_payload():
    session = FakeSession()
    with build_client(session) as client:
        response = client.post(
            "/query-resource-learning/resources/resource-9/feedback",
            json={
                "failure_rate": "high",
                "downvote_rate": 20,
                "schema_changed": False,
            },
        )

    assert response.status_code == 422


def test_quality_summary_endpoint_returns_structured_payload():
    from apps.query_resource_learning.models import (
        QueryResourceLearningScore,
        QueryResourceLearningTask,
    )

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-1", status="succeeded"))
    session.seed(
        QueryResourceLearningScore(
            resource_id="resource-1",
            grade="A",
            score=91,
            signals=["字段完整度高"],
        )
    )
    with build_client(session) as client:
        response = client.get(
            "/query-resource-learning/resources/resource-1/quality-summary"
        )

    assert response.status_code == 200
    assert response.json() == {
        "resource_id": "resource-1",
        "score": 91,
        "grade": "A",
        "risks": [],
        "suggestions": [],
        "signals": ["字段完整度高"],
    }


def test_feedback_summary_endpoint_returns_relearning_suggestion_flag():
    from apps.query_resource_learning.models import QueryResourceLearningTask

    session = FakeSession()
    session.seed(
        QueryResourceLearningTask(
            resource_id="resource-2",
            status="failed",
            failure_reason="过滤值映射不稳定",
        )
    )
    with build_client(session) as client:
        response = client.get(
            "/query-resource-learning/resources/resource-2/feedback-summary"
        )

    assert response.status_code == 200
    assert response.json() == {
        "resource_id": "resource-2",
        "total_feedback_count": 1,
        "downvote_count": 0,
        "downvote_rate": 0,
        "failure_count": 1,
        "failure_rate": 100,
        "recent_issues": ["过滤值映射不稳定"],
        "relearning_suggested": True,
        "trigger_reason": "failure_rate_high",
        "relearning_advice": "近期失败率偏高，建议重新学习并复核字段语义与样本值。",
    }


def test_quality_summary_endpoint_returns_404_for_unknown_resource():
    session = FakeSession()
    with build_client(session) as client:
        response = client.get(
            "/query-resource-learning/resources/missing-resource/quality-summary"
        )

    assert response.status_code == 404


def test_feedback_summary_endpoint_returns_404_for_unknown_resource():
    session = FakeSession()
    with build_client(session) as client:
        response = client.get(
            "/query-resource-learning/resources/missing-resource/feedback-summary"
        )

    assert response.status_code == 404


def test_delete_resource_removes_related_learning_rows():
    from apps.query_resource_learning.models import (
        QueryResourceLearningResult,
        QueryResourceLearningScore,
        QueryResourceLearningTask,
    )

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-1", status="succeeded"))
    session.seed(QueryResourceLearningResult(resource_id="resource-1"))
    session.seed(QueryResourceLearningScore(resource_id="resource-1"))

    with build_client(session) as client:
        response = client.delete("/query-resource-learning/resources/resource-1")

    assert response.status_code == 200
    assert response.json() == {
        "resource_id": "resource-1",
        "deleted": True,
        "deleted_rows": 3,
    }
    assert session._items[QueryResourceLearningTask] == []
    assert session._items[QueryResourceLearningResult] == []
    assert session._items[QueryResourceLearningScore] == []


def test_delete_resource_returns_404_for_missing_resource():
    session = FakeSession()
    with build_client(session) as client:
        response = client.delete("/query-resource-learning/resources/missing-resource")

    assert response.status_code == 404


def test_delete_resource_removes_feedback_loop_rows():
    from apps.query_resource_learning.models import (
        QueryResourceLearningFeedbackEvent,
        QueryResourceLearningFeedbackMetric,
        QueryResourceLearningPatchApplyLog,
        QueryResourceLearningPatchSnapshot,
        QueryResourceLearningResult,
        QueryResourceLearningScore,
        QueryResourceLearningTask,
    )

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-4", status="succeeded"))
    session.seed(QueryResourceLearningResult(resource_id="resource-4"))
    session.seed(QueryResourceLearningScore(resource_id="resource-4"))
    session.seed(
        QueryResourceLearningFeedbackEvent(
            event_no="qrl_delete_test",
            resource_id="resource-4",
            actor_account="tester",
            event_type="downvote",
        )
    )
    session.seed(
        QueryResourceLearningPatchSnapshot(
            resource_id="resource-4",
            patch_type="sql_override",
            match_fingerprint="fingerprint-delete",
            match_rule={"question_text": "按区域看GMV"},
            patch_payload={"after_snapshot": {"sql": "select 1"}},
            source_event_id=1,
            enabled_by="tester",
        )
    )
    session.seed(
        QueryResourceLearningPatchApplyLog(
            resource_id="resource-4",
            trace_id="trace-delete",
            apply_result="applied",
        )
    )
    session.seed(QueryResourceLearningFeedbackMetric(resource_id="resource-4"))
    session.seed(QueryResourceLearningTask(resource_id="resource-5", status="succeeded"))

    with build_client(session) as client:
        response = client.delete("/query-resource-learning/resources/resource-4")

    assert response.status_code == 200
    assert response.json() == {
        "resource_id": "resource-4",
        "deleted": True,
        "deleted_rows": 7,
    }
    assert all(item.resource_id != "resource-4" for item in session._items[QueryResourceLearningTask])
    assert all(item.resource_id != "resource-4" for item in session._items[QueryResourceLearningResult])
    assert all(item.resource_id != "resource-4" for item in session._items[QueryResourceLearningScore])
    assert all(item.resource_id != "resource-4" for item in session._items[QueryResourceLearningFeedbackEvent])
    assert all(item.resource_id != "resource-4" for item in session._items[QueryResourceLearningPatchSnapshot])
    assert all(item.resource_id != "resource-4" for item in session._items[QueryResourceLearningPatchApplyLog])
    assert all(item.resource_id != "resource-4" for item in session._items[QueryResourceLearningFeedbackMetric])


def test_create_feedback_event_endpoint_contract():
    from apps.query_resource_learning.models import (
        QueryResourceLearningFeedbackEvent,
        QueryResourceLearningTask,
    )

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-1", status="succeeded"))
    with build_client(session) as client:
        response = client.post(
            "/query-resource-learning/resources/resource-feedback-1/feedback/events",
            json={
                "actor_account": "tester",
                "event_type": "downvote",
                "question_text": "最近30天GMV",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["accepted"] is True
    assert body["resource_id"] == "resource-feedback-1"
    assert body["event_no"].startswith("qrl_")
    assert body["active_patch_count"] == 0
    assert body["metric"]["lifetime_total_feedback_count"] == 1
    assert body["metric"]["lifetime_downvote_count"] == 1

    saved_events = session._items[QueryResourceLearningFeedbackEvent]
    assert len(saved_events) == 1
    assert saved_events[0].event_type == "downvote"
    assert saved_events[0].actor_account == "tester"


def test_create_feedback_event_endpoint_returns_400_for_invalid_manual_fix_context():
    from apps.query_resource_learning.models import QueryResourceLearningTask

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-1x", status="succeeded"))
    with build_client(session) as client:
        response = client.post(
            "/query-resource-learning/resources/resource-feedback-1x/feedback/events",
            json={
                "actor_account": "tester",
                "event_type": "manual_fix_submit",
                "before_snapshot": {"sql": "select region, gmv from sales"},
                "after_snapshot": {"sql": "select region, sum(gmv) from sales group by region"},
                "patch_types": ["sql_override"],
            },
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "manual_fix_submit requires question_text or matched_sql"


def test_create_feedback_event_endpoint_returns_400_for_unsafe_sql_override():
    from apps.query_resource_learning.models import QueryResourceLearningTask

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-1y", status="succeeded"))
    with build_client(session) as client:
        response = client.post(
            "/query-resource-learning/resources/resource-feedback-1y/feedback/events",
            json={
                "actor_account": "tester",
                "event_type": "manual_fix_submit",
                "question_text": "修正 SQL",
                "before_snapshot": {"sql": "select region, gmv from sales"},
                "after_snapshot": {"sql": "delete from sales"},
                "patch_types": ["sql_override"],
            },
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "sql_override only supports single SELECT/WITH statements"


def test_list_patches_endpoint_returns_active_patches():
    from apps.query_resource_learning.models import QueryResourceLearningTask
    from apps.query_resource_learning.service import submit_feedback_event

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-2", status="succeeded"))
    submit_feedback_event(
        session,
        resource_id="resource-feedback-2",
        actor_account="tester",
        payload={
            "event_type": "manual_fix_submit",
            "question_text": "按区域看GMV",
            "matched_sql": "select region, sum(gmv) from sales group by region",
            "before_snapshot": {"sql": "select region, gmv from sales"},
            "after_snapshot": {"sql": "select region, sum(gmv) from sales group by region"},
            "patch_types": ["sql_override"],
        },
    )

    with build_client(session) as client:
        response = client.get(
            "/query-resource-learning/resources/resource-feedback-2/patches",
            params={"status": "active"},
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["resource_id"] == "resource-feedback-2"
    assert body[0]["patch_type"] == "sql_override"
    assert body[0]["status"] == "active"
    assert body[0]["priority"] == 100
    assert body[0]["deactivated_at"] is None
    assert isinstance(body[0]["id"], int)
    assert isinstance(body[0]["source_event_id"], int)
    assert body[0]["match_fingerprint"]
    assert body[0]["activated_at"]


def test_list_patches_endpoint_returns_400_for_invalid_status():
    from apps.query_resource_learning.models import QueryResourceLearningTask

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-invalid", status="succeeded"))

    with build_client(session) as client:
        response = client.get(
            "/query-resource-learning/resources/resource-feedback-invalid/patches",
            params={"status": "invalid_status"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "invalid patch status: invalid_status"


def test_patch_governance_endpoints_require_workspace_admin():
    from apps.query_resource_learning.models import QueryResourceLearningTask

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-guard", status="succeeded"))

    with build_client(
        session,
        current_user=types.SimpleNamespace(
            oid=2,
            account="normal_user",
            weight=0,
            isAdmin=False,
        ),
    ) as client:
        response = client.get("/query-resource-learning/resources/resource-feedback-guard/patches")

    assert response.status_code == 403
    assert response.json()["detail"] == "only workspace admin can access query resource learning governance APIs"


def test_disable_patch_endpoint_updates_status_and_returns_event_no():
    from apps.query_resource_learning.models import (
        QueryResourceLearningPatchSnapshot,
        QueryResourceLearningTask,
    )
    from apps.query_resource_learning.service import submit_feedback_event

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-3", status="succeeded"))
    submit_feedback_event(
        session,
        resource_id="resource-feedback-3",
        actor_account="tester",
        payload={
            "event_type": "manual_fix_submit",
            "question_text": "最近7天GMV",
            "matched_sql": "select sum(gmv) from sales",
            "before_snapshot": {"sql": "select gmv from sales"},
            "after_snapshot": {"sql": "select sum(gmv) from sales"},
            "patch_types": ["sql_override"],
        },
    )
    patch_id = session._items[QueryResourceLearningPatchSnapshot][0].id

    with build_client(session) as client:
        response = client.post(
            f"/query-resource-learning/resources/resource-feedback-3/patches/{patch_id}/disable",
            json={"actor_account": "reviewer", "reason": "manual rollback"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "patch_id": patch_id,
        "resource_id": "resource-feedback-3",
        "disabled": True,
        "event_no": body["event_no"],
    }
    assert body["event_no"].startswith("qrl_")
    assert session._items[QueryResourceLearningPatchSnapshot][0].status == "inactive"


def test_disable_patch_endpoint_returns_404_when_patch_missing():
    from apps.query_resource_learning.models import QueryResourceLearningTask

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-4", status="succeeded"))

    with build_client(session) as client:
        response = client.post(
            "/query-resource-learning/resources/resource-feedback-4/patches/999/disable",
            json={"actor_account": "reviewer"},
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "patch 999 not found for resource resource-feedback-4"


def test_list_feedback_events_endpoint_returns_event_stream():
    from apps.query_resource_learning.models import QueryResourceLearningTask
    from apps.query_resource_learning.service import submit_feedback_event

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-5", status="succeeded"))
    submit_feedback_event(
        session,
        resource_id="resource-feedback-5",
        actor_account="tester",
        payload={"event_type": "downvote", "question_text": "问题A"},
    )
    submit_feedback_event(
        session,
        resource_id="resource-feedback-5",
        actor_account="tester",
        payload={
            "event_type": "execution_failure",
            "question_text": "问题B",
            "error_code": "SQL_EXEC_ERROR",
            "error_message": "syntax error",
        },
    )

    with build_client(session) as client:
        response = client.get("/query-resource-learning/resources/resource-feedback-5/feedback/events")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert {item["event_type"] for item in body} == {"downvote", "execution_failure"}
    assert all(item["resource_id"] == "resource-feedback-5" for item in body)


def test_list_feedback_events_endpoint_supports_event_filters():
    from apps.query_resource_learning.models import (
        QueryResourceLearningFeedbackEvent,
        QueryResourceLearningTask,
    )
    from apps.query_resource_learning.service import submit_feedback_event

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-filter", status="succeeded"))
    submit_feedback_event(
        session,
        resource_id="resource-feedback-filter",
        actor_account="tester",
        payload={
            "event_type": "downvote",
            "source_chat_record_id": 1001,
            "question_text": "问题A",
        },
    )
    submit_feedback_event(
        session,
        resource_id="resource-feedback-filter",
        actor_account="tester",
        payload={
            "event_type": "execution_failure",
            "source_chat_record_id": 1002,
            "question_text": "问题B",
            "error_code": "SQL_EXEC_ERROR",
        },
    )
    events = session._items[QueryResourceLearningFeedbackEvent]
    events[0].created_at = datetime(2026, 4, 25, 10, 0, 0)
    events[1].created_at = datetime(2026, 4, 26, 10, 0, 0)

    with build_client(session) as client:
        by_type_response = client.get(
            "/query-resource-learning/resources/resource-feedback-filter/feedback/events",
            params={"event_type": "execution_failure"},
        )
        by_record_response = client.get(
            "/query-resource-learning/resources/resource-feedback-filter/feedback/events",
            params={"source_chat_record_id": 1001},
        )
        by_time_response = client.get(
            "/query-resource-learning/resources/resource-feedback-filter/feedback/events",
            params={"created_from": "2026-04-26T00:00:00", "created_to": "2026-04-26T23:59:59"},
        )

    assert by_type_response.status_code == 200
    assert [item["event_type"] for item in by_type_response.json()] == ["execution_failure"]
    assert by_record_response.status_code == 200
    assert [item["source_chat_record_id"] for item in by_record_response.json()] == [1001]
    assert by_time_response.status_code == 200
    assert [item["source_chat_record_id"] for item in by_time_response.json()] == [1002]


def test_list_feedback_events_endpoint_returns_400_for_invalid_time_range():
    from apps.query_resource_learning.models import QueryResourceLearningTask

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-time", status="succeeded"))

    with build_client(session) as client:
        response = client.get(
            "/query-resource-learning/resources/resource-feedback-time/feedback/events",
            params={"created_from": "2026-04-27T12:00:00", "created_to": "2026-04-26T12:00:00"},
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "created_from must be less than or equal to created_to"


def test_replay_feedback_event_endpoint_returns_single_event():
    from apps.query_resource_learning.models import QueryResourceLearningTask
    from apps.query_resource_learning.service import submit_feedback_event

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-6", status="succeeded"))
    created = submit_feedback_event(
        session,
        resource_id="resource-feedback-6",
        actor_account="tester",
        payload={"event_type": "downvote", "question_text": "问题C"},
    )

    with build_client(session) as client:
        response = client.get(
            f"/query-resource-learning/resources/resource-feedback-6/feedback/replay/{created['event_no']}"
        )

    assert response.status_code == 200
    body = response.json()
    assert body["event_no"] == created["event_no"]
    assert body["resource_id"] == "resource-feedback-6"
    assert body["event_type"] == "downvote"


def test_replay_feedback_event_endpoint_returns_404_when_event_missing():
    from apps.query_resource_learning.models import QueryResourceLearningTask

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-7", status="succeeded"))

    with build_client(session) as client:
        response = client.get(
            "/query-resource-learning/resources/resource-feedback-7/feedback/replay/missing-event-no"
        )

    assert response.status_code == 404
    assert response.json()["detail"] == "event missing-event-no not found for resource resource-feedback-7"


def test_feedback_metric_endpoint_returns_aggregated_rates():
    from apps.query_resource_learning.models import QueryResourceLearningTask
    from apps.query_resource_learning.service import submit_feedback_event

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-8", status="succeeded"))
    submit_feedback_event(
        session,
        resource_id="resource-feedback-8",
        actor_account="tester",
        payload={"event_type": "downvote"},
    )
    submit_feedback_event(
        session,
        resource_id="resource-feedback-8",
        actor_account="tester",
        payload={"event_type": "execution_failure", "error_message": "runtime error"},
    )

    with build_client(session) as client:
        response = client.get("/query-resource-learning/resources/resource-feedback-8/feedback-metric")

    assert response.status_code == 200
    assert response.json() == {
        "lifetime_total_feedback_count": 2,
        "lifetime_downvote_count": 1,
        "lifetime_failure_count": 1,
        "lifetime_correction_count": 0,
        "window_7d_total_feedback_count": 2,
        "window_7d_downvote_rate": 50,
        "window_7d_failure_rate": 50,
        "window_7d_correction_rate": 0,
        "relearning_suggested": True,
        "trigger_reason": "failure_rate_high",
        "relearning_advice": "近期失败率偏高，建议重新学习并复核字段语义与样本值。",
    }


def test_evaluate_relearning_endpoint_returns_relearning_decision():
    from apps.query_resource_learning.models import QueryResourceLearningTask
    from apps.query_resource_learning.service import submit_feedback_event

    session = FakeSession()
    session.seed(QueryResourceLearningTask(resource_id="resource-feedback-9", status="succeeded"))
    submit_feedback_event(
        session,
        resource_id="resource-feedback-9",
        actor_account="tester",
        payload={"event_type": "downvote"},
    )
    submit_feedback_event(
        session,
        resource_id="resource-feedback-9",
        actor_account="tester",
        payload={"event_type": "execution_failure"},
    )

    with build_client(session) as client:
        response = client.post(
            "/query-resource-learning/resources/resource-feedback-9/feedback/evaluate-relearning"
        )

    assert response.status_code == 200
    body = response.json()
    assert body["resource_id"] == "resource-feedback-9"
    assert body["relearning_suggested"] is True
    assert body["trigger_reason"] == "failure_rate_high"
    assert body["relearning_advice"] == "近期失败率偏高，建议重新学习并复核字段语义与样本值。"
    assert body["metric"]["window_7d_failure_rate"] == 50
    assert body["metric"]["window_7d_downvote_rate"] == 50


def test_query_resource_learning_router_is_registered_in_runtime_api_router():
    saved_modules = install_stubbed_api_dependencies()
    module_name = "test_runtime_apps_api"
    sys.modules.pop(module_name, None)
    with load_learning_router(FakeSession()):
        spec = importlib.util.spec_from_file_location(
            module_name,
            BACKEND_ROOT / "apps" / "api.py",
        )
        module = importlib.util.module_from_spec(spec)

        try:
            assert spec is not None
            assert spec.loader is not None
            spec.loader.exec_module(module)
        finally:
            sys.modules.pop(module_name, None)
            restore_modules(saved_modules)

        app = FastAPI()
        app.include_router(module.api_router)

        assert "/query-resource-learning/resources" in {
            route.path for route in app.routes if hasattr(route, "path")
        }
