import ast
import importlib
import sys
import types
from pathlib import Path
from typing import Any, Optional


BACKEND_ROOT = Path(__file__).resolve().parents[2]
LLM_PATH = BACKEND_ROOT / "apps" / "chat" / "task" / "llm.py"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def load_llm_functions(*function_names: str) -> dict[str, Any]:
    from sqlmodel import Session, select
    from apps.query_resource_learning.models import QueryResourceLearningResult

    source = LLM_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    selected = [
        node
        for node in tree.body
        if isinstance(node, ast.FunctionDef) and node.name in function_names
    ]
    found_names = {node.name for node in selected}
    missing = [name for name in function_names if name not in found_names]
    if missing:
        raise AssertionError(f"Missing functions in llm.py: {missing}")

    module = ast.Module(body=selected, type_ignores=[])
    namespace: dict[str, Any] = {
        "Any": Any,
        "Optional": Optional,
        "Session": Session,
        "select": select,
        "QueryResourceLearningResult": QueryResourceLearningResult,
    }
    exec(compile(ast.fix_missing_locations(module), str(LLM_PATH), "exec"), namespace)
    return {name: namespace[name] for name in function_names}


def get_llm_init_messages_source() -> str:
    source = LLM_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == "LLMService":
            for child in node.body:
                if isinstance(child, ast.FunctionDef) and child.name == "init_messages":
                    return ast.unparse(child)
    raise AssertionError("LLMService.init_messages not found")


def get_llm_run_task_source() -> str:
    source = LLM_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == "LLMService":
            for child in node.body:
                if isinstance(child, ast.FunctionDef) and child.name == "run_task":
                    return ast.unparse(child)
    raise AssertionError("LLMService.run_task not found")


def load_llm_method(method_name: str):
    source = LLM_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == "LLMService":
            for child in node.body:
                if isinstance(child, ast.FunctionDef) and child.name == method_name:
                    module = ast.Module(body=[child], type_ignores=[])
                    namespace: dict[str, Any] = {
                        "Session": object,
                        "Any": Any,
                        "List": list,
                    }
                    exec(compile(ast.fix_missing_locations(module), str(LLM_PATH), "exec"), namespace)
                    return namespace[method_name]
    raise AssertionError(f"LLMService.{method_name} not found")


class FakeResult:
    def __init__(self, items: list[Any]):
        self._items = list(items)

    def all(self) -> list[Any]:
        return list(self._items)

    def first(self) -> Any:
        return self._items[0] if self._items else None


class FakeRow:
    def __init__(self, item: Any):
        self._item = item
        self._mapping = {"QueryResourceLearningResult": item}


def unwrap_fake_row(item: Any) -> Any:
    return getattr(item, "_item", item)


class FakeRecommendedSession:
    def __init__(self, *, datasource_base: Any, manual_problems: list[Any], learning_results: list[Any]):
        self.datasource_base = datasource_base
        self.manual_problems = list(manual_problems)
        self.learning_results = list(learning_results)

    def exec(self, statement: Any) -> FakeResult:
        entity = statement.column_descriptions[0]["entity"]
        column_names = [desc["name"] for desc in statement.column_descriptions]
        criteria = list(statement._where_criteria)

        if entity.__name__ == "CoreDatasource":
            if not criteria:
                return FakeResult([])
            datasource_id = criteria[0].right.value
            if self.datasource_base and self.datasource_base.id == datasource_id:
                return FakeResult([self.datasource_base])
            return FakeResult([])

        if entity.__name__ == "DsRecommendedProblem":
            datasource_id = criteria[0].right.value if criteria else None
            rows = [
                item for item in self.manual_problems
                if datasource_id is None or item.datasource_id == datasource_id
            ]
            if column_names == ["question"]:
                return FakeResult([item.question for item in rows])
            return FakeResult(rows)

        if entity.__name__ == "QueryResourceLearningResult":
            resource_id = criteria[0].right.value if criteria else None
            rows = [
                item for item in self.learning_results
                if resource_id is None or unwrap_fake_row(item).resource_id == resource_id
            ]
            return FakeResult(rows)

        raise AssertionError(f"Unsupported statement entity: {entity}")


class FakeLearningSession:
    def __init__(self, learning_results: list[Any]):
        self.learning_results = list(learning_results)

    def exec(self, statement: Any) -> FakeResult:
        model = statement.column_descriptions[0]["entity"]
        if model.__name__ != "QueryResourceLearningResult":
            raise AssertionError(f"Unsupported statement entity: {model}")

        criteria = list(statement._where_criteria)
        resource_id = criteria[0].right.value if criteria else None
        rows = [
            item for item in self.learning_results
            if resource_id is None or unwrap_fake_row(item).resource_id == resource_id
        ]
        return FakeResult(rows)


