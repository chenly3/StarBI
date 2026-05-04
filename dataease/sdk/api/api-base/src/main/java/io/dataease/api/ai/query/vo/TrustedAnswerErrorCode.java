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
