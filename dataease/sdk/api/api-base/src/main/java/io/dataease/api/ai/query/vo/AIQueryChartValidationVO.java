package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryChartValidationVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private boolean insertable;

    private List<String> unmappedMetrics = new ArrayList<>();

    private List<String> unmappedDimensions = new ArrayList<>();

    private List<String> reasons = new ArrayList<>();
}
