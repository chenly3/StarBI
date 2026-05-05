package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerCorrectionTodoVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorVO;
import io.dataease.api.ai.query.vo.TrustedAnswerRepairItemVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTrustHealthVO;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TrustedAnswerOpsService {

    private final TrustedAnswerTraceStore traceStore;
    private final TrustedAnswerCorrectionTodoService correctionTodoService;

    public TrustedAnswerOpsService(TrustedAnswerTraceStore traceStore) {
        this(traceStore, null);
    }

    @Autowired
    public TrustedAnswerOpsService(
            TrustedAnswerTraceStore traceStore,
            TrustedAnswerCorrectionTodoService correctionTodoService
    ) {
        this.traceStore = traceStore;
        this.correctionTodoService = correctionTodoService;
    }

    public TrustedAnswerTrustHealthVO trustHealth() {
        List<TrustedAnswerTraceVO> traces = traceStore.recent();
        int totalCount = traces.size();
        int trustedCount = (int) traces.stream()
                .filter(trace -> trace.getState() == TrustedAnswerState.TRUSTED)
                .count();
        int blockingCount = (int) traces.stream()
                .filter(trace -> isRepairState(trace.getState()))
                .count();

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
                .filter(trace -> isRepairState(trace.getState()))
                .map(this::toRepairItem)
                .toList();
    }

    public List<TrustedAnswerRepairItemVO> repairQueue(
            String role,
            String tenantId,
            String workspaceId,
            String userId
    ) {
        List<TrustedAnswerRepairItemVO> traceItems = traceStore.recent().stream()
                .filter(trace -> isVisibleTrace(trace, role, tenantId, workspaceId, userId))
                .filter(trace -> isRepairState(trace.getState()))
                .map(this::toRepairItem)
                .toList();
        if (correctionTodoService == null) {
            return traceItems;
        }
        List<TrustedAnswerRepairItemVO> todoItems = correctionTodoService
                .listForScope(role, tenantId, workspaceId)
                .stream()
                .map(this::toRepairItem)
                .toList();
        return java.util.stream.Stream.concat(traceItems.stream(), todoItems.stream()).toList();
    }

    private boolean isRepairState(TrustedAnswerState state) {
        return state == TrustedAnswerState.NO_AUTHORIZED_CONTEXT
                || state == TrustedAnswerState.UNSAFE_BLOCKED
                || state == TrustedAnswerState.FAILED;
    }

    private TrustedAnswerRepairItemVO toRepairItem(TrustedAnswerTraceVO trace) {
        TrustedAnswerErrorVO error = trace.getError();
        TrustedAnswerContextVO context = trace.getContext();

        TrustedAnswerRepairItemVO item = new TrustedAnswerRepairItemVO();
        item.setTraceId(trace.getTraceId());
        item.setSourceType("trace");
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

    private TrustedAnswerRepairItemVO toRepairItem(TrustedAnswerCorrectionTodoVO todo) {
        TrustedAnswerRepairItemVO item = new TrustedAnswerRepairItemVO();
        item.setTodoId(todo.getTodoId());
        item.setSourceType("correction_todo");
        item.setState(TrustedAnswerState.UNSAFE_BLOCKED);
        item.setErrorCode(todo.getDiagnosisType());
        item.setMessage(todo.getSanitizedQuestionSummary());
        item.setCause("用户反馈或系统诊断已进入准确率修正待办。");
        item.setFix("在运营修正台处理为术语、别名、规则、SQL 示例、推荐问题或资源重学任务。");
        item.setPrimaryAction("处理反馈");
        return item;
    }

    private boolean isVisibleTrace(
            TrustedAnswerTraceVO trace,
            String role,
            String tenantId,
            String workspaceId,
            String userId
    ) {
        if (trace == null || !hasOwner(trace)) {
            return true;
        }
        boolean sameUser = StringUtils.equals(trace.getOwnerUserId(), userId);
        boolean sameOrg = StringUtils.equals(trace.getOwnerOrgId(), tenantId)
                && StringUtils.equals(trace.getOwnerWorkspaceId(), workspaceId);
        if ("diagnosis_operator".equals(role)) {
            return sameOrg;
        }
        return sameUser && sameOrg;
    }

    private boolean hasOwner(TrustedAnswerTraceVO trace) {
        return StringUtils.isNotBlank(trace.getOwnerUserId())
                || StringUtils.isNotBlank(trace.getOwnerOrgId())
                || StringUtils.isNotBlank(trace.getOwnerWorkspaceId());
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
