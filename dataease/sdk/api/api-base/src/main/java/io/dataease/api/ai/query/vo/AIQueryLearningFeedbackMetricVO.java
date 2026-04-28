package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningFeedbackMetricVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Integer lifetimeTotalFeedbackCount = 0;

    private Integer lifetimeDownvoteCount = 0;

    private Integer lifetimeFailureCount = 0;

    private Integer lifetimeCorrectionCount = 0;

    private Integer window7dTotalFeedbackCount = 0;

    private Integer window7dDownvoteRate = 0;

    private Integer window7dFailureRate = 0;

    private Integer window7dCorrectionRate = 0;

    private Boolean relearningSuggested = false;

    private String triggerReason;

    private String relearningAdvice;
}
