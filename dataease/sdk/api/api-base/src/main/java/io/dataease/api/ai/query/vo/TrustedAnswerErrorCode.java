package io.dataease.api.ai.query.vo;

public enum TrustedAnswerErrorCode {

    THEME_REQUIRED(
            TrustedAnswerState.NEEDS_CLARIFICATION,
            "请选择一个可信问数业务上下文。",
            "本次请求没有携带 theme_id，后端无法确定可问资源范围。",
            "在问数入口选择一个业务上下文，或配置默认分析主题。",
            "validate-theme",
            false
    ),
    SQLBOT_CONFIG_MISSING(
            TrustedAnswerState.FAILED,
            "SQLBot 服务配置不可用。",
            "SQLBot 配置缺失、未启用或校验失败。",
            "在系统设置中完成 SQLBot 配置，或在本地开发中启用 SQLBot stub 模式。",
            "load-sqlbot-config",
            true
    ),
    THEME_NOT_VISIBLE(
            TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
            "当前用户无权使用该分析主题。",
            "主题不存在、已禁用，或不在当前用户可见范围内。",
            "选择有权限的主题，或由管理员调整主题可见范围。",
            "validate-theme",
            false
    ),
    NO_AUTHORIZED_DATASET(
            TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
            "当前主题下没有可问资源。",
            "主题绑定了数据集，但当前用户的数据集权限过滤后没有剩余资源。",
            "调整数据集权限、资源权限，或选择其他主题。",
            "resolve-authorized-datasets",
            false
    ),
    NO_VISIBLE_FIELD(
            TrustedAnswerState.UNSAFE_BLOCKED,
            "权限过滤后没有可用于问数的字段。",
            "列权限移除了该主题下所有可问字段。",
            "调整列权限或资源语义配置后重新学习。",
            "build-visible-schema",
            false
    ),
    ROW_PERMISSION_REBUILD_FAILED(
            TrustedAnswerState.UNSAFE_BLOCKED,
            "行权限无法安全拼接到问数 SQL。",
            "行权限表达式重写失败，继续生成 SQL 可能造成数据泄露或错误结果。",
            "修复行权限表达式后重新学习并回放验证。",
            "apply-row-permission",
            false
    ),
    ASK_DISABLED(
            TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
            "智能问数已关闭。",
            "全局 ask_enabled=false，后端已阻断基础问数流。",
            "在系统设置中启用智能问数后重试。",
            "check-runtime-switch",
            false
    ),
    ACTION_DISABLED(
            TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
            "当前问数能力已关闭。",
            "对应运行时开关关闭，后端已拒绝该动作。",
            "启用对应问数能力后重试。",
            "check-action-switch",
            false
    ),
    UNMAPPED_SQLBOT_PROXY_PATH(
            TrustedAnswerState.UNSAFE_BLOCKED,
            "该 SQLBot 运行时路径未纳入可信问数契约。",
            "请求路径或 method 无法映射到 DataEase 运行时动作矩阵。",
            "改用 DataEase 可信问数 endpoint，或补充后端动作契约。",
            "validate-action-contract",
            false
    ),
    TRUSTED_TRACE_REQUIRED(
            TrustedAnswerState.UNSAFE_BLOCKED,
            "该 SQLBot 运行时请求缺少可信问数上下文。",
            "record 级 SQLBot 运行时动作没有绑定 DataEase 可信 trace，或请求的记录不属于该 trace。",
            "先通过 DataEase 可信问数主流程生成答案，再基于该答案触发图表、解读、预测或推荐问题。",
            "validate-trusted-runtime-scope",
            false
    ),
    FACT_RESULT_REQUIRED(
            TrustedAnswerState.UNSAFE_BLOCKED,
            "无法生成可信事实答案。",
            "SQLBot 返回了事实内容，但 DataEase 没有授权结果集标记。",
            "先由 DataEase 执行授权查询并生成结果集。",
            "validate-fact-boundary",
            false
    ),
    RESOURCE_NOT_ASKABLE(
            TrustedAnswerState.NO_AUTHORIZED_CONTEXT,
            "当前问数资源尚未达到可问状态。",
            "资源未学习、学习失败、已禁用、未绑定主题，或字段质量不足。",
            "在问数资源配置中完成学习和质量修复后重试。",
            "evaluate-resource-readiness",
            false
    ),
    SENSITIVE_PAYLOAD_RESTRICTED(
            TrustedAnswerState.UNSAFE_BLOCKED,
            "敏感反馈内容仅允许受控访问。",
            "CorrectionTodo restricted payload 不允许在当前视图展示。",
            "使用诊断权限查看，或查看脱敏摘要。",
            "redact-correction-payload",
            false
    ),
    MULTI_DATASOURCE_AMBIGUOUS(
            TrustedAnswerState.NEEDS_CLARIFICATION,
            "该主题命中多个数据源，需要先选择执行数据源。",
            "主题内授权资源分布在多个数据源，后端不能安全猜测执行数据源。",
            "选择一个数据源，或在分析主题中配置默认数据源策略。",
            "choose-datasource",
            false
    ),
    SQLBOT_UNAVAILABLE(
            TrustedAnswerState.FAILED,
            "SQLBot 服务暂不可用。",
            "SQLBot 网络请求失败、超时，或服务返回不可用。",
            "稍后重试，或检查 SQLBot 服务健康状态。",
            "call-sqlbot",
            true
    );

    private final TrustedAnswerState state;
    private final String message;
    private final String cause;
    private final String fix;
    private final String traceStep;
    private final boolean retryable;

    TrustedAnswerErrorCode(
            TrustedAnswerState state,
            String message,
            String cause,
            String fix,
            String traceStep,
            boolean retryable
    ) {
        this.state = state;
        this.message = message;
        this.cause = cause;
        this.fix = fix;
        this.traceStep = traceStep;
        this.retryable = retryable;
    }

    public TrustedAnswerErrorVO toError() {
        TrustedAnswerErrorVO error = new TrustedAnswerErrorVO();
        error.setCode(name());
        error.setState(state);
        error.setMessage(message);
        error.setCause(cause);
        error.setFix(fix);
        error.setTraceStep(traceStep);
        error.setRetryable(retryable);
        error.setUserVisibleMessage(message);
        error.setAdminVisibleDetail(cause + " " + fix);
        return error;
    }
}
