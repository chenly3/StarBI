package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerCorrectionTodoVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("todo_id")
    private String todoId;

    @JsonProperty("tenant_id")
    private String tenantId;

    @JsonProperty("workspace_id")
    private String workspaceId;

    @JsonProperty("theme_id")
    private String themeId;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("diagnosis_type")
    private String diagnosisType;

    @JsonProperty("sanitized_question_summary")
    private String sanitizedQuestionSummary;

    @JsonProperty("duplicate_fingerprint")
    private String duplicateFingerprint;

    private String status;

    private String severity;

    @JsonProperty("impact_count")
    private Integer impactCount = 1;

    @JsonProperty("restricted_payload_visible")
    private Boolean restrictedPayloadVisible = false;

    @JsonProperty("linked_knowledge_id")
    private String linkedKnowledgeId;

    @JsonProperty("linked_relearning_job_id")
    private String linkedRelearningJobId;
}
