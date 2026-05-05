package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerSemanticPatchRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("todo_id")
    private String todoId;

    private String scope;

    @JsonProperty("target_id")
    private String targetId;

    @JsonProperty("theme_id")
    private String themeId;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("patch_type")
    private String patchType;

    private String operation;

    @JsonProperty("patch_id")
    private String patchId;

    @JsonProperty("previous_patch_id")
    private String previousPatchId;

    @JsonProperty("actor_role")
    private String actorRole;

    private String content;
}
