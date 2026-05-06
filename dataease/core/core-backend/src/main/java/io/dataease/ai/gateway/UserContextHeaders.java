package io.dataease.ai.gateway;

import io.dataease.auth.bo.TokenUserBO;
import io.dataease.utils.AuthUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class UserContextHeaders {

    @Autowired(required = false)
    private List<UserContextClaimsProvider> claimsProviders = List.of();

    public Map<String, String> buildHeaders() {
        Map<String, String> headers = new HashMap<>();
        TokenUserBO user = AuthUtils.getUser();
        if (user != null) {
            Long userId = user.getUserId();
            if (userId == null) {
                return headers;
            }
            headers.put("X-DE-USER-ID", String.valueOf(userId));
            if (user.getDefaultOid() != null) {
                headers.put("X-DE-ORG-ID", String.valueOf(user.getDefaultOid()));
            }
            UserContextClaimsProvider.UserContextClaims claims = resolveClaims(userId);
            if (StringUtils.isNotBlank(claims.account())) {
                headers.put("X-DE-USER-ACCOUNT", headerValue(claims.account()));
            }
            if (StringUtils.isNotBlank(claims.name())) {
                headers.put("X-DE-USER-NAME", headerValue(claims.name()));
            }
            boolean systemAdmin = AuthUtils.isSysAdmin(userId) || claims.systemAdmin();
            boolean workspaceAdmin = systemAdmin || claims.workspaceAdmin();
            headers.put("X-DE-IS-ADMIN", Boolean.toString(systemAdmin));
            headers.put("X-DE-IS-WS-ADMIN", Boolean.toString(workspaceAdmin));
        }
        return headers;
    }

    public String getUserId() {
        TokenUserBO user = AuthUtils.getUser();
        return user != null ? String.valueOf(user.getUserId()) : null;
    }

    public String getOrgId() {
        TokenUserBO user = AuthUtils.getUser();
        return user != null && user.getDefaultOid() != null
                ? String.valueOf(user.getDefaultOid()) : null;
    }

    private UserContextClaimsProvider.UserContextClaims resolveClaims(Long userId) {
        if (userId == null || claimsProviders == null || claimsProviders.isEmpty()) {
            return UserContextClaimsProvider.UserContextClaims.empty();
        }
        for (UserContextClaimsProvider claimsProvider : claimsProviders) {
            try {
                UserContextClaimsProvider.UserContextClaims claims = claimsProvider.claimsFor(userId);
                if (hasClaims(claims)) {
                    return claims;
                }
            } catch (Exception ignored) {
                // Keep DataEase -> SQLBot proxy available if one identity backend is unavailable.
            }
        }
        return UserContextClaimsProvider.UserContextClaims.empty();
    }

    private boolean hasClaims(UserContextClaimsProvider.UserContextClaims claims) {
        return claims != null
                && (StringUtils.isNotBlank(claims.account())
                || StringUtils.isNotBlank(claims.name())
                || claims.systemAdmin()
                || claims.workspaceAdmin());
    }

    private String headerValue(String value) {
        String sanitized = StringUtils.defaultString(value).replace('\r', ' ').replace('\n', ' ').trim();
        return URLEncoder.encode(sanitized, StandardCharsets.UTF_8);
    }

}
