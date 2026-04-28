package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningPatchVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long id;

    private String resourceId;

    private String patchType;

    private String status;

    private Integer priority;

    private String matchFingerprint;

    private Long sourceEventId;

    private String activatedAt;

    private String deactivatedAt;
}
