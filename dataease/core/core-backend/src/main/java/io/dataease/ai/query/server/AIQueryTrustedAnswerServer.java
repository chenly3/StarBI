package io.dataease.ai.query.server;

import io.dataease.ai.query.trusted.TrustedAnswerOpsService;
import io.dataease.ai.query.trusted.TrustedAnswerActionContractService;
import io.dataease.ai.query.trusted.TrustedAnswerCorrectionTodoService;
import io.dataease.ai.query.trusted.TrustedAnswerRuntimeContextService;
import io.dataease.ai.query.trusted.TrustedAnswerRuntimePolicyService;
import io.dataease.ai.query.trusted.TrustedAnswerSemanticPatchService;
import io.dataease.ai.query.trusted.TrustedAnswerSensitivePayloadService;
import io.dataease.ai.query.trusted.TrustedAnswerStubSqlBotProxy;
import io.dataease.ai.query.trusted.TrustedAnswerTraceStore;
import io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO;
import io.dataease.api.ai.query.request.AIQuerySqlBotRuntimeProxyRequest;
import io.dataease.api.ai.query.request.TrustedAnswerCorrectionFeedbackRequest;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.request.TrustedAnswerSemanticPatchRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerActionType;
import io.dataease.api.ai.query.vo.TrustedAnswerCorrectionTodoVO;
import io.dataease.api.ai.query.vo.TrustedAnswerEndpointContractVO;
import io.dataease.api.ai.query.vo.TrustedAnswerRepairItemVO;
import io.dataease.api.ai.query.vo.TrustedAnswerSemanticPatchVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTrustHealthVO;
import io.dataease.auth.bo.TokenUserBO;
import io.dataease.utils.AuthUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;
import org.apache.commons.lang3.StringUtils;

@RestController
@RequestMapping("/ai/query/trusted-answer")
public class AIQueryTrustedAnswerServer {

    private final TrustedAnswerRuntimeContextService runtimeContextService;
    private final TrustedAnswerStubSqlBotProxy stubSqlBotProxy;
    private final TrustedAnswerTraceStore traceStore;
    private final TrustedAnswerOpsService opsService;
    private final TrustedAnswerActionContractService actionContractService;
    private final TrustedAnswerCorrectionTodoService correctionTodoService;
    private final TrustedAnswerSemanticPatchService semanticPatchService;
    private final TrustedAnswerRuntimePolicyService runtimePolicyService;

    public AIQueryTrustedAnswerServer(
            TrustedAnswerRuntimeContextService runtimeContextService,
            TrustedAnswerStubSqlBotProxy stubSqlBotProxy,
            TrustedAnswerTraceStore traceStore,
            TrustedAnswerOpsService opsService
    ) {
        this(
                runtimeContextService,
                stubSqlBotProxy,
                traceStore,
                opsService,
                new TrustedAnswerActionContractService(),
                new TrustedAnswerCorrectionTodoService(new TrustedAnswerSensitivePayloadService("unit-test-secret")),
                new TrustedAnswerSemanticPatchService(),
                new TrustedAnswerRuntimePolicyService((java.util.function.Function<String, String>) key -> null)
        );
    }

    @Autowired
    public AIQueryTrustedAnswerServer(
            TrustedAnswerRuntimeContextService runtimeContextService,
            TrustedAnswerStubSqlBotProxy stubSqlBotProxy,
            TrustedAnswerTraceStore traceStore,
            TrustedAnswerOpsService opsService,
            TrustedAnswerActionContractService actionContractService,
            TrustedAnswerCorrectionTodoService correctionTodoService,
            TrustedAnswerSemanticPatchService semanticPatchService,
            TrustedAnswerRuntimePolicyService runtimePolicyService
    ) {
        this.runtimeContextService = runtimeContextService;
        this.stubSqlBotProxy = stubSqlBotProxy;
        this.traceStore = traceStore;
        this.opsService = opsService;
        this.actionContractService = actionContractService == null
                ? new TrustedAnswerActionContractService()
                : actionContractService;
        if (correctionTodoService == null) {
            throw new IllegalArgumentException("trusted answer correction todo service is required");
        }
        this.correctionTodoService = correctionTodoService;
        this.semanticPatchService = semanticPatchService == null
                ? new TrustedAnswerSemanticPatchService()
                : semanticPatchService;
        this.runtimePolicyService = runtimePolicyService == null
                ? new TrustedAnswerRuntimePolicyService((java.util.function.Function<String, String>) key -> null)
                : runtimePolicyService;
    }

    public AIQueryTrustedAnswerServer(
            TrustedAnswerRuntimeContextService runtimeContextService,
            TrustedAnswerStubSqlBotProxy stubSqlBotProxy,
            TrustedAnswerTraceStore traceStore,
            TrustedAnswerOpsService opsService,
            TrustedAnswerActionContractService actionContractService,
            TrustedAnswerCorrectionTodoService correctionTodoService,
            TrustedAnswerSemanticPatchService semanticPatchService
    ) {
        this(
                runtimeContextService,
                stubSqlBotProxy,
                traceStore,
                opsService,
                actionContractService,
                correctionTodoService,
                semanticPatchService,
                new TrustedAnswerRuntimePolicyService((java.util.function.Function<String, String>) key -> null)
        );
    }

