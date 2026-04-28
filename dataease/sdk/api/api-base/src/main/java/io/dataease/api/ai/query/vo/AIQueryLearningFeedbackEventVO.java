package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningFeedbackEventVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Boolean accepted = false;

    private String eventNo;

    private String resourceId;

    private Integer activePatchCount = 0;

    private AIQueryLearningFeedbackMetricVO metric = new AIQueryLearningFeedbackMetricVO();
}
