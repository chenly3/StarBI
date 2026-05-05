package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import io.dataease.api.ai.query.vo.TrustedAnswerActionType;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 8974316712634871204L;

    private String question;

    @JsonProperty("theme_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long themeId;

    @JsonProperty("datasource_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long datasourceId;

    @JsonProperty("model_id")
    private String modelId;

    @JsonProperty("chat_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long chatId;

    @JsonProperty("action_type")
    private TrustedAnswerActionType actionType = TrustedAnswerActionType.BASIC_ASK;

    @JsonProperty("entry_scene")
    private String entryScene;

    @JsonProperty("resource_kind")
    private String resourceKind;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("source_trace_id")
    private String sourceTraceId;

    @JsonProperty("parent_trace_id")
    private String parentTraceId;

    @JsonProperty("record_id")
    private String recordId;
}
