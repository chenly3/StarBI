package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerSemanticPatchVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("patch_id")
    private String patchId;

    private String scope;

    @JsonProperty("target_id")
    private String targetId;

    @JsonProperty("theme_id")
    private String themeId;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("patch_type")
    private String patchType;

    private String status;

    @JsonProperty("source_todo_id")
    private String sourceTodoId;

    @JsonProperty("audit_event_no")
    private String auditEventNo;

    @JsonProperty("rollback_to_patch_id")
    private String rollbackToPatchId;

    private String content;
}
