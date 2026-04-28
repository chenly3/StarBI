package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class AIQueryChatResultVO implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private String messageId;
    private String content;
    private String sql;
    private String chartType;
    private Object chartOptions;
    private Object data;
}
