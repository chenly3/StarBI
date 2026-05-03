package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorVO;
import io.dataease.api.ai.query.vo.TrustedAnswerRepairItemVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTrustHealthVO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TrustedAnswerOpsService {

    private final TrustedAnswerTraceStore traceStore;

    public TrustedAnswerOpsService(TrustedAnswerTraceStore traceStore) {
        this.traceStore = traceStore;
    }

    public TrustedAnswerTrustHealthVO trustHealth() {
        List<TrustedAnswerTraceVO> traces = traceStore.recent();
        int totalCount = traces.size();
        int trustedCount = (int) traces.stream()
                .filter(trace -> trace.getState() == TrustedAnswerState.TRUSTED)
                .count();
        int blockingCount = totalCount - trustedCount;

        TrustedAnswerTrustHealthVO health = new TrustedAnswerTrustHealthVO();
        health.setTotalTraceCount(totalCount);
        health.setTrustedTraceCount(trustedCount);
        health.setBlockingIssueCount(blockingCount);
        health.setTrustedRate(totalCount == 0 ? 0 : Math.round(trustedCount * 100f / totalCount));
        health.setTrusted(totalCount > 0 && blockingCount == 0);
        return health;
    }

    public List<TrustedAnswerRepairItemVO> repairQueue() {
        return traceStore.recent().stream()
                .filter(trace -> trace.getState() != TrustedAnswerState.TRUSTED)
                .map(this::toRepairItem)
                .toList();
    }

    private TrustedAnswerRepairItemVO toRepairItem(TrustedAnswerTraceVO trace) {
        TrustedAnswerErrorVO error = trace.getError();
        TrustedAnswerContextVO context = trace.getContext();

        TrustedAnswerRepairItemVO item = new TrustedAnswerRepairItemVO();
        item.setTraceId(trace.getTraceId());
        item.setState(trace.getState());
        item.setThemeName(context == null ? null : context.getThemeName());
        if (error != null) {
            item.setErrorCode(error.getCode());
            item.setMessage(error.getMessage());
            item.setCause(error.getCause());
            item.setFix(error.getFix());
            item.setPrimaryAction(primaryAction(error.getCode()));
        } else {
            item.setPrimaryAction("查看 Trace");
        }
        return item;
    }

    private String primaryAction(String errorCode) {
        if ("NO_AUTHORIZED_DATASET".equals(errorCode) || "THEME_NOT_VISIBLE".equals(errorCode)) {
            return "修复权限";
        }
        if ("NO_VISIBLE_FIELD".equals(errorCode)) {
            return "修复列权限";
        }
        if ("MULTI_DATASOURCE_AMBIGUOUS".equals(errorCode)) {
            return "选择数据源";
        }
        if ("ROW_PERMISSION_REBUILD_FAILED".equals(errorCode)) {
            return "修复行权限";
        }
        if ("SQLBOT_CONFIG_MISSING".equals(errorCode) || "SQLBOT_UNAVAILABLE".equals(errorCode)) {
            return "检查 SQLBot";
        }
        return "查看 Trace";
    }
}
