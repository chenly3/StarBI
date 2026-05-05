package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerRuntimePolicyVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("ask_enabled")
    private Boolean askEnabled = true;

    @JsonProperty("data_interpretation_enabled")
    private Boolean dataInterpretationEnabled = true;

    @JsonProperty("forecast_enabled")
    private Boolean forecastEnabled = true;

    @JsonProperty("followup_enabled")
    private Boolean followupEnabled = true;

    @JsonProperty("sample_dataset_enabled")
    private Boolean sampleDatasetEnabled = true;

    @JsonProperty("voice_enabled")
    private Boolean voiceEnabled = true;
}
