package io.dataease.system.manage;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SqlBotBootstrapPropertiesTest {

    @Test
    void shouldBeEnabledOnlyWhenDomainIdAndSecretAreProvided() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("starbi.sqlbot.domain", "http://starbi-sqlbot:8000")
                .withProperty("starbi.sqlbot.assistant-id", "1")
                .withProperty("starbi.sqlbot.assistant-secret", "secret");

        SqlBotBootstrapProperties properties = SqlBotBootstrapProperties.from(environment);

        assertTrue(properties.configured());
    }

    @Test
    void shouldReadEnvStylePropertyNames() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("STARBI_SQLBOT_DOMAIN", "http://starbi-sqlbot:8000")
                .withProperty("STARBI_SQLBOT_ASSISTANT_ID", "1")
                .withProperty("STARBI_SQLBOT_ASSISTANT_SECRET", "secret");

        SqlBotBootstrapProperties properties = SqlBotBootstrapProperties.from(environment);

        assertTrue(properties.configured());
    }

    @Test
    void shouldStayDisabledWhenAnyRequiredPropertyIsMissing() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("starbi.sqlbot.domain", "http://starbi-sqlbot:8000")
                .withProperty("starbi.sqlbot.assistant-id", "1");

        SqlBotBootstrapProperties properties = SqlBotBootstrapProperties.from(environment);

        assertFalse(properties.configured());
    }
}
