package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryChartInsertRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String sourceType;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long sourceId;

    private String targetCanvasType;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long targetCanvasId;

    private String title;

    private String question;

    private String sqlText;

    private String chartConfig;

    private String interpretation;

    private String sourceKind;

    private String querySourceId;

    private String querySourceIds;

    private String combinationId;

    private String combinationName;

    private String datasourceId;

    private String sourceInsights;

    private String themeId;

    private String themeName;
}
