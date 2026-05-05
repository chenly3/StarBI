package io.dataease.api.ai.query.vo;

public enum TrustedAnswerSwitchKey {
    ASK_ENABLED("ask_enabled"),
    DATA_INTERPRETATION_ENABLED("data_interpretation_enabled"),
    FORECAST_ENABLED("forecast_enabled"),
    FOLLOWUP_ENABLED("followup_enabled"),
    SAMPLE_DATASET_ENABLED("sample_dataset_enabled"),
    VOICE_ENABLED("voice_enabled");

    private final String key;

    TrustedAnswerSwitchKey(String key) {
        this.key = key;
    }

    public String getKey() {
        return key;
    }
}
