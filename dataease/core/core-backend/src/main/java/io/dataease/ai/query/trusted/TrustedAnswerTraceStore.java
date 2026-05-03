package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TrustedAnswerTraceStore {

    private final Map<String, TrustedAnswerTraceVO> traces = new ConcurrentHashMap<>();

    public void put(TrustedAnswerTraceVO trace) {
        if (trace != null && trace.getTraceId() != null) {
            traces.put(trace.getTraceId(), trace);
        }
    }

    public TrustedAnswerTraceVO get(String traceId) {
        return traces.get(traceId);
    }

    public List<TrustedAnswerTraceVO> recent() {
        return traces.values().stream()
                .sorted(Comparator.comparing(TrustedAnswerTraceVO::getTraceId).reversed())
                .limit(50)
                .collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
    }

    public void clear() {
        traces.clear();
    }
}
