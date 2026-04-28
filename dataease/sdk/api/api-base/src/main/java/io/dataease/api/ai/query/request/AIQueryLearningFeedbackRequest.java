package io.dataease.api.ai.query.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
public class AIQueryLearningFeedbackRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String actorAccount = "system";

    @NotBlank
    private String eventType;

    private Long sourceChatId;

    private Long sourceChatRecordId;

    private String sourceTraceId;

    private String questionText;

    private String matchedSql;

    private String errorCode;

    private String errorMessage;

    private Map<String, Object> beforeSnapshot = new LinkedHashMap<>();

    private Map<String, Object> afterSnapshot = new LinkedHashMap<>();

    private List<String> patchTypes = new ArrayList<>();

    private String visibility = "admin_only";
}
