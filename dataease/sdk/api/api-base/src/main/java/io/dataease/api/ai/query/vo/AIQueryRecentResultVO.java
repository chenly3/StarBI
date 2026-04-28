package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryRecentResultVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long snapshotId;

    private String title;

    private String chartType;

    private String sourceKind;

    private String selectionTitle;

    private Long createTime;
}
