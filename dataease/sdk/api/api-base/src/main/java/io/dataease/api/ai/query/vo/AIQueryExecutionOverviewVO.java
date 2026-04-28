package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryExecutionOverviewVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -6816871603309495386L;

    private String startTime;

    private String finishTime;

    private Double duration;

    private Integer totalTokens;
}
