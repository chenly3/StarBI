package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryLearningQualitySummaryVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String resourceId;

    private Integer score;

    private String grade;

    private List<String> risks = new ArrayList<>();

    private List<String> signals = new ArrayList<>();

    private List<String> suggestions = new ArrayList<>();
}
