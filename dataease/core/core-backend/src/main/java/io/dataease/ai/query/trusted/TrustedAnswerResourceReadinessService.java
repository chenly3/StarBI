package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.AIQueryLearningResourceVO;
import io.dataease.api.ai.query.vo.ResourceReadinessState;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

@Service
public class TrustedAnswerResourceReadinessService {

    public record Evaluation(ResourceReadinessState state, int score, String reason) {
    }

    public Evaluation evaluate(AIQueryLearningResourceVO resource) {
        if (resource == null) {
            return new Evaluation(ResourceReadinessState.NOT_ASKABLE, 0, "resource missing");
        }
        int score = number(resource.getQualityScore());
        if (Boolean.FALSE.equals(resource.getEnabled())
                || !Boolean.TRUE.equals(resource.getThemeBound())
                || number(resource.getFieldCount()) <= 0) {
            return new Evaluation(ResourceReadinessState.NOT_ASKABLE, score, "disabled, no theme, or no fields");
        }
        if (!StringUtils.equalsIgnoreCase(resource.getLearningStatus(), "succeeded")) {
            return new Evaluation(ResourceReadinessState.NOT_ASKABLE, score, "resource not learned");
        }
        if (score < 50
                || number(resource.getFailureRate30d()) >= 10
                || number(resource.getNegativeFeedbackRate30d()) >= 20
                || number(resource.getAmbiguityRate30d()) >= 15) {
            return new Evaluation(ResourceReadinessState.NEEDS_OPTIMIZATION, score, "learning or 30d quality risk");
        }
        if (number(resource.getRecommendationCount()) > 0
                && score >= 80
                && number(resource.getFailureRate30d()) < 10) {
            return new Evaluation(ResourceReadinessState.FORMAL_ASKABLE, score, "formal askable");
        }
        return new Evaluation(ResourceReadinessState.TRIAL_ASKABLE, score, "trial askable");
    }

    private int number(Integer value) {
        return value == null ? 0 : value;
    }
}
