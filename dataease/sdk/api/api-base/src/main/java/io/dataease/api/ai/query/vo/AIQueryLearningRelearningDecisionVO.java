package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningRelearningDecisionVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String resourceId;

    private Boolean relearningSuggested = false;

    private String triggerReason;

    private String relearningAdvice;

    private AIQueryLearningFeedbackMetricVO metric = new AIQueryLearningFeedbackMetricVO();
}
