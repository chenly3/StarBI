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
sys.modules.setdefault("langchain_core", langchain_core)
sys.modules.setdefault("langchain_core.messages", langchain_messages)

common_utils = types.ModuleType("common.utils.utils")
common_utils.equals_ignore_case = lambda left, right: str(left).lower() == str(right).lower()
sys.modules.setdefault("common.utils.utils", common_utils)

from apps.chat.models.chat_model import AiModelQuestion, build_sql_system_messages
from apps.chat.task.reasoning import build_reasoning_stream_event, parse_reasoning_from_response


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
    assert parse_reasoning_from_response('```json\n{"debug": "not reasoning"}\n```') is None


def test_parse_reasoning_from_response_handles_braces_in_sql_string():
    response_text = (
        '{"success": true, '
        '"reasoning": {"time_range": {"value": "本月"}}, '
        '"sql": "select \'{\' as marker"}'
    )

    reasoning = parse_reasoning_from_response(response_text)

    assert reasoning["time_range"]["value"] == "本月"


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
