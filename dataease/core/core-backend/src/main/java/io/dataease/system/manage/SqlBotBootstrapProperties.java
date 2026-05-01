package io.dataease.system.manage;

import org.apache.commons.lang3.StringUtils;
import org.springframework.core.env.Environment;

record SqlBotBootstrapProperties(
        String domain,
        String assistantId,
        String assistantSecret,
        boolean enabled
) {

    static SqlBotBootstrapProperties from(Environment environment) {
        String domain = firstNonBlank(environment,
                "starbi.sqlbot.domain",
                "STARBI_SQLBOT_DOMAIN"
        );
        String assistantId = firstNonBlank(environment,
                "starbi.sqlbot.assistant-id",
                "starbi.sqlbot.assistant.id",
                "STARBI_SQLBOT_ASSISTANT_ID"
        );
        String assistantSecret = firstNonBlank(environment,
                "starbi.sqlbot.assistant-secret",
                "starbi.sqlbot.assistant.secret",
                "STARBI_SQLBOT_ASSISTANT_SECRET"
        );
        String enabledText = firstNonBlank(environment,
                "starbi.sqlbot.enabled",
                "STARBI_SQLBOT_ENABLED"
        );
        boolean enabled = StringUtils.isBlank(enabledText) || Boolean.parseBoolean(enabledText);
        return new SqlBotBootstrapProperties(
                StringUtils.trimToEmpty(domain),
                StringUtils.trimToEmpty(assistantId),
                StringUtils.trimToEmpty(assistantSecret),
                enabled
        );
    }

    private static String firstNonBlank(Environment environment, String... keys) {
        for (String key : keys) {
            String value = environment.getProperty(key);
            if (StringUtils.isNotBlank(value)) {
                return value;
            }
        }
        return "";
    }

    boolean configured() {
        return enabled
                && StringUtils.isNoneBlank(domain, assistantId, assistantSecret);
    }
}
