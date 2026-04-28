package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryModelConfigVO implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String id;
    private String name;
    private String provider;
    private String modelName;
    private String apiBase;
    private String apiKey;
    private Boolean enabled;
}
