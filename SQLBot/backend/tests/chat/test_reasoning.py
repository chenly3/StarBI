import os
import json
import sys
import types
from pathlib import Path

import yaml

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

langchain_core = types.ModuleType("langchain_core")
langchain_messages = types.ModuleType("langchain_core.messages")
langchain_messages.BaseMessage = object


class StubMessage:
    def __init__(self, content="", **kwargs):
        self.content = content
        for key, value in kwargs.items():
            setattr(self, key, value)


langchain_messages.SystemMessage = StubMessage
langchain_messages.HumanMessage = StubMessage
langchain_messages.AIMessage = StubMessage
langchain_messages.BaseMessageChunk = StubMessage
sys.modules.setdefault("langchain_core", langchain_core)
sys.modules.setdefault("langchain_core.messages", langchain_messages)

langchain_chat_models_base = types.ModuleType("langchain.chat_models.base")
langchain_chat_models_base.BaseChatModel = object
sys.modules.setdefault("langchain", types.ModuleType("langchain"))
sys.modules.setdefault("langchain.chat_models", types.ModuleType("langchain.chat_models"))
sys.modules.setdefault("langchain.chat_models.base", langchain_chat_models_base)

langchain_community_utilities = types.ModuleType("langchain_community.utilities")
langchain_community_utilities.SQLDatabase = object
sys.modules.setdefault("langchain_community", types.ModuleType("langchain_community"))
sys.modules.setdefault("langchain_community.utilities", langchain_community_utilities)

def _stub_module(name, attrs=None):
    module = types.ModuleType(name)
    for attr_name, attr_value in (attrs or {}).items():
        setattr(module, attr_name, attr_value)
    sys.modules.setdefault(name, module)
    return module


sqlparse = types.ModuleType("sqlparse")
sqlparse.format = lambda sql, **kwargs: sql
sys.modules.setdefault("sqlparse", sqlparse)

common_utils = types.ModuleType("common.utils.utils")
common_utils.equals_ignore_case = lambda left, right: str(left).lower() == str(right).lower()
common_utils.prepare_for_orjson = lambda value: value


def _extract_nested_json(text):
    import orjson

    stack = []
    start_index = -1
    for index, char in enumerate(text):
        if char in "{[":
            if not stack:
                start_index = index
            stack.append(char)
        elif char in "}]":
            if stack and ((char == "}" and stack[-1] == "{") or (char == "]" and stack[-1] == "[")):
                stack.pop()
                if not stack:
                    json_str = text[start_index:index + 1]
                    try:
                        orjson.loads(json_str)
                        return json_str
                    except Exception:
                        pass
            else:
                stack = []
    return None


common_utils.extract_nested_json = _extract_nested_json
common_utils.SQLBotLogUtil = type("SQLBotLogUtil", (), {"info": staticmethod(lambda *args, **kwargs: None)})
sys.modules.setdefault("common.utils.utils", common_utils)

_stub_module("sqlbot_xpack")
_stub_module("sqlbot_xpack.config")
_stub_module("sqlbot_xpack.config.model", {"SysArgModel": object})
_stub_module("sqlbot_xpack.custom_prompt")
_stub_module("sqlbot_xpack.custom_prompt.curd")
_stub_module("sqlbot_xpack.custom_prompt.curd.custom_prompt", {"find_custom_prompts": lambda *args, **kwargs: []})
_stub_module("sqlbot_xpack.custom_prompt.models")
_stub_module("sqlbot_xpack.custom_prompt.models.custom_prompt_model", {"CustomPromptTypeEnum": object})
_stub_module("sqlbot_xpack.license")
_stub_module("sqlbot_xpack.license.license_manage", {"SQLBotLicenseUtil": object})

