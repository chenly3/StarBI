package io.dataease.api.ai.query.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningResourceVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String resourceId;

    private String name;

    @Schema(description = "学习状态: pending/running/succeeded/failed")
    private String learningStatus;

    @Schema(description = "质量等级: A/B/C/D")
    private String qualityGrade;

    private Integer qualityScore;

    @Schema(description = "最近学习完成时间, ISO-8601 字符串")
    private String lastLearningTime;

    private String failureReason;
}
