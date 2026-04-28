package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryChartMaterializeRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long snapshotId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long chartResourceId;

    private String sourceType;

    private String title;

    private String chartConfig;

    private String sourceKind;

    private String querySourceId;

    private String querySourceIds;

    private String combinationId;

    private String combinationName;
}
