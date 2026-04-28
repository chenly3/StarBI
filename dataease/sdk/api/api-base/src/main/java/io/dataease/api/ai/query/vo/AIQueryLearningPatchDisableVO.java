package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningPatchDisableVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private Long patchId;

    private String resourceId;

    private Boolean disabled = false;

    private String eventNo;
}
