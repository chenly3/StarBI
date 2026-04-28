package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
public class AIQueryLearningReplayVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private String eventNo;

    private String resourceId;

    private Long sourceChatId;

    private Long sourceChatRecordId;

    private String sourceTraceId;

    private String actorAccount;

    private String eventType;

    private String questionText;

    private String matchedSql;

    private String errorCode;

    private String errorMessage;

    private Map<String, Object> beforeSnapshot = new LinkedHashMap<>();

    private Map<String, Object> afterSnapshot = new LinkedHashMap<>();

    private List<String> patchTypes = new ArrayList<>();

    private String visibility;

    private String createdAt;
}
