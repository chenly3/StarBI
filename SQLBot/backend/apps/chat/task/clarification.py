from dataclasses import dataclass, field
from typing import Any


TIME_RANGE_OPTIONS = ["近7天", "近30天", "本月", "上月", "今年"]
TIME_RANGE_KEYWORDS = [
    "今天",
    "昨日",
    "昨天",
    "本周",
    "上周",
    "本月",
    "上月",
    "本季度",
    "上季度",
    "今年",
    "去年",
    "近7天",
    "近30天",
    "近90天",
]
METRIC_KEYWORDS = ["销售额", "订单量", "利润", "收入", "GMV", "用户数", "客户数"]
DIMENSION_KEYWORDS = ["区域", "门店", "城市", "产品", "客户", "渠道", "日期", "月份", "部门"]
GENERIC_METRIC_QUESTION_KEYWORDS = ["表现", "规模", "情况", "怎么样", "如何", "核心指标"]
GENERIC_DIMENSION_QUESTION_KEYWORDS = ["排名", "排行", "对比", "分布"]
FAILURE_STAGE_SUMMARY = {
    "connection_failed": "这次分析在连接数据源阶段中断，系统还没有进入有效取数。",
    "execute_sql_failed": "这次分析已经完成问题理解，但在执行SQL取数阶段失败。",
    "system_failed": "这次分析已经进入系统执行流程，但服务内部出现异常。",
}
FAILURE_STAGE_NEXT_ACTION = {
    "connection_failed": "建议先检查数据源连接、网络连通性和当前数据源可用状态。",
    "execute_sql_failed": "建议先检查筛选条件、字段口径或SQL执行兼容性后重试。",
    "system_failed": "建议稍后重试，若持续失败请结合执行详情进一步排查。",
}


@dataclass
class ClarificationCandidate:
    label: str
    value: str
    description: str | None = None


@dataclass
class ClarificationDecision:
    need_clarification: bool
    reason_code: str = ""
    prompt: str = ""
    options: list[ClarificationCandidate] = field(default_factory=list)


def detect_time_range(question: str) -> str | None:
    normalized = question.strip()
    for keyword in TIME_RANGE_KEYWORDS:
        if keyword in normalized:
            return keyword
    return None


def infer_query_interpretation(question: str) -> dict[str, Any]:
    normalized = question.strip()
    metrics = [item for item in METRIC_KEYWORDS if item in normalized]
    dimensions = [item for item in DIMENSION_KEYWORDS if item in normalized]
    time_range = detect_time_range(normalized)
    defaulted_fields: list[str] = []

    if "趋势" in normalized and "日期" not in dimensions and "月份" not in dimensions:
        dimensions.append("日期")
        defaulted_fields.append("日期")

    return {
        "metric": metrics,
        "dimension": dimensions,
        "time_range": time_range,
        "filters": [],
        "defaulted_fields": defaulted_fields,
    }


def infer_metric_candidates(question: str, interpreted_metrics: list[str]) -> list[str]:
    if len(interpreted_metrics) > 1:
        return interpreted_metrics

    if interpreted_metrics:
        return interpreted_metrics

    normalized = question.strip()
    if any(keyword in normalized for keyword in GENERIC_METRIC_QUESTION_KEYWORDS):
        return ["销售额", "订单量", "利润"]

    return interpreted_metrics


def infer_dimension_candidates(question: str, interpreted_dimensions: list[str]) -> list[str]:
    if len(interpreted_dimensions) > 1:
        return interpreted_dimensions

    if interpreted_dimensions:
        return interpreted_dimensions

    normalized = question.strip()
    if any(keyword in normalized for keyword in GENERIC_DIMENSION_QUESTION_KEYWORDS):
        return ["区域", "门店"]

    return interpreted_dimensions


def should_request_clarification(
    question: str,
    candidate_metrics: list[str],
    candidate_dimensions: list[str],
    candidate_datasets: list[str],
    detected_time_range: str | None,
) -> ClarificationDecision:
    normalized = question.strip()
    if "趋势" in normalized and not detected_time_range:
        return ClarificationDecision(
            need_clarification=True,
            reason_code="missing_time_range",
            prompt="你想看哪个时间范围？",
            options=[ClarificationCandidate(label=item, value=item) for item in TIME_RANGE_OPTIONS[:3]],
        )

    if len(candidate_metrics) > 1:
        return ClarificationDecision(
            need_clarification=True,
            reason_code="ambiguous_metric",
            prompt="这次分析你想看哪个指标？",
            options=[ClarificationCandidate(label=item, value=item) for item in candidate_metrics[:5]],
        )

    if len(candidate_dimensions) > 1:
        return ClarificationDecision(
            need_clarification=True,
            reason_code="ambiguous_dimension",
            prompt="这次分析你想按哪个维度看结果？",
            options=[ClarificationCandidate(label=item, value=item) for item in candidate_dimensions[:5]],
        )

    if len(candidate_datasets) > 1:
        return ClarificationDecision(
            need_clarification=True,
            reason_code="ambiguous_dataset",
            prompt="这次问题要基于哪个数据集分析？",
            options=[ClarificationCandidate(label=item, value=item) for item in candidate_datasets[:5]],
        )

    return ClarificationDecision(need_clarification=False)


def build_clarification_payload(decision: ClarificationDecision) -> dict[str, Any]:
    return {
        "type": "clarification",
        "reason_code": decision.reason_code,
        "prompt": decision.prompt,
        "options": [
            {
                "label": item.label,
                "value": item.value,
                "description": item.description,
            }
            for item in decision.options
        ],
    }


def build_execution_summary(
    interpretation: dict[str, Any],
    scope_label: str,
    datasource_label: str,
    failure_stage: str | None = None,
) -> dict[str, Any]:
    metric_text = "、".join(interpretation.get("metric") or ["核心指标"])
    dimension_text = "、".join(interpretation.get("dimension") or ["当前默认维度"])
    time_range_text = interpretation.get("time_range") or "当前默认时间范围"
    summary = f"本次按{time_range_text}、按{dimension_text}分析{metric_text}。"
    next_action = "你可以继续改时间范围、指标或筛选条件"

    if failure_stage:
        summary = FAILURE_STAGE_SUMMARY.get(failure_stage, FAILURE_STAGE_SUMMARY["system_failed"])
        next_action = FAILURE_STAGE_NEXT_ACTION.get(failure_stage, FAILURE_STAGE_NEXT_ACTION["system_failed"])

    return {
        "scope_label": scope_label,
        "datasource_label": datasource_label,
        "summary": summary,
        "failure_stage": failure_stage,
        "next_action": next_action,
    }


def infer_failure_stage(error_type: str | None, error_message: str | None) -> str:
    normalized_type = (error_type or "").strip()
    normalized_message = (error_message or "").strip()

    if normalized_type == "db-connection-err" or "connect db failed" in normalized_message.lower():
        return "connection_failed"

    if normalized_type == "exec-sql-err" or "execute sql failed" in normalized_message.lower():
        return "execute_sql_failed"

    return "system_failed"
