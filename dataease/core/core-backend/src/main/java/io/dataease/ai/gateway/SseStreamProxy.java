package io.dataease.ai.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.utils.HttpClientConfig;
import io.dataease.utils.HttpClientUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class SseStreamProxy extends BaseAiProxyServer {

    private static final ObjectMapper mapper = new ObjectMapper();

    public void proxyChatStream(String question, Map<String, Object> context,
                                HttpServletResponse response) {
        Map<String, Object> body = new java.util.HashMap<>();
        body.put("question", question);
        // Map camelCase from DataEase to snake_case expected by SQLBot
        if (context.containsKey("chatId")) body.put("chat_id", context.get("chatId"));
        if (context.containsKey("datasetId")) body.put("datasource_id", context.get("datasetId"));
        if (context.containsKey("themeId")) body.put("ai_modal_id", context.get("themeId"));

        try {
            String jsonBody = mapper.writeValueAsString(body);
            HttpClientConfig config = buildConfig();
            config.addHeader("Content-Type", "application/json");
            config.addHeader("Accept", "text/event-stream");
            config.setSocketTimeout(300000);
            config.setConnectTimeout(10000);

            String result = HttpClientUtil.post(sqlbotBase + "/chat/question", jsonBody, config);

            response.setContentType("text/event-stream");
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Cache-Control", "no-cache");
            response.setHeader("Connection", "keep-alive");
            response.getWriter().write(result);
            response.getWriter().flush();
        } catch (Exception e) {
            throw new RuntimeException("SSE proxy failed: " + e.getClass().getSimpleName() + " - " + e.getMessage(), e);
        }
    }
}
