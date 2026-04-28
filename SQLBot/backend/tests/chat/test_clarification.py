from apps.chat.task.clarification import (
    ClarificationCandidate,
    ClarificationDecision,
    build_clarification_payload,
    build_execution_summary,
    infer_failure_stage,
    infer_metric_candidates,
    infer_query_interpretation,
    infer_dimension_candidates,
    should_request_clarification,
)


def test_should_request_clarification_for_missing_time_range():
    decision = should_request_clarification(
        question="销售额趋势怎么样",
        candidate_metrics=["销售额"],
        candidate_dimensions=["日期"],
        candidate_datasets=["sales_daily"],
        detected_time_range=None,
    )

    assert decision.need_clarification is True
    assert decision.reason_code == "missing_time_range"
    assert decision.options[0].value == "近7天"


def test_build_clarification_payload_returns_structured_options():
    decision = ClarificationDecision(
        need_clarification=True,
        reason_code="ambiguous_metric",
        prompt="你想看销售额还是订单量？",
        options=[
            ClarificationCandidate(label="销售额", value="sales_amount"),
            ClarificationCandidate(label="订单量", value="order_count"),
        ],
    )

    payload = build_clarification_payload(decision)

    assert payload["type"] == "clarification"
    assert payload["reason_code"] == "ambiguous_metric"
    assert payload["prompt"] == "你想看销售额还是订单量？"
    assert payload["options"][0]["value"] == "sales_amount"


def test_should_request_clarification_for_ambiguous_metric():
    decision = should_request_clarification(
        question="销售表现怎么样",
        candidate_metrics=["销售额", "订单量", "利润"],
        candidate_dimensions=["门店"],
        candidate_datasets=["sales_daily"],
        detected_time_range="近30天",
    )

    assert decision.need_clarification is True
    assert decision.reason_code == "ambiguous_metric"
    assert [item.value for item in decision.options] == ["销售额", "订单量", "利润"]


def test_should_request_clarification_for_ambiguous_dimension():
    decision = should_request_clarification(
        question="帮我做一个排名分析",
        candidate_metrics=["销售额"],
        candidate_dimensions=["区域", "门店"],
        candidate_datasets=["sales_daily"],
        detected_time_range="近30天",
    )

    assert decision.need_clarification is True
    assert decision.reason_code == "ambiguous_dimension"
    assert [item.value for item in decision.options] == ["区域", "门店"]


def test_infer_metric_candidates_for_generic_performance_question():
    candidates = infer_metric_candidates("销售表现怎么样", [])

    assert candidates == ["销售额", "订单量", "利润"]


def test_infer_dimension_candidates_for_generic_ranking_question():
    candidates = infer_dimension_candidates("帮我做一个排名分析", [])

    assert candidates == ["区域", "门店"]


def test_infer_query_interpretation_from_question():
    interpretation = infer_query_interpretation("近30天按区域统计销售额趋势")

    assert interpretation["metric"] == ["销售额"]
    assert interpretation["dimension"] == ["区域", "日期"]
    assert interpretation["time_range"] == "近30天"
    assert interpretation["defaulted_fields"] == ["日期"]


def test_build_execution_summary_is_business_readable():
    interpretation = {
        "metric": ["销售额"],
        "dimension": ["门店"],
        "time_range": "近30天",
        "filters": [],
        "defaulted_fields": [],
    }

    summary = build_execution_summary(
        interpretation=interpretation,
        scope_label="销售分析主题 / 门店销售数据集",
        datasource_label="mysql-sales",
    )

    assert summary["scope_label"] == "销售分析主题 / 门店销售数据集"
    assert summary["datasource_label"] == "mysql-sales"
    assert "近30天" in summary["summary"]
    assert "门店" in summary["summary"]
    assert "销售额" in summary["summary"]


def test_build_execution_summary_for_db_connection_failure():
    interpretation = {
        "metric": ["销售额"],
        "dimension": ["门店"],
        "time_range": "近30天",
        "filters": [],
        "defaulted_fields": [],
    }

    summary = build_execution_summary(
        interpretation=interpretation,
        scope_label="销售分析主题 / 门店销售数据集",
        datasource_label="mysql-sales",
        failure_stage="connection_failed",
    )

    assert summary["failure_stage"] == "connection_failed"
    assert "连接" in summary["summary"]
    assert "检查数据源连接" in summary["next_action"]


def test_infer_failure_stage_from_error_type():
    assert infer_failure_stage("db-connection-err", "Connect DB failed") == "connection_failed"
    assert infer_failure_stage("exec-sql-err", "Execute SQL Failed") == "execute_sql_failed"
    assert infer_failure_stage(None, "something else") == "system_failed"
