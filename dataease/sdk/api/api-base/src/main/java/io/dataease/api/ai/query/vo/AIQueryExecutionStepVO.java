package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryExecutionStepVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1012846014064519981L;

    private String operateKey;

    private String operateLabel;

    private String startTime;

    private String finishTime;

    private Double duration;

    private Integer totalTokens;

    private Boolean localOperation = false;

    private Boolean error = false;

    private Object message;
}
