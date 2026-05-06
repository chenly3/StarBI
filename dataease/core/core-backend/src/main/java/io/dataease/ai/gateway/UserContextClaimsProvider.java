package io.dataease.ai.gateway;

public interface UserContextClaimsProvider {

    UserContextClaims claimsFor(Long userId);

    record UserContextClaims(String account, String name, boolean systemAdmin, boolean workspaceAdmin) {
        public static UserContextClaims empty() {
            return new UserContextClaims(null, null, false, false);
        }
    }
}
