package io.dataease.api.ai.query.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningTriggerVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String taskId;

    private String resourceId;

    @Schema(description = "任务状态: pending/running/succeeded/failed")
    private String taskStatus;
}
