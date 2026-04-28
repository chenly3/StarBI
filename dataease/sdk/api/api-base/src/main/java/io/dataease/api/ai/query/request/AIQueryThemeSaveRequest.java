package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryThemeSaveRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 5481522426032176502L;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long id;

    private String name;

    private String description;

    private Boolean status = true;

    private Integer sort = 0;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long defaultDashboardId;

    private String welcomeText;

    private List<String> recommendedQuestions = new ArrayList<>();

    private List<Long> datasetIds = new ArrayList<>();

    private List<Long> defaultDatasetIds = new ArrayList<>();
}
