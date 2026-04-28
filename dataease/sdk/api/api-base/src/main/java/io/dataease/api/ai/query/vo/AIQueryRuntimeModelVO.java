package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryRuntimeModelVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 2299480164166041478L;

    private String id;

    private String name;

    private Boolean defaultModel = false;
}
