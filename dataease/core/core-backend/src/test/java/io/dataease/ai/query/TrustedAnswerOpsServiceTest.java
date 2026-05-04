package io.dataease.ai.query;

import io.dataease.ai.query.trusted.TrustedAnswerOpsService;
import io.dataease.ai.query.trusted.TrustedAnswerTraceStore;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerRepairItemVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTrustHealthVO;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrustedAnswerOpsServiceTest {

    @Test
    void trustHealthShouldUseTraceEvidenceOnly() {
        TrustedAnswerTraceStore traceStore = new TrustedAnswerTraceStore();
        traceStore.put(trace("ta-1", TrustedAnswerState.TRUSTED, null));
        traceStore.put(trace("ta-2", TrustedAnswerState.UNSAFE_BLOCKED, TrustedAnswerErrorCode.NO_VISIBLE_FIELD));
        traceStore.put(trace("ta-3", TrustedAnswerState.NEEDS_CLARIFICATION, TrustedAnswerErrorCode.THEME_REQUIRED));
        traceStore.put(trace("ta-4", TrustedAnswerState.PARTIAL, null));

        TrustedAnswerOpsService service = new TrustedAnswerOpsService(traceStore);
        TrustedAnswerTrustHealthVO health = service.trustHealth();

        assertEquals(4, health.getTotalTraceCount());
        assertEquals(1, health.getTrustedTraceCount());
        assertEquals(1, health.getBlockingIssueCount());
        assertEquals(25, health.getTrustedRate());
        assertEquals(Boolean.FALSE, health.getTrusted());
    }

    @Test
    void repairQueueShouldContainNonTrustedTraceItems() {
        TrustedAnswerTraceStore traceStore = new TrustedAnswerTraceStore();
        traceStore.put(trace("ta-1", TrustedAnswerState.TRUSTED, null));
        traceStore.put(trace("ta-2", TrustedAnswerState.NO_AUTHORIZED_CONTEXT, TrustedAnswerErrorCode.NO_AUTHORIZED_DATASET));
        traceStore.put(trace("ta-3", TrustedAnswerState.NEEDS_CLARIFICATION, TrustedAnswerErrorCode.MULTI_DATASOURCE_AMBIGUOUS));
        traceStore.put(trace("ta-4", TrustedAnswerState.PARTIAL, null));

        TrustedAnswerOpsService service = new TrustedAnswerOpsService(traceStore);
        List<TrustedAnswerRepairItemVO> repairItems = service.repairQueue();

        assertEquals(1, repairItems.size());
        assertEquals("ta-2", repairItems.get(0).getTraceId());
        assertEquals("NO_AUTHORIZED_DATASET", repairItems.get(0).getErrorCode());
        assertEquals("修复权限", repairItems.get(0).getPrimaryAction());
    }

    private static TrustedAnswerTraceVO trace(
            String traceId,
            TrustedAnswerState state,
            TrustedAnswerErrorCode errorCode
    ) {
        TrustedAnswerContextVO context = new TrustedAnswerContextVO();
        context.setThemeId(1001L);
        context.setThemeName("销售分析");

        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId(traceId);
        trace.setState(state);
        trace.setContext(context);
        if (errorCode != null) {
            trace.setError(errorCode.toError());
        }
        return trace;
    }
}
