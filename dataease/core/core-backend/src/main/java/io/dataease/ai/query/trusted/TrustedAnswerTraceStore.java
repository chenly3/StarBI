package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TrustedAnswerTraceStore {

    private static final int MAX_TRACES = 50;

    private final Map<String, TrustedAnswerTraceVO> traces = new ConcurrentHashMap<>();
    private final Deque<String> insertionOrder = new ConcurrentLinkedDeque<>();

    public synchronized void put(TrustedAnswerTraceVO trace) {
        if (trace != null && trace.getTraceId() != null) {
            if (!traces.containsKey(trace.getTraceId())) {
                insertionOrder.addLast(trace.getTraceId());
            }
            traces.put(trace.getTraceId(), trace);
            while (traces.size() > MAX_TRACES) {
                String oldestTraceId = insertionOrder.pollFirst();
                if (oldestTraceId == null) {
                    break;
                }
                traces.remove(oldestTraceId);
            }
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
        insertionOrder.clear();
    }
}
