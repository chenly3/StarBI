package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerEndpointContractVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @JsonProperty("dataease_endpoint")
    private String dataEaseEndpoint;

    private String method;

    @JsonProperty("action_type")
    private TrustedAnswerActionType actionType;

    @JsonProperty("required_switch")
    private TrustedAnswerSwitchKey requiredSwitch;

    @JsonProperty("sqlbot_upstream")
    private String sqlBotUpstream;

    @JsonProperty("capability_check")
    private String capabilityCheck;

    @JsonProperty("negative_test")
    private String negativeTest;
}