def import_recommended_problem_module():
    module_name = "apps.datasource.crud.recommended_problem"
    saved_deps = sys.modules.get("common.core.deps")
    saved_module = sys.modules.get(module_name)
    stub_deps = types.ModuleType("common.core.deps")
    stub_deps.SessionDep = object
    stub_deps.CurrentUser = object
    stub_deps.Trans = object
    sys.modules["common.core.deps"] = stub_deps
    sys.modules.pop(module_name, None)
    try:
        module = importlib.import_module(module_name)
    finally:
        if saved_module is not None:
            sys.modules[module_name] = saved_module
        else:
            sys.modules.pop(module_name, None)

        if saved_deps is not None:
            sys.modules["common.core.deps"] = saved_deps
        else:
            sys.modules.pop("common.core.deps", None)
    return module


def test_build_learning_context_block_renders_runtime_learning_assets():
    functions = load_llm_functions("build_learning_context_block")
    build_learning_context_block = functions["build_learning_context_block"]

    context_block = build_learning_context_block(
        resource_name="销售数据集",
        terminology_mappings=[
            {"term": "GMV", "field": "sales_amount"},
            {"term": "大客户", "value": "customer_level=VIP"},
        ],
        sample_values=[
            {"field": "region", "values": ["华东", "华南"]},
            {"field": "channel", "value": "直营网"},
        ],
        sql_examples=[
            {
                "question": "最近30天华东 GMV",
                "sql": "SELECT SUM(sales_amount) FROM sales WHERE region = '华东'",
            }
        ],
    )

    assert "<learning-context>" in context_block
    assert "资源名称" in context_block
    assert "销售数据集" in context_block
    assert "术语映射" in context_block
    assert "GMV" in context_block
    assert "值样本" in context_block
    assert "region" in context_block
    assert "SQL 示例" in context_block
    assert "SELECT SUM(sales_amount)" in context_block


def test_build_learning_context_block_returns_empty_without_assets():
    functions = load_llm_functions("build_learning_context_block")
    build_learning_context_block = functions["build_learning_context_block"]

    context_block = build_learning_context_block(
        resource_name="",
        terminology_mappings=[],
        sample_values=[],
        sql_examples=[],
    )

    assert context_block == ""


def test_llm_init_messages_wires_learning_context_into_sql_prompt_chain():
    from apps.query_resource_learning.models import QueryResourceLearningResult

    functions = load_llm_functions(
        "build_learning_context_block",
        "build_learning_context_messages",
        "load_runtime_learning_context_block",
    )
    init_messages = load_llm_method("init_messages")

    class FakePromptMessage:
        def __init__(self, content: str):
            self.content = content

    namespace = init_messages.__globals__
    namespace["SystemPromptMessage"] = FakePromptMessage
    namespace["HumanPromptMessage"] = FakePromptMessage
    namespace["AIPromptMessage"] = FakePromptMessage
    namespace["HumanMessage"] = FakePromptMessage
    namespace["AIMessage"] = FakePromptMessage
    namespace["get_last_conversation_rounds"] = lambda messages, rounds: []
    namespace["load_runtime_learning_context_block"] = functions["load_runtime_learning_context_block"]
    namespace["build_learning_context_messages"] = functions["build_learning_context_messages"]

    class FakeChatQuestion:
        regenerate_record_id = None
        datasource_id = 12

        @staticmethod
        def sql_sys_question(_engine_type: str, _limit_enabled: bool):
            return {
                "system": "system",
                "rules": "rules",
                "schema": "schema",
            }

        @staticmethod
        def chart_sys_question():
            return {
                "system": "chart-system",
                "rules": "chart-rules",
            }

    class FakeService:
        def __init__(self):
            self.sql_message = []
            self.chart_message = []
            self.generate_sql_logs = []
            self.generate_chart_logs = []
            self.base_message_round_count_limit = 0
            self.enable_sql_row_limit = False
            self.chat_question = FakeChatQuestion()
            self.ds = types.SimpleNamespace(type="postgresql", id=12)

        @staticmethod
        def choose_table_schema(_session: Any):
            return None

    session = FakeLearningSession(
        [
            QueryResourceLearningResult(
                resource_id="12",
                semantic_profile={
                    "dataset_name": "销售数据集",
                    "terminology_mappings": [{"term": "GMV", "target": "sales_amount"}],
                    "sql_examples": [{"question": "最近30天 GMV", "sql": "select 1"}],
                },
                sample_values=[{"field": "region", "values": ["华东", "华南"]}],
            )
        ]
    )
    service = FakeService()

    init_messages(service, session)

    joined_sql_messages = "\n".join(message.content for message in service.sql_message)
    assert "<learning-context>" in joined_sql_messages
    assert "销售数据集" in joined_sql_messages
    assert "GMV" in joined_sql_messages
    assert "华东" in joined_sql_messages
    assert "select 1" in joined_sql_messages


def test_get_datasource_recommended_chart_falls_back_to_learning_questions():
    from apps.datasource.models.datasource import CoreDatasource
    from apps.query_resource_learning.models import QueryResourceLearningResult

    recommended_problem = import_recommended_problem_module()
    session = FakeRecommendedSession(
        datasource_base=CoreDatasource(
            id=9,
            name="Sales",
            description="",
            type="postgresql",
            type_name="PostgreSQL",
            configuration="{}",
            create_by=1,
            status="active",
            num="1",
            oid=1,
            table_relation=[],
            embedding="",
            recommended_config=2,
        ),
        manual_problems=[],
        learning_results=[
            QueryResourceLearningResult(
                resource_id="datasource:9",
                recommended_questions=[
                    {"question": "最近30天 GMV 是多少"},
                    "本月订单量是多少",
                ],
            )
        ],
    )

    questions = recommended_problem.get_datasource_recommended_chart(session, 9)

    assert questions == ["最近30天 GMV 是多少", "本月订单量是多少"]


