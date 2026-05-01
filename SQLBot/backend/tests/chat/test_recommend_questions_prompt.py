import importlib
import enum
import json
import sys
import types
from pathlib import Path

import orjson

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def load_llm_module(monkeypatch):
    sqlparse = types.ModuleType("sqlparse")
    sqlparse.format = lambda sql, **kwargs: sql
    monkeypatch.setitem(sys.modules, "sqlparse", sqlparse)

    langchain_chat_models_base = types.ModuleType("langchain.chat_models.base")
    langchain_chat_models_base.BaseChatModel = object
    monkeypatch.setitem(sys.modules, "langchain", types.ModuleType("langchain"))
    monkeypatch.setitem(sys.modules, "langchain.chat_models", types.ModuleType("langchain.chat_models"))
    monkeypatch.setitem(sys.modules, "langchain.chat_models.base", langchain_chat_models_base)

    langchain_community_utilities = types.ModuleType("langchain_community.utilities")
    langchain_community_utilities.SQLDatabase = object
    monkeypatch.setitem(sys.modules, "langchain_community", types.ModuleType("langchain_community"))
    monkeypatch.setitem(sys.modules, "langchain_community.utilities", langchain_community_utilities)

    langchain_messages = types.ModuleType("langchain_core.messages")

    class StubMessage:
        def __init__(self, content="", **kwargs):
            self.content = content
            self.type = self.__class__.__name__.lower()
            for key, value in kwargs.items():
                setattr(self, key, value)

    langchain_messages.BaseMessage = StubMessage
    langchain_messages.SystemMessage = StubMessage
    langchain_messages.HumanMessage = StubMessage
    langchain_messages.AIMessage = StubMessage
    langchain_messages.BaseMessageChunk = StubMessage
    monkeypatch.setitem(sys.modules, "langchain_core", types.ModuleType("langchain_core"))
    monkeypatch.setitem(sys.modules, "langchain_core.messages", langchain_messages)

    xpack_config_model = types.ModuleType("sqlbot_xpack.config.model")
    xpack_config_model.SysArgModel = object
    monkeypatch.setitem(sys.modules, "sqlbot_xpack", types.ModuleType("sqlbot_xpack"))
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.config", types.ModuleType("sqlbot_xpack.config"))
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.config.model", xpack_config_model)

    custom_prompt_crud = types.ModuleType("sqlbot_xpack.custom_prompt.curd.custom_prompt")
    custom_prompt_crud.find_custom_prompts = lambda *args, **kwargs: []
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.custom_prompt", types.ModuleType("sqlbot_xpack.custom_prompt"))
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.custom_prompt.curd", types.ModuleType("sqlbot_xpack.custom_prompt.curd"))
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.custom_prompt.curd.custom_prompt", custom_prompt_crud)

    custom_prompt_model = types.ModuleType("sqlbot_xpack.custom_prompt.models.custom_prompt_model")
    custom_prompt_model.CustomPromptTypeEnum = types.SimpleNamespace(
        ANALYSIS="analysis",
        PREDICT_DATA="predict_data",
        GENERATE_SQL="generate_sql",
    )
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.custom_prompt.models", types.ModuleType("sqlbot_xpack.custom_prompt.models"))
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.custom_prompt.models.custom_prompt_model", custom_prompt_model)

    license_manage = types.ModuleType("sqlbot_xpack.license.license_manage")
    license_manage.SQLBotLicenseUtil = types.SimpleNamespace(valid=lambda: False)
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.license", types.ModuleType("sqlbot_xpack.license"))
    monkeypatch.setitem(sys.modules, "sqlbot_xpack.license.license_manage", license_manage)

    model_factory = types.ModuleType("apps.ai_model.model_factory")
    model_factory.LLMConfig = object
    model_factory.LLMFactory = types.SimpleNamespace(create_llm=lambda *args, **kwargs: None)
    model_factory.get_model_config = lambda *args, **kwargs: None
    monkeypatch.setitem(sys.modules, "apps.ai_model.model_factory", model_factory)

    chat_crud = types.ModuleType("apps.chat.curd.chat")
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
    ]:
        setattr(chat_crud, name, lambda *args, **kwargs: None)
    monkeypatch.setitem(sys.modules, "apps.chat.curd.chat", chat_crud)

    chat_model = types.ModuleType("apps.chat.models.chat_model")

    class OperationEnum(enum.Enum):
        GENERATE_RECOMMENDED_QUESTIONS = "generate_recommended_questions"
        PREDICT_DATA = "predict_data"

    class StubPromptMessage(StubMessage):
        pass

    for name in [
        "ChatQuestion",
        "ChatRecord",
        "Chat",
        "RenameChat",
        "ChatLog",
        "AxisObj",
    ]:
        setattr(chat_model, name, type(name, (), {}))
    chat_model.ChatFinishStep = types.SimpleNamespace(
        GENERATE_SQL=types.SimpleNamespace(value=1),
        QUERY_DATA=types.SimpleNamespace(value=2),
        GENERATE_CHART=types.SimpleNamespace(value=3),
    )
    chat_model.OperationEnum = OperationEnum
    chat_model.SystemPromptMessage = StubPromptMessage
    chat_model.HumanPromptMessage = StubPromptMessage
    chat_model.AIPromptMessage = StubPromptMessage
    chat_model.build_sql_system_messages = lambda *args, **kwargs: []
    monkeypatch.setitem(sys.modules, "apps.chat.models.chat_model", chat_model)

    clarification = types.ModuleType("apps.chat.task.clarification")
    for name in [
        "build_clarification_payload",
        "build_execution_summary",
        "detect_time_range",
        "infer_failure_stage",
        "infer_dimension_candidates",
        "infer_metric_candidates",
        "infer_query_interpretation",
        "should_request_clarification",
    ]:
        setattr(clarification, name, lambda *args, **kwargs: None)
    monkeypatch.setitem(sys.modules, "apps.chat.task.clarification", clarification)

    reasoning = types.ModuleType("apps.chat.task.reasoning")
    reasoning.build_reasoning_stream_event = lambda *args, **kwargs: None
    monkeypatch.setitem(sys.modules, "apps.chat.task.reasoning", reasoning)

    data_training = types.ModuleType("apps.data_training.curd.data_training")
    data_training.get_training_template = lambda *args, **kwargs: None
    monkeypatch.setitem(sys.modules, "apps.data_training.curd.data_training", data_training)

    datasource_crud = types.ModuleType("apps.datasource.crud.datasource")
    datasource_crud.get_table_schema = lambda *args, **kwargs: ""
    monkeypatch.setitem(sys.modules, "apps.datasource.crud.datasource", datasource_crud)
    permission_crud = types.ModuleType("apps.datasource.crud.permission")
    permission_crud.get_row_permission_filters = lambda *args, **kwargs: []
    permission_crud.is_normal_user = lambda *args, **kwargs: True
    monkeypatch.setitem(sys.modules, "apps.datasource.crud.permission", permission_crud)
    ds_embedding = types.ModuleType("apps.datasource.embedding.ds_embedding")
    ds_embedding.get_ds_embedding = lambda *args, **kwargs: []
    monkeypatch.setitem(sys.modules, "apps.datasource.embedding.ds_embedding", ds_embedding)
    datasource_model = types.ModuleType("apps.datasource.models.datasource")
    datasource_model.CoreDatasource = type("CoreDatasource", (), {})
    monkeypatch.setitem(sys.modules, "apps.datasource.models.datasource", datasource_model)

    db_module = types.ModuleType("apps.db.db")
    for name in ["exec_sql", "get_version", "check_connection"]:
        setattr(db_module, name, lambda *args, **kwargs: None)
    monkeypatch.setitem(sys.modules, "apps.db.db", db_module)

    qrl_models = types.ModuleType("apps.query_resource_learning.models")
    qrl_models.QueryResourceLearningResult = type("QueryResourceLearningResult", (), {})
    monkeypatch.setitem(sys.modules, "apps.query_resource_learning.models", qrl_models)
    qrl_service = types.ModuleType("apps.query_resource_learning.service")
    qrl_service.find_active_sql_override_patch = lambda *args, **kwargs: None
    qrl_service.record_patch_apply_log = lambda *args, **kwargs: None
    monkeypatch.setitem(sys.modules, "apps.query_resource_learning.service", qrl_service)

    assistant = types.ModuleType("apps.system.crud.assistant")
    assistant.AssistantOutDs = type("AssistantOutDs", (), {})
    assistant.AssistantOutDsFactory = types.SimpleNamespace(get_instance=lambda *args, **kwargs: None)
    assistant.get_assistant_ds = lambda *args, **kwargs: []
    monkeypatch.setitem(sys.modules, "apps.system.crud.assistant", assistant)
    parameter_manage = types.ModuleType("apps.system.crud.parameter_manage")
    parameter_manage.get_groups = lambda *args, **kwargs: []
    monkeypatch.setitem(sys.modules, "apps.system.crud.parameter_manage", parameter_manage)
    system_schema = types.ModuleType("apps.system.schemas.system_schema")
    system_schema.AssistantOutDsSchema = type("AssistantOutDsSchema", (), {})
    monkeypatch.setitem(sys.modules, "apps.system.schemas.system_schema", system_schema)

    terminology = types.ModuleType("apps.terminology.curd.terminology")
    terminology.get_terminology_template = lambda *args, **kwargs: ""
    monkeypatch.setitem(sys.modules, "apps.terminology.curd.terminology", terminology)

    common_config = types.ModuleType("common.core.config")
    common_config.settings = types.SimpleNamespace(
        PARSE_REASONING_BLOCK_ENABLED=False,
        DEFAULT_REASONING_CONTENT_START="<think>",
        DEFAULT_REASONING_CONTENT_END="</think>",
        GENERATE_SQL_QUERY_HISTORY_ROUND_COUNT=3,
        GENERATE_SQL_QUERY_LIMIT_ENABLED=True,
        TABLE_EMBEDDING_ENABLED=False,
        MCP_IMAGE_PATH="/tmp",
        MCP_IMAGE_HOST="http://localhost/",
        SERVER_IMAGE_HOST="http://localhost/",
        SERVER_IMAGE_TIMEOUT=1,
    )
    monkeypatch.setitem(sys.modules, "common.core.config", common_config)
    common_db = types.ModuleType("common.core.db")
    common_db.engine = None
    monkeypatch.setitem(sys.modules, "common.core.db", common_db)
    deps = types.ModuleType("common.core.deps")
    deps.CurrentAssistant = object
    deps.CurrentUser = object
    monkeypatch.setitem(sys.modules, "common.core.deps", deps)
    common_error = types.ModuleType("common.error")
    for name in [
        "SingleMessageError",
        "SQLBotDBError",
        "ParseSQLResultError",
        "SQLBotDBConnectionError",
    ]:
        setattr(common_error, name, type(name, (Exception,), {}))
    monkeypatch.setitem(sys.modules, "common.error", common_error)
    data_format = types.ModuleType("common.utils.data_format")
    data_format.DataFormat = type("DataFormat", (), {})
    monkeypatch.setitem(sys.modules, "common.utils.data_format", data_format)
    locale = types.ModuleType("common.utils.locale")
    locale.I18n = lambda *args, **kwargs: None
    locale.I18nHelper = object
    monkeypatch.setitem(sys.modules, "common.utils.locale", locale)
    common_utils = types.ModuleType("common.utils.utils")

    def extract_nested_json(text):
        start = text.find("[")
        end = text.rfind("]")
        if start >= 0 and end > start:
            candidate = text[start:end + 1]
            json.loads(candidate)
            return candidate
        return None

    common_utils.SQLBotLogUtil = types.SimpleNamespace(info=lambda *args, **kwargs: None)
    common_utils.extract_nested_json = extract_nested_json
    common_utils.prepare_for_orjson = lambda value: value
    monkeypatch.setitem(sys.modules, "common.utils.utils", common_utils)

    sys.modules.pop("apps.chat.task.llm", None)
    return importlib.import_module("apps.chat.task.llm")


