package io.dataease.api.ai.query.request;

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
}