_stub_module(
    "apps.ai_model.model_factory",
    {"LLMConfig": object, "LLMFactory": object, "get_model_config": lambda *args, **kwargs: None},
)
_stub_module(
    "apps.chat.curd.chat",
    {
        name: (lambda *args, **kwargs: None)
        for name in [
            "save_question",
            "save_sql_answer",
            "save_sql",
            "save_error_message",
            "save_sql_exec_data",
            "save_chart_answer",
            "save_chart",
            "finish_record",
            "save_analysis_answer",
            "save_predict_answer",
            "save_predict_data",
            "save_select_datasource_answer",
            "save_recommend_question_answer",
            "get_old_questions",
            "save_analysis_predict_record",
            "rename_chat",
            "get_chart_config",
            "get_chat_chart_data",
            "list_generate_sql_logs",
            "list_generate_chart_logs",
            "start_log",
            "end_log",
            "get_last_execute_sql_error",
            "format_json_data",
            "format_chart_fields",
            "get_chat_brief_generate",
            "get_chat_predict_data",
            "get_chat_chart_config",
            "trigger_log_error",
        ]
    },
)
_stub_module(
    "apps.chat.task.clarification",
    {
        name: (lambda *args, **kwargs: None)
        for name in [
            "build_clarification_payload",
            "build_execution_summary",
            "detect_time_range",
            "infer_failure_stage",
            "infer_dimension_candidates",
            "infer_metric_candidates",
            "infer_query_interpretation",
            "should_request_clarification",
        ]
    },
)
_stub_module("apps.data_training.curd.data_training", {"get_training_template": lambda *args, **kwargs: None})
_stub_module("apps.datasource.crud.datasource", {"get_table_schema": lambda *args, **kwargs: None})
_stub_module(
    "apps.datasource.crud.permission",
    {"get_row_permission_filters": lambda *args, **kwargs: None, "is_normal_user": lambda *args, **kwargs: False},
)
_stub_module("apps.datasource.embedding.ds_embedding", {"get_ds_embedding": lambda *args, **kwargs: None})
_stub_module("apps.datasource.models.datasource", {"CoreDatasource": object})
_stub_module(
    "apps.db.db",
    {
        "exec_sql": lambda *args, **kwargs: None,
        "get_version": lambda *args, **kwargs: None,
        "check_connection": lambda *args, **kwargs: True,
    },
)
_stub_module("apps.query_resource_learning.models", {"QueryResourceLearningResult": object})
_stub_module(
    "apps.query_resource_learning.service",
    {
        "find_active_sql_override_patch": lambda *args, **kwargs: None,
        "record_patch_apply_log": lambda *args, **kwargs: None,
    },
)
_stub_module(
    "apps.system.crud.assistant",
    {"AssistantOutDs": object, "AssistantOutDsFactory": object, "get_assistant_ds": lambda *args, **kwargs: None},
)
_stub_module("apps.system.crud.parameter_manage", {"get_groups": lambda *args, **kwargs: []})
_stub_module("apps.system.schemas.system_schema", {"AssistantOutDsSchema": object})
_stub_module("apps.terminology.curd.terminology", {"get_terminology_template": lambda *args, **kwargs: None})
_stub_module(
    "common.core.config",
    {
        "settings": types.SimpleNamespace(
            GENERATE_SQL_QUERY_LIMIT_ENABLED=False,
            GENERATE_SQL_QUERY_HISTORY_ROUND_COUNT=5,
            TABLE_EMBEDDING_ENABLED=False,
            MCP_IMAGE_PATH="/tmp",
            MCP_IMAGE_HOST="http://example.invalid",
            SERVER_IMAGE_TIMEOUT=1,
            SERVER_IMAGE_HOST="http://example.invalid",
            PARSE_REASONING_BLOCK_ENABLED=False,
            DEFAULT_REASONING_CONTENT_START="<think>",
            DEFAULT_REASONING_CONTENT_END="</think>",
        )
    },
)
_stub_module("common.core.db", {"engine": None})
_stub_module("common.core.deps", {"CurrentAssistant": object, "CurrentUser": object})
_stub_module(
    "common.error",
    {
        "SingleMessageError": Exception,
        "SQLBotDBError": Exception,
        "ParseSQLResultError": Exception,
        "SQLBotDBConnectionError": Exception,
    },
)
_stub_module("common.utils.data_format", {"DataFormat": object})
_stub_module("common.utils.locale", {"I18n": lambda: None, "I18nHelper": object})

