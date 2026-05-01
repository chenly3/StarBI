package io.dataease.ai.query.server;

import io.dataease.ai.gateway.BaseAiProxyServer;
import io.dataease.utils.HttpClientUtil;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/ai/query/ops")
public class AIQueryOpsServer extends BaseAiProxyServer {

    @GetMapping("/dashboard")
    public Map<String, Object> opsDashboard() {
        String response = HttpClientUtil.get(sqlbotBase + "/analytics/dashboard", buildConfig());
        return normalizer.parseMap(response);
    }
}
