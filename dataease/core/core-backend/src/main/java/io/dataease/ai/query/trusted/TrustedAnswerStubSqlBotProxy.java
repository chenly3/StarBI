package io.dataease.ai.query.trusted;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.api.ai.query.vo.TrustedAnswerSseEventVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class TrustedAnswerStubSqlBotProxy {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public void stream(TrustedAnswerTraceVO trace, HttpServletResponse response) throws IOException {
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        write(response, TrustedAnswerSseEventVO.trace(trace.getTraceId(), trace.getState(), trace));

        if (trace.getState() != TrustedAnswerState.TRUSTED) {
            write(response, TrustedAnswerSseEventVO.error(trace.getTraceId(), trace.getError()));
            response.getWriter().flush();
            return;
        }

        Map<String, Object> answer = new LinkedHashMap<>();
        answer.put("text", "已基于可信问数上下文生成模拟答案。");
        answer.put("chart_type", "table");
        answer.put("trusted", true);
        write(response, TrustedAnswerSseEventVO.answer(trace.getTraceId(), answer));
        write(response, TrustedAnswerSseEventVO.done(trace.getTraceId(), trace.getState()));
        response.getWriter().flush();
    }

    private void write(HttpServletResponse response, TrustedAnswerSseEventVO event) throws IOException {
        response.getWriter().write("event: " + event.getEvent() + "\n");
        response.getWriter().write("data: " + objectMapper.writeValueAsString(event) + "\n\n");
    }
}
