package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryThemeVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 7842341445333960396L;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    private String name;

    private String description;

    private Boolean status;

    private Integer sort;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long orgId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long defaultDashboardId;

    private String welcomeText;

    private List<String> recommendedQuestions = new ArrayList<>();

    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> datasetIds = new ArrayList<>();

    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> defaultDatasetIds = new ArrayList<>();

    private List<AIQueryThemeDatasetVO> datasets = new ArrayList<>();

    private Integer datasetCount = 0;

    private Long createTime;

    private Long updateTime;
}
