package io.dataease.api.ai.query.vo;

public enum TrustedAnswerState {
    TRUSTED,
    NEEDS_CLARIFICATION,
    PARTIAL,
    UNSAFE_BLOCKED,
    NO_AUTHORIZED_CONTEXT,
    FAILED
}
