package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.dataease.api.ai.query.vo.TrustedAnswerActionType;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.LinkedHashMap;
import java.util.Map;

@Data
public class AIQuerySqlBotRuntimeProxyRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String method = "GET";

    private String path;

    private Map<String, String> headers = new LinkedHashMap<>();

    private String body;

    @JsonProperty("action_type")
    private TrustedAnswerActionType actionType;

    @JsonProperty("source_trace_id")
    private String sourceTraceId;

    @JsonProperty("record_id")
    private String recordId;
}