def test_recommend_prompt_uses_current_result_instead_of_old_question_pool(monkeypatch):
    llm = load_llm_module(monkeypatch)
    service = object.__new__(llm.LLMService)
    service.chat_question = types.SimpleNamespace(question="本月各地区销售额", lang="简体中文", sql="")
    service.record = types.SimpleNamespace(
        question="本月各地区销售额",
        sql="select region, sum(amount) from orders group by region",
        sql_answer='{"content":"华东销售额最高，华北环比下降"}',
        data='[{"region":"华东","sales":1200},{"region":"华北","sales":600}]',
        chart_answer="",
        analysis="华北出现明显下滑，需要进一步归因",
        predict="",
    )

    messages = service._build_recommend_questions_messages()
    combined_prompt = "\n".join(message.content for message in messages)

    assert "基于当前分析结果" in combined_prompt
    assert "结果摘要" in combined_prompt
    assert "华北出现明显下滑" in combined_prompt
    assert "以往提问" not in combined_prompt
    assert "old_questions" not in combined_prompt


def test_recommend_prompt_requires_executable_schema_fields(monkeypatch):
    llm = load_llm_module(monkeypatch)
    service = object.__new__(llm.LLMService)
    service.chat_question = types.SimpleNamespace(
        question="茶饮订单明细中按品线统计销售金额，哪个品线销售金额最高？",
        lang="简体中文",
        sql="",
        db_schema="字段: 品线, 菜品名称, 销售日期, 销售金额, 销售数量, 客单价"
    )
    service.record = types.SimpleNamespace(
        question="茶饮订单明细中按品线统计销售金额，哪个品线销售金额最高？",
        sql="select 品线, sum(销售金额) from 茶饮订单明细 group by 品线",
        sql_answer='{"content":"浓郁椰奶销售金额最高"}',
        data='[{"品线":"浓郁椰奶","销售金额":36424},{"品线":"超大果茶","销售金额":34083}]',
        chart_answer="品线销售金额统计",
        analysis="浓郁椰奶位居第一，超大果茶紧随其后",
        predict="",
    )

    messages = service._build_recommend_questions_messages()
    combined_prompt = "\n".join(message.content for message in messages)

    assert "可用字段" in combined_prompt
    assert "菜品名称" in combined_prompt
    assert "不要使用产品、商品等未在字段列表中出现的泛化词" in combined_prompt
    assert "每个问题必须能直接生成 SQL" in combined_prompt


