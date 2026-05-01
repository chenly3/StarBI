package io.dataease.system.manage;

import io.dataease.api.system.request.SQLBotConfigCreator;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class SqlBotConfigBootstrap implements ApplicationRunner {

    @Resource
    private Environment environment;

    @Resource
    private SysParameterManage sysParameterManage;

    @Override
    public void run(ApplicationArguments args) {
        if (existingConfigPresent()) {
            return;
        }

        SqlBotBootstrapProperties properties = SqlBotBootstrapProperties.from(environment);
        if (!properties.configured()) {
            return;
        }

        SQLBotConfigCreator creator = new SQLBotConfigCreator();
        creator.setDomain(properties.domain());
        creator.setId(properties.assistantId());
        creator.setSecret(properties.assistantSecret());
        creator.setEnabled(true);
        creator.setValid(true);
        sysParameterManage.saveSqlBotConfig(creator);
    }

    private boolean existingConfigPresent() {
        return StringUtils.isNoneBlank(
                sysParameterManage.singleVal("sqlbot.domain"),
                sysParameterManage.singleVal("sqlbot.id"),
                sysParameterManage.singleVal("sqlbot.secret"),
                sysParameterManage.singleVal("sqlbot.enabled"),
                sysParameterManage.singleVal("sqlbot.valid")
        );
    }
}
