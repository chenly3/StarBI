package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryLearningFeedbackSummaryVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String resourceId;

    private Integer totalFeedbackCount = 0;

    private Integer downvoteCount = 0;

    private Integer downvoteRate = 0;

    private Integer failureCount = 0;

    private Integer failureRate = 0;

    private Boolean relearningSuggested = false;

    private String triggerReason;

    private String relearningAdvice;

    private List<String> recentIssues = new ArrayList<>();
}
