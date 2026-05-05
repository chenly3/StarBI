package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerCorrectionFeedbackRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("theme_id")
    private String themeId;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("diagnosis_type")
    private String diagnosisType;

    @JsonProperty("question_text")
    private String questionText;

    @JsonProperty("feedback_text")
    private String feedbackText;
}
