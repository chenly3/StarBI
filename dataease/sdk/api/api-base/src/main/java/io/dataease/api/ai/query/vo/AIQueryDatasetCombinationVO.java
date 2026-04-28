package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryDatasetCombinationVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -8773415390306463315L;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long combinationDatasetId;

    private String combinationDatasetName;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long datasourceId;

    private boolean datasourcePending;
}