def test_get_datasource_recommended_falls_back_to_learning_questions():
    from apps.datasource.models.datasource import DsRecommendedProblem
    from apps.query_resource_learning.models import QueryResourceLearningResult

    recommended_problem = import_recommended_problem_module()
    session = FakeRecommendedSession(
        datasource_base=None,
        manual_problems=[],
        learning_results=[
            QueryResourceLearningResult(
                resource_id="datasource:15",
                recommended_questions=["本月 GMV", {"question": "退款订单数"}],
            )
        ],
    )

    questions = recommended_problem.get_datasource_recommended(session, 15)

    assert [item.question for item in questions] == ["本月 GMV", "退款订单数"]
    assert all(isinstance(item, DsRecommendedProblem) for item in questions)


def test_get_datasource_recommended_base_serializes_learning_questions_when_manual_is_empty():
    from apps.datasource.models.datasource import CoreDatasource
    from apps.query_resource_learning.models import QueryResourceLearningResult

    recommended_problem = import_recommended_problem_module()
    session = FakeRecommendedSession(
        datasource_base=CoreDatasource(
            id=12,
            name="Orders",
            description="",
            type="postgresql",
            type_name="PostgreSQL",
            configuration="{}",
            create_by=1,
            status="active",
            num="1",
            oid=1,
            table_relation=[],
            embedding="",
            recommended_config=2,
        ),
        manual_problems=[],
        learning_results=[
            QueryResourceLearningResult(
                resource_id="12",
                recommended_questions=["本周订单总额", {"title": "退款订单数量"}],
            )
        ],
    )

    result = recommended_problem.get_datasource_recommended_base(session, 12)

    assert result.datasource_id == 12
    assert result.recommended_config == 2
    assert result.questions == '["本周订单总额","退款订单数量"]'


def test_learning_runtime_prefers_newest_result_across_legacy_and_current_resource_ids():
    from apps.query_resource_learning.models import QueryResourceLearningResult

    functions = load_llm_functions(
        "build_learning_context_block",
        "load_runtime_learning_context_block",
    )
    load_runtime_learning_context_block = functions["load_runtime_learning_context_block"]

    session = FakeLearningSession(
        [
            QueryResourceLearningResult(
                id=10,
                resource_id="datasource:9",
                semantic_profile={"dataset_name": "旧销售数据集"},
                sample_values=[],
            ),
            QueryResourceLearningResult(
                id=20,
                resource_id="9",
                semantic_profile={"dataset_name": "新销售数据集"},
                sample_values=[],
            ),
        ]
    )

    context_block = load_runtime_learning_context_block(session, 9)

    assert "新销售数据集" in context_block
    assert "旧销售数据集" not in context_block


def test_learning_runtime_unwraps_sqlalchemy_row_learning_results():
    from apps.query_resource_learning.models import QueryResourceLearningResult

    functions = load_llm_functions(
        "build_learning_context_block",
        "load_runtime_learning_context_block",
    )
    load_runtime_learning_context_block = functions["load_runtime_learning_context_block"]

    session = FakeLearningSession(
        [
            FakeRow(
                QueryResourceLearningResult(
                    id=30,
                    resource_id="datasource:9001",
                    semantic_profile={
                        "dataset_name": "公有云账单集合",
                        "terminology_mappings": [{"term": "应付金额", "target": "payable_amount"}],
                    },
                    sample_values=[{"field": "账期", "values": ["2026-04"]}],
                )
            )
        ]
    )

    context_block = load_runtime_learning_context_block(session, 9001)

    assert "公有云账单集合" in context_block
    assert "应付金额" in context_block
    assert "2026-04" in context_block


def test_llm_run_task_checks_learning_sql_override_before_llm_generation():
    source = get_llm_run_task_source()

    override_index = source.find("try_apply_learning_sql_override")
    generate_sql_index = source.find("self.generate_sql")

    assert override_index >= 0
    assert generate_sql_index >= 0
    assert override_index < generate_sql_index


def test_learning_recommended_questions_prefer_newest_result_across_legacy_and_current_resource_ids():
    from apps.query_resource_learning.models import QueryResourceLearningResult

    recommended_problem = import_recommended_problem_module()
    session = FakeRecommendedSession(
        datasource_base=None,
        manual_problems=[],
        learning_results=[
            QueryResourceLearningResult(
                id=10,
                resource_id="datasource:18",
                recommended_questions=["旧问题"],
            ),
            QueryResourceLearningResult(
                id=20,
                resource_id="18",
                recommended_questions=["新问题"],
            ),
        ],
    )

    questions = recommended_problem.get_datasource_recommended_chart(session, 18)

    assert questions == ["新问题"]
