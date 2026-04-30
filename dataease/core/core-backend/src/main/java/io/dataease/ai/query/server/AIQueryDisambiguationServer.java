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

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai/query/disambiguation")
public class AIQueryDisambiguationServer extends BaseAiProxyServer {

    private static final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/history")
    public Map<String, Object> history(@RequestParam MultiValueMap<String, String> params) {
        MultiValueMap<String, String> queryParams = params == null ? new LinkedMultiValueMap<>() : params;
        String url = sqlbotBase + "/disambiguation/history" + buildQueryString(queryParams);
        String response = HttpClientUtil.get(url, buildConfig());
        return normalizer.parseMap(response);
    }

    private String buildQueryString(MultiValueMap<String, String> params) {
        if (params == null || params.isEmpty()) {
            return "";
        }
        List<String> queryParts = new ArrayList<>();
        params.forEach((key, values) -> {
            if (values == null || values.isEmpty()) {
                queryParts.add(encode(key) + "=");
                return;
            }
            values.forEach(value -> queryParts.add(encode(key) + "=" + encode(value)));
        });
        return queryParts.isEmpty() ? "" : "?" + String.join("&", queryParts);
    }

    private String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
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
