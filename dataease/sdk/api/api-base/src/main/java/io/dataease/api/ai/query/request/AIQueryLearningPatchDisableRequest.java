package io.dataease.api.ai.query.request;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryLearningPatchDisableRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String actorAccount = "system";

    private String reason;
}
