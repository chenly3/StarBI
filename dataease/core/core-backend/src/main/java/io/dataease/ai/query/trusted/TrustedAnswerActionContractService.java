package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerActionType;
import io.dataease.api.ai.query.vo.TrustedAnswerEndpointContractVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO;
import io.dataease.api.ai.query.vo.TrustedAnswerSwitchKey;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
public class TrustedAnswerActionContractService {

    private record ContractDef(
            String endpoint,
            String method,
            TrustedAnswerActionType actionType,
            TrustedAnswerSwitchKey requiredSwitch,
            String upstreamPattern,
            String capabilityCheck,
            String negativeTest
    ) {
    }

    private static final List<ContractDef> CONTRACTS = List.of(
            contract("/ai/query/trusted-answer/sqlbot-runtime", "GET", TrustedAnswerActionType.ASSISTANT_VALIDATE, TrustedAnswerSwitchKey.ASK_ENABLED, "^/system/assistant/validator$", "current DataEase user identity", "assistant validator bypasses DataEase"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.ASSISTANT_START, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/assistant/start$", "current DataEase user identity", "assistant chat starts without DataEase scope"),
            contract("/ai/query/trusted-answer/stream", "POST", TrustedAnswerActionType.BASIC_ASK, TrustedAnswerSwitchKey.ASK_ENABLED, "/chat/question", "ask + theme/resource/field/row policy", "ask_enabled=false"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.RECOMMENDATION_ASK, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/recommend_questions/[^/]+$", "resource visibility", "lost resource recommendation"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.DATA_INTERPRETATION, TrustedAnswerSwitchKey.DATA_INTERPRETATION_ENABLED, "^/chat/record/[^/]+/analysis$", "record owner + current scope", "interpretation disabled"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.FORECAST, TrustedAnswerSwitchKey.FORECAST_ENABLED, "^/chat/record/[^/]+/predict$", "record owner + time field visible", "forecast disabled"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "GET", TrustedAnswerActionType.HISTORY_LIST, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/list$", "session owner", "other user chat list"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "DELETE", TrustedAnswerActionType.HISTORY_LIST, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/[^/]+/[^/]+$", "session owner", "other user chat delete"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "GET", TrustedAnswerActionType.HISTORY_LIST, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/recent_questions/[^/]+$", "resource visibility", "recent question resource revoked"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "GET", TrustedAnswerActionType.HISTORY_LIST, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/sqlbot-new/history$", "session owner", "other user history"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "GET", TrustedAnswerActionType.HISTORY_RESTORE, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/[^/]+/with_data$", "session owner + current permissions", "revoked chat restore"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "GET", TrustedAnswerActionType.HISTORY_RESTORE, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/[^/]+/sqlbot-new/context$", "session owner + current permissions", "revoked resource restore"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.CONTEXT_SWITCH, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/[^/]+/sqlbot-new/context-switch$", "current scope payload only", "payload contains sql"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "POST", TrustedAnswerActionType.SNAPSHOT, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/[^/]+/sqlbot-new/snapshot$", "current scope payload only", "payload contains restricted source metadata"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "GET", TrustedAnswerActionType.CHART_DATA, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/record/[^/]+/data$", "record owner + fields visible", "record revoked"),
            contract("/ai/query/trusted-answer/sqlbot-runtime", "GET", TrustedAnswerActionType.USAGE, TrustedAnswerSwitchKey.ASK_ENABLED, "^/chat/record/[^/]+/usage$", "record owner + visibility mode", "diagnostic usage requested by normal user"),
            contract("/ai/query/trusted-answer/dashboard/ask", "POST", TrustedAnswerActionType.DASHBOARD_ASK, TrustedAnswerSwitchKey.ASK_ENABLED, "", "dashboard resource + fields visible", "dashboard revoked"),
            contract("/ai/query/trusted-answer/file/ask", "POST", TrustedAnswerActionType.FILE_ASK, TrustedAnswerSwitchKey.ASK_ENABLED, "", "file resource + fields visible", "file revoked")
    );

    public List<TrustedAnswerEndpointContractVO> contracts() {
        return CONTRACTS.stream().map(this::toVO).toList();
    }

    public Optional<TrustedAnswerEndpointContractVO> resolveSqlBotRuntime(String method, String path) {
        String normalizedMethod = StringUtils.upperCase(StringUtils.trimToEmpty(method));
        String rawPath = normalizePath(path);
        return CONTRACTS.stream()
                .filter(item -> "/ai/query/trusted-answer/sqlbot-runtime".equals(item.endpoint()))
                .filter(item -> item.method().equals(normalizedMethod))
                .filter(item -> StringUtils.isNotBlank(item.upstreamPattern()))
                .filter(item -> Pattern.matches(item.upstreamPattern(), rawPath))
                .findFirst()
                .map(this::toVO);
    }

    public Optional<TrustedAnswerErrorCode> disabledError(TrustedAnswerActionType actionType, TrustedAnswerRuntimePolicyVO policy) {
        if (policy == null || actionType == null) {
            return Optional.empty();
        }
        if (requiresAsk(actionType) && Boolean.FALSE.equals(policy.getAskEnabled())) {
            return Optional.of(TrustedAnswerErrorCode.ASK_DISABLED);
        }
        return switch (actionType) {
            case DATA_INTERPRETATION -> Boolean.FALSE.equals(policy.getDataInterpretationEnabled())
                    ? Optional.of(TrustedAnswerErrorCode.ACTION_DISABLED)
                    : Optional.empty();
            case FORECAST -> Boolean.FALSE.equals(policy.getForecastEnabled())
                    ? Optional.of(TrustedAnswerErrorCode.ACTION_DISABLED)
                    : Optional.empty();
            case MANUAL_FOLLOW_UP, AUTO_FOLLOW_UP, HISTORY_FOLLOW_UP -> Boolean.FALSE.equals(policy.getFollowupEnabled())
                    ? Optional.of(TrustedAnswerErrorCode.ACTION_DISABLED)
                    : Optional.empty();
            case FILE_ASK -> Boolean.FALSE.equals(policy.getSampleDatasetEnabled())
                    ? Optional.of(TrustedAnswerErrorCode.ACTION_DISABLED)
                    : Optional.empty();
            default -> Optional.empty();
        };
    }

    private boolean requiresAsk(TrustedAnswerActionType actionType) {
        return actionType != TrustedAnswerActionType.ASSISTANT_VALIDATE;
    }

    private TrustedAnswerEndpointContractVO toVO(ContractDef contract) {
        TrustedAnswerEndpointContractVO vo = new TrustedAnswerEndpointContractVO();
        vo.setDataEaseEndpoint(contract.endpoint());
        vo.setMethod(contract.method());
        vo.setActionType(contract.actionType());
        vo.setRequiredSwitch(contract.requiredSwitch());
        vo.setSqlBotUpstream(contract.upstreamPattern());
        vo.setCapabilityCheck(contract.capabilityCheck());
        vo.setNegativeTest(contract.negativeTest());
        return vo;
    }

    private static ContractDef contract(
            String endpoint,
            String method,
            TrustedAnswerActionType actionType,
            TrustedAnswerSwitchKey requiredSwitch,
            String upstreamPattern,
            String capabilityCheck,
            String negativeTest
    ) {
        return new ContractDef(endpoint, method, actionType, requiredSwitch, upstreamPattern, capabilityCheck, negativeTest);
    }

    private String normalizePath(String path) {
        String normalized = StringUtils.defaultIfBlank(path, "/").trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        return URI.create("http://dataease.local" + normalized).getPath();
    }
}