def test_normalize_recommend_questions_content_converts_line_output_to_json(monkeypatch):
    llm = load_llm_module(monkeypatch)

    result = llm.LLMService._normalize_recommend_questions_content(
        "1. 华北销售额下降主要来自哪些产品线？\n"
        "2. 华东高销售额是否集中在少数客户？\n"
        "3. 下月各地区销售额预计如何变化？\n"
        "4. 不应保留第四个问题"
    )

    assert orjson.loads(result) == [
        "华北销售额下降主要来自哪些产品线？",
        "华东高销售额是否集中在少数客户？",
        "下月各地区销售额预计如何变化？",
    ]


def test_normalize_recommend_questions_content_limits_json_output_to_three(monkeypatch):
    llm = load_llm_module(monkeypatch)

    result = llm.LLMService._normalize_recommend_questions_content(
        '["问题一", "问题二", "问题三", "问题四"]'
    )

    assert orjson.loads(result) == ["问题一", "问题二", "问题三"]


def test_load_recommend_result_context_adds_full_record_fields(monkeypatch):
    llm = load_llm_module(monkeypatch)
    service = object.__new__(llm.LLMService)
    service.record = types.SimpleNamespace(id=9, question="精简问题")
    for field in (
        "id",
        "question",
        "sql",
        "sql_answer",
        "data",
        "chart_answer",
        "analysis",
        "predict",
        "predict_data",
    ):
        setattr(llm.ChatRecord, field, field)
    monkeypatch.setattr(llm, "and_", lambda *args: True)
    monkeypatch.setattr(llm, "select", lambda *args: types.SimpleNamespace(where=lambda *where_args: "stmt"))

    class FakeQueryResult:
        @staticmethod
        def first():
            return types.SimpleNamespace(
                question="本月各地区销售额",
                sql="select region, sum(amount) from orders group by region",
                sql_answer='{"content":"华东销售额最高"}',
                data='[{"region":"华东","sales":1200}]',
                chart_answer="区域柱状图",
                analysis="华北环比下降",
                predict="下月华东预计增长",
                predict_data='[{"region":"华东","predict":1300}]',
            )

    class FakeSession:
        executed = None

        def execute(self, stmt):
            self.executed = stmt
            return FakeQueryResult()

    session = FakeSession()

    service._load_recommend_result_context(session)

    assert service.record.question == "本月各地区销售额"
    assert service.record.sql == "select region, sum(amount) from orders group by region"
    assert service.record.data == '[{"region":"华东","sales":1200}]'
    assert service.record.analysis == "华北环比下降"
    assert service.record.predict_data == '[{"region":"华东","predict":1300}]'
