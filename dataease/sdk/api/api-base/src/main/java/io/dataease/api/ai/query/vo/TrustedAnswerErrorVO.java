package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerErrorVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -2049295146916486925L;

    private String code;

    private TrustedAnswerState state;

    private String message;

    private String cause;

    private String fix;

    @JsonProperty("trace_step")
    private String traceStep;

    private Boolean retryable = false;

    @JsonProperty("user_visible_message")
    private String userVisibleMessage;

    @JsonProperty("admin_visible_detail")
    private String adminVisibleDetail;
}
