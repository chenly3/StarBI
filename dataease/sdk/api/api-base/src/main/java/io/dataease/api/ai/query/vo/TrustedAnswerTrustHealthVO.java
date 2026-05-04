package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerTrustHealthVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -6287802720233671172L;

    private Boolean trusted;

    @JsonProperty("total_trace_count")
    private Integer totalTraceCount;

    @JsonProperty("trusted_trace_count")
    private Integer trustedTraceCount;

    @JsonProperty("blocking_issue_count")
    private Integer blockingIssueCount;

    @JsonProperty("trusted_rate")
    private Integer trustedRate;
}
