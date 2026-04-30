package io.dataease.ai.query.server;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.ai.gateway.BaseAiProxyServer;
import io.dataease.utils.HttpClientConfig;
import io.dataease.utils.HttpClientUtil;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@RestController
@RequestMapping("/ai/query/disambiguation")
public class AIQueryDisambiguationServer extends BaseAiProxyServer {

    private static final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/history")
    public Map<String, Object> history(@RequestParam MultiValueMap<String, String> params) {
        MultiValueMap<String, String> queryParams = params == null ? new LinkedMultiValueMap<>() : params;
        String url = UriComponentsBuilder.fromHttpUrl(sqlbotBase + "/disambiguation/history")
                .queryParams(queryParams)
                .build()
                .encode()
                .toUriString();
        String response = HttpClientUtil.get(url, buildConfig());
        return normalizer.parseMap(response);
    }

    @PostMapping("/history")
    public Map<String, Object> saveHistory(@RequestBody Map<String, Object> body) throws Exception {
        HttpClientConfig config = buildConfig();
        config.addHeader("Content-Type", "application/json");
        String json = mapper.writeValueAsString(body);
        String response = HttpClientUtil.post(sqlbotBase + "/disambiguation/history", json, config);
        return normalizer.parseMap(response);
    }
}
