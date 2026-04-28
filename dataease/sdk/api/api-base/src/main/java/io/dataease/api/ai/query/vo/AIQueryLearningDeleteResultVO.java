package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningDeleteResultVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String resourceId;

    private Boolean deleted = false;

    private Integer deletedRows = 0;
}
