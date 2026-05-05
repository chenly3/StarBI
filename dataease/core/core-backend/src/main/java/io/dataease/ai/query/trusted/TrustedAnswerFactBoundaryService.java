package io.dataease.ai.query.trusted;

import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class TrustedAnswerFactBoundaryService {

    public boolean isFactPayloadAllowed(Object payload) {
        if (!(payload instanceof Map<?, ?> map)) {
            return true;
        }
        Object type = map.get("type");
        boolean factType = "table-result".equals(type)
                || "answer".equals(type);
        return !factType || Boolean.TRUE.equals(map.get("dataease_authorized_result"));
    }

    public Object authorizeTrustedFactPayload(Object payload) {
        return authorizeTrustedFactPayload(payload, false);
    }

    public Object authorizeTrustedFactPayload(Object payload, boolean trustedDataEaseScope) {
        if (!trustedDataEaseScope) {
            return payload;
        }
        if (!(payload instanceof Map<?, ?> map) || !isFactPayload(map)) {
            return payload;
        }
        Map<Object, Object> authorized = new LinkedHashMap<>();
        authorized.putAll(map);
        authorized.put("dataease_authorized_result", true);
        return authorized;
    }

    private boolean isFactPayload(Map<?, ?> map) {
        Object type = map.get("type");
        return "table-result".equals(type) || "answer".equals(type);
    }
}
