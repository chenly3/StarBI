package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
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
}
