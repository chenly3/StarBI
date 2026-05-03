package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerRepairItemVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 4142427164936325608L;

    @JsonProperty("trace_id")
    private String traceId;

    private TrustedAnswerState state;

    @JsonProperty("theme_name")
    private String themeName;

    @JsonProperty("error_code")
    private String errorCode;

    private String message;

    private String cause;

    private String fix;

    @JsonProperty("primary_action")
    private String primaryAction;
}
