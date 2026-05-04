package io.dataease.ai.query.server;

import io.dataease.ai.query.trusted.TrustedAnswerOpsService;
import io.dataease.ai.query.trusted.TrustedAnswerRuntimeContextService;
import io.dataease.ai.query.trusted.TrustedAnswerStubSqlBotProxy;
import io.dataease.ai.query.trusted.TrustedAnswerTraceStore;
import io.dataease.api.ai.query.request.AIQuerySqlBotRuntimeProxyRequest;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerRepairItemVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.ai.query.vo.TrustedAnswerTrustHealthVO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/ai/query/trusted-answer")
public class AIQueryTrustedAnswerServer {

    private final TrustedAnswerRuntimeContextService runtimeContextService;
    private final TrustedAnswerStubSqlBotProxy stubSqlBotProxy;
    private final TrustedAnswerTraceStore traceStore;
    private final TrustedAnswerOpsService opsService;

    public AIQueryTrustedAnswerServer(
            TrustedAnswerRuntimeContextService runtimeContextService,
            TrustedAnswerStubSqlBotProxy stubSqlBotProxy,
            TrustedAnswerTraceStore traceStore,
            TrustedAnswerOpsService opsService
    ) {
        this.runtimeContextService = runtimeContextService;
        this.stubSqlBotProxy = stubSqlBotProxy;
        this.traceStore = traceStore;
        this.opsService = opsService;
    }

    @PostMapping("/stream")
    public void stream(
            @RequestBody TrustedAnswerRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) throws IOException {
        try {
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
        return traceStore.get(traceId);
    }

    @GetMapping("/trust-health")
    public TrustedAnswerTrustHealthVO trustHealth() {
        return opsService.trustHealth();
    }

    @GetMapping("/repair-queue")
    public List<TrustedAnswerRepairItemVO> repairQueue() {
        return opsService.repairQueue();
    }
}