from apps.chat.models.chat_model import AiModelQuestion, build_sql_system_messages
from apps.chat.task.llm import build_reasoning_stream_event, parse_reasoning_from_response


def test_template_includes_reasoning_instruction():
    path = os.path.join(os.path.dirname(__file__), "../../templates/template.yaml")
    with open(path) as f:
        template = yaml.safe_load(f)
    assert "reasoning" in template, "template.yaml 缺少 reasoning 指令"
    assert "instruction" in template["reasoning"]
    assert "时间范围" in template["reasoning"]["instruction"]
    assert "最终回答JSON的一部分" in template["reasoning"]["instruction"]
    assert "禁止在最终回答JSON之前或之后单独输出额外JSON块" in template["reasoning"]["instruction"]


def test_sql_system_prompt_includes_reasoning_instruction():
    question = AiModelQuestion(question="近30天销售额趋势", engine="mysql", db_schema="Table sales")

    prompt_parts = question.sql_sys_question(db_type="mysql")

    assembled_prompt = "\n".join(prompt_parts.values())
    assert "最终回答JSON的一部分" in assembled_prompt
    assert "禁止在最终回答JSON之前或之后单独输出额外JSON块" in assembled_prompt
    assert "时间范围" in assembled_prompt


def test_sql_runtime_messages_append_reasoning_instruction():
    system_templates = {
        "system": "system prompt",
        "rules": "rules prompt",
        "reasoning": "reasoning prompt 时间范围",
        "schema": "schema prompt",
    }

    messages = build_sql_system_messages(system_templates)

    message_contents = [message.content for message in messages]
    assert "reasoning prompt 时间范围" in message_contents
    reasoning_index = message_contents.index("reasoning prompt 时间范围")
    assert message_contents[reasoning_index + 1] == "我已确认会将 reasoning 放入最终JSON回答中，不会单独输出额外JSON块。"


def test_template_removes_ban_on_clarification():
    path = os.path.join(os.path.dirname(__file__), "../../templates/template.yaml")
    with open(path) as f:
        content = f.read()
    assert "禁止要求额外信息" not in content
    assert "即使查询条件不完整" not in content
    assert "则忽略数据源的信息" not in content
    assert "列出候选供用户选择" in content


def test_parse_reasoning_from_final_sql_answer_json():
    response_text = """
    {
      "success": true,
      "reasoning": {
        "time_range": {"value": "本月", "confidence": "high"},
        "metrics": [{"value": "销售额"}]
      },
      "sql": "select sum(amount) from orders"
    }
    """

    reasoning = parse_reasoning_from_response(response_text)

    assert reasoning["time_range"]["value"] == "本月"
    assert reasoning["metrics"][0]["value"] == "销售额"


def test_parse_reasoning_from_response_returns_none_for_invalid_or_missing_reasoning():
    assert parse_reasoning_from_response("not json") is None
    assert parse_reasoning_from_response('{"success": true, "sql": "select 1"}') is None
    assert parse_reasoning_from_response('{"success": true, "reasoning": [], "sql": "select 1"}') is None


def test_build_reasoning_stream_event_uses_existing_data_event_format():
    event = build_reasoning_stream_event(
        '{"success": true, "reasoning": {"time_range": {"value": "本月"}}, "sql": "select 1"}'
    )

    assert event is not None
    assert event.startswith("data:")
    assert event.endswith("\n\n")
    payload = json.loads(event.removeprefix("data:"))
    assert payload["type"] == "reasoning"
    assert payload["content"]["time_range"]["value"] == "本月"
