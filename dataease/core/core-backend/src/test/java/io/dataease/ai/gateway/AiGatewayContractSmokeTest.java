package io.dataease.ai.gateway;

import io.dataease.ai.gateway.UserContextClaimsProvider.UserContextClaims;
import io.dataease.auth.bo.TokenUserBO;
import io.dataease.system.manage.SysParameterManage;
import io.dataease.utils.AuthUtils;
import io.dataease.utils.HttpClientConfig;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import static org.junit.jupiter.api.Assertions.*;

class AiGatewayContractSmokeTest {

    @Test
    void userContextHeadersBuildsHeaders() {
        AuthUtils.setUser(new TokenUserBO(1L, 1L));
        try {
            UserContextHeaders headers = new UserContextHeaders();
            Map<String, String> map = headers.buildHeaders();

            assertEquals("1", map.get("X-DE-USER-ID"));
            assertEquals("1", map.get("X-DE-ORG-ID"));
            assertEquals("true", map.get("X-DE-IS-ADMIN"));
            assertEquals("true", map.get("X-DE-IS-WS-ADMIN"));
            assertFalse(map.containsKey("X-DE-USER-ACCOUNT"));
        } finally {
            AuthUtils.remove();
        }
    }

    @Test
    void userContextHeadersReturnsUserId() {
        AuthUtils.setUser(new TokenUserBO(42L, 99L));
        try {
            UserContextHeaders headers = new UserContextHeaders();

            assertEquals("42", headers.getUserId());
            assertEquals("99", headers.getOrgId());
        } finally {
            AuthUtils.remove();
        }
    }

    @Test
    void userContextHeadersReturnsNullWhenNoUser() {
        UserContextHeaders headers = new UserContextHeaders();
        assertNull(headers.getUserId());
        assertNull(headers.getOrgId());
    }

    @Test
    void baseProxyBuildConfigAddsInternalSignatureHeaders() throws Exception {
        AuthUtils.setUser(new TokenUserBO(42L, 99L));
        try {
            TestProxy proxy = new TestProxy();
            ReflectionTestUtils.setField(proxy, "sysParameterManage", new FakeSysParameterManage("starbi-secret"));
            ReflectionTestUtils.setField(proxy, "userContextHeaders", newUserContextHeaders(
                    new UserContextClaims("analyst", "分析用户", false, true)
            ));

            HttpClientConfig config = proxy.exposeBuildConfig();
            Map<String, String> headers = config.getHeader();
            String timestamp = headers.get("X-DE-INTERNAL-TIMESTAMP");

            assertEquals("42", headers.get("X-DE-USER-ID"));
            assertEquals("99", headers.get("X-DE-ORG-ID"));
            assertEquals("analyst", headers.get("X-DE-USER-ACCOUNT"));
            assertEquals("%E5%88%86%E6%9E%90%E7%94%A8%E6%88%B7", headers.get("X-DE-USER-NAME"));
            assertEquals("false", headers.get("X-DE-IS-ADMIN"));
            assertEquals("true", headers.get("X-DE-IS-WS-ADMIN"));
            assertNotNull(timestamp);
            assertEquals(
                    hmacSha256("starbi-secret", String.join("\n",
                            "42",
                            "99",
                            "analyst",
                            "%E5%88%86%E6%9E%90%E7%94%A8%E6%88%B7",
                            "false",
                            "true",
                            timestamp
                    )),
                    headers.get("X-DE-INTERNAL-SIGNATURE")
            );
        } finally {
            AuthUtils.remove();
        }
    }

    @Test
    void userContextHeadersUsesRoleClaimsForNonAdminWorkspaceAdmin() {
        AuthUtils.setUser(new TokenUserBO(2L, 99L));
        try {
            UserContextHeaders headers = newUserContextHeaders(
                    new UserContextClaims("org_admin", "组织管理员", false, true)
            );
            Map<String, String> map = headers.buildHeaders();

            assertEquals("2", map.get("X-DE-USER-ID"));
            assertEquals("99", map.get("X-DE-ORG-ID"));
            assertEquals("org_admin", map.get("X-DE-USER-ACCOUNT"));
            assertEquals("%E7%BB%84%E7%BB%87%E7%AE%A1%E7%90%86%E5%91%98", map.get("X-DE-USER-NAME"));
            assertEquals("false", map.get("X-DE-IS-ADMIN"));
            assertEquals("true", map.get("X-DE-IS-WS-ADMIN"));
        } finally {
            AuthUtils.remove();
        }
    }

    @Test
    void userContextHeadersKeepsNormalUserRestricted() {
        AuthUtils.setUser(new TokenUserBO(3L, 99L));
        try {
            UserContextHeaders headers = newUserContextHeaders(
                    new UserContextClaims("analyst_01", "分析用户", false, false)
            );
            Map<String, String> map = headers.buildHeaders();

            assertEquals("3", map.get("X-DE-USER-ID"));
            assertEquals("99", map.get("X-DE-ORG-ID"));
            assertEquals("false", map.get("X-DE-IS-ADMIN"));
            assertEquals("false", map.get("X-DE-IS-WS-ADMIN"));
        } finally {
            AuthUtils.remove();
        }
    }

    private static String hmacSha256(String secret, String payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    }

    private static UserContextHeaders newUserContextHeaders(UserContextClaims claims) {
        UserContextHeaders headers = new UserContextHeaders();
        ReflectionTestUtils.setField(headers, "claimsProviders", List.of(new FixedClaimsProvider(claims)));
        return headers;
    }

    private static class FixedClaimsProvider implements UserContextClaimsProvider {
        private final UserContextClaims claims;

        private FixedClaimsProvider(UserContextClaims claims) {
            this.claims = claims;
        }

        @Override
        public UserContextClaims claimsFor(Long userId) {
            return claims;
        }
    }

    private static class TestProxy extends BaseAiProxyServer {
        private HttpClientConfig exposeBuildConfig() {
            return buildConfig();
        }
    }

    private static class FakeSysParameterManage extends SysParameterManage {
        private final String secret;

        private FakeSysParameterManage(String secret) {
            this.secret = secret;
        }

        @Override
        public String singleVal(String key) {
            return "sqlbot.secret".equals(key) ? secret : null;
        }
    }
}