    @PostMapping("/stream")
    public void stream(
            @RequestBody TrustedAnswerRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) throws IOException {
        try {
            if (request == null) {
                request = new TrustedAnswerRequest();
            }
            if (request.getActionType() == null) {
                request.setActionType(TrustedAnswerActionType.BASIC_ASK);
            }
            TrustedAnswerTraceVO trace = runtimeContextService.buildTrace(request);
            stubSqlBotProxy.stream(trace, request, httpRequest, response);
        } catch (Exception e) {
            if (!response.isCommitted()) {
                stubSqlBotProxy.streamError(response);
            }
        }
    }

    @PostMapping("/sqlbot-runtime")
    public void sqlBotRuntime(
            @RequestBody AIQuerySqlBotRuntimeProxyRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) throws IOException {
        stubSqlBotProxy.proxyRuntime(request, httpRequest, response);
    }

    @GetMapping("/trace/{traceId}")
    public TrustedAnswerTraceVO trace(@PathVariable("traceId") String traceId) {
        TrustedAnswerTraceVO trace = traceStore.get(traceId);
        assertTraceVisible(trace);
        return trace;
    }

    @GetMapping("/trust-health")
    public TrustedAnswerTrustHealthVO trustHealth() {
        return opsService.trustHealth();
    }

    @GetMapping("/repair-queue")
    public List<TrustedAnswerRepairItemVO> repairQueue() {
        CurrentUserScope scope = currentUserScope();
        return opsService.repairQueue(
                AuthUtils.isSysAdmin() ? "diagnosis_operator" : "resource_owner",
                scope.tenantId(),
                scope.workspaceId(),
                scope.userId()
        );
    }

    @GetMapping("/contracts")
    public List<TrustedAnswerEndpointContractVO> contracts() {
        return actionContractService.contracts();
    }

    @GetMapping("/runtime-policy")
    public TrustedAnswerRuntimePolicyVO runtimePolicy() {
        return runtimePolicyService.load();
    }

    @PostMapping("/correction-todos")
    public TrustedAnswerCorrectionTodoVO createCorrectionTodo(
            @RequestBody TrustedAnswerCorrectionFeedbackRequest request,
            HttpServletRequest httpRequest
    ) {
        CurrentUserScope scope = currentUserScope();
        return correctionTodoService.create(
                scope.tenantId(),
                scope.workspaceId(),
                scope.userId(),
                request
        );
    }

    @GetMapping("/correction-todos")
    public List<TrustedAnswerCorrectionTodoVO> correctionTodos(HttpServletRequest httpRequest) {
        CurrentUserScope scope = currentUserScope();
        return correctionTodoService.listForScope(
                AuthUtils.isSysAdmin() ? "diagnosis_operator" : "resource_owner",
                scope.tenantId(),
                scope.workspaceId()
        );
    }

    @PostMapping("/semantic-patches")
    public TrustedAnswerSemanticPatchVO applySemanticPatch(
            @RequestBody TrustedAnswerSemanticPatchRequest request
    ) {
        return semanticPatchService.apply(request);
    }

    @GetMapping("/semantic-patches")
    public List<TrustedAnswerSemanticPatchVO> semanticPatches() {
        return semanticPatchService.listAll();
    }

    @PostMapping("/history-restore-trace")
    public TrustedAnswerTraceVO historyRestoreTrace(@RequestBody TrustedAnswerRequest request) {
        if (request == null) {
            request = new TrustedAnswerRequest();
        }
        request.setActionType(TrustedAnswerActionType.HISTORY_RESTORE);
        return runtimeContextService.buildTrace(request);
    }

    @PostMapping("/dashboard/ask")
    public TrustedAnswerTraceVO dashboardAsk(@RequestBody TrustedAnswerRequest request) {
        if (request == null) {
            request = new TrustedAnswerRequest();
        }
        request.setActionType(TrustedAnswerActionType.DASHBOARD_ASK);
        return runtimeContextService.buildTrace(request);
    }

    @PostMapping("/file/ask")
    public TrustedAnswerTraceVO fileAsk(@RequestBody TrustedAnswerRequest request) {
        if (request == null) {
            request = new TrustedAnswerRequest();
        }
        request.setActionType(TrustedAnswerActionType.FILE_ASK);
        return runtimeContextService.buildTrace(request);
    }

    private CurrentUserScope currentUserScope() {
        TokenUserBO user = AuthUtils.getUser();
        if (user == null || user.getUserId() == null || user.getDefaultOid() == null) {
            throw new IllegalArgumentException("current DataEase user is required");
        }
        String oid = String.valueOf(user.getDefaultOid());
        return new CurrentUserScope(oid, oid, String.valueOf(user.getUserId()));
    }

    private record CurrentUserScope(String tenantId, String workspaceId, String userId) {
    }

    private void assertTraceVisible(TrustedAnswerTraceVO trace) {
        if (trace == null || !hasTraceOwner(trace) || AuthUtils.isSysAdmin()) {
            return;
        }
        CurrentUserScope scope = currentUserScope();
        boolean sameUser = StringUtils.equals(trace.getOwnerUserId(), scope.userId());
        boolean sameOrg = StringUtils.equals(trace.getOwnerOrgId(), scope.tenantId())
                && StringUtils.equals(trace.getOwnerWorkspaceId(), scope.workspaceId());
        if (!sameUser || !sameOrg) {
            throw new IllegalArgumentException("trusted trace is not visible to current user");
        }
    }

    private boolean hasTraceOwner(TrustedAnswerTraceVO trace) {
        return StringUtils.isNotBlank(trace.getOwnerUserId())
                || StringUtils.isNotBlank(trace.getOwnerOrgId())
                || StringUtils.isNotBlank(trace.getOwnerWorkspaceId());
    }
}
