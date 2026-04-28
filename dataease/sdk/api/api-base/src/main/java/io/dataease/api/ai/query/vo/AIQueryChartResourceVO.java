package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryChartResourceVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    private String title;

    private String chartType;

    private String sourceKind;

    private String selectionTitle;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long snapshotId;
}
