package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryExecutionDetailsVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -9010568815171688603L;

    private AIQueryExecutionOverviewVO overview = new AIQueryExecutionOverviewVO();

    private List<AIQueryExecutionStepVO> steps = new ArrayList<>();
}
