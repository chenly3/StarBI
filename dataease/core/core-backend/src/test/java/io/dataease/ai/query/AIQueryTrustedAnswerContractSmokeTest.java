package io.dataease.ai.query;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.auth.bo.TokenUserBO;
import io.dataease.ai.query.server.AIQueryTrustedAnswerServer;
import io.dataease.ai.query.trusted.TrustedAnswerOpsService;
import io.dataease.ai.query.trusted.TrustedAnswerRuntimeContextService;
import io.dataease.ai.query.trusted.TrustedAnswerStubSqlBotProxy;
import io.dataease.ai.query.trusted.TrustedAnswerTraceStore;
import io.dataease.api.ai.query.request.AIQuerySqlBotRuntimeProxyRequest;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorVO;
import io.dataease.api.ai.query.vo.TrustedAnswerSseEventVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.utils.AuthUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import io.dataease.substitute.permissions.dataset.SubstituteDatasetExampleStore;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.apache.http.client.methods.HttpGet;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.lang.reflect.Method;
import java.util.Map;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AIQueryTrustedAnswerContractSmokeTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void requestShouldExposeCanonicalSnakeCaseJson() throws Exception {
        TrustedAnswerRequest request = new TrustedAnswerRequest();
        request.setQuestion("本月销售额是多少");
        request.setThemeId(1001L);
        request.setDatasourceId(2002L);
        request.setModelId("model-default");
        request.setChatId(3003L);

        String json = objectMapper.writeValueAsString(request);

        assertTrue(json.contains("\"question\":\"本月销售额是多少\""));
        assertTrue(json.contains("\"theme_id\":\"1001\""));
        assertTrue(json.contains("\"datasource_id\":\"2002\""));
        assertTrue(json.contains("\"model_id\":\"model-default\""));
        assertTrue(json.contains("\"chat_id\":\"3003\""));
    }

    @Test
    void traceShouldExposeStateContextAndRedactedEvidence() throws Exception {
        TrustedAnswerContextVO context = new TrustedAnswerContextVO();
        context.setThemeId(1001L);
        context.setThemeName("销售分析");
        context.setDatasetIds(List.of(11L, 12L));
        context.setDefaultDatasetIds(List.of(11L));
        context.setDatasourceIds(List.of(22L));
        context.setVisibleFieldCount(8);
        context.setExcludedDatasetIds(List.of(99L));
        context.setExcludedFieldCount(3);

        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId("trace-1");
        trace.setState(TrustedAnswerState.TRUSTED);
        trace.setContext(context);
        trace.setMatchedTerms(List.of("销售额"));
        trace.setMatchedSqlExamples(List.of("按月统计销售额"));
        trace.setPermissionSteps(List.of("column-filtered", "row-permission-applied"));

        String json = objectMapper.writeValueAsString(trace);

        assertTrue(json.contains("\"trace_id\":\"trace-1\""));
        assertTrue(json.contains("\"state\":\"TRUSTED\""));
        assertTrue(json.contains("\"theme_id\":\"1001\""));
        assertTrue(json.contains("\"dataset_ids\":[\"11\",\"12\"]"));
        assertTrue(json.contains("\"visible_field_count\":8"));
        assertTrue(json.contains("\"excluded_field_count\":3"));
        assertTrue(json.contains("\"permission_steps\":[\"column-filtered\",\"row-permission-applied\"]"));
    }

    @Test
    void errorCodeShouldBuildActionableErrorPayload() {
        TrustedAnswerErrorVO error = TrustedAnswerErrorCode.NO_AUTHORIZED_DATASET.toError();

        assertEquals("NO_AUTHORIZED_DATASET", error.getCode());
        assertEquals(TrustedAnswerState.NO_AUTHORIZED_CONTEXT, error.getState());
        assertEquals("resolve-authorized-datasets", error.getTraceStep());
        assertEquals(Boolean.FALSE, error.getRetryable());
        assertTrue(error.getMessage().contains("没有可问资源"));
        assertTrue(error.getCause().contains("权限"));
        assertTrue(error.getFix().contains("权限"));
        assertNotNull(error.getUserVisibleMessage());
        assertNotNull(error.getAdminVisibleDetail());
    }

    @Test
    void sseEventShouldCarryTraceStateDataAndError() throws Exception {
        TrustedAnswerSseEventVO event = TrustedAnswerSseEventVO.error(
                "trace-1",
                TrustedAnswerErrorCode.SQLBOT_UNAVAILABLE.toError()
        );

        String json = objectMapper.writeValueAsString(event);

        assertTrue(json.contains("\"event\":\"error\""));
        assertTrue(json.contains("\"trace_id\":\"trace-1\""));
        assertTrue(json.contains("\"state\":\"FAILED\""));
        assertTrue(json.contains("\"code\":\"SQLBOT_UNAVAILABLE\""));
        assertTrue(json.contains("\"done\":true"));
    }

    @Test
    void sseEventShouldFallbackWhenErrorPayloadIsMissing() throws Exception {
        TrustedAnswerSseEventVO event = TrustedAnswerSseEventVO.error("trace-1", null);

        String json = objectMapper.writeValueAsString(event);

        assertTrue(json.contains("\"event\":\"error\""));
        assertTrue(json.contains("\"state\":\"FAILED\""));
        assertTrue(json.contains("\"code\":\"SQLBOT_UNAVAILABLE\""));
        assertTrue(json.contains("\"done\":true"));
    }

    @Test
    void stubStreamShouldEmitErrorForNonTrustedTraceWithMissingError() throws Exception {
        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId("trace-null-error");
        trace.setState(TrustedAnswerState.NO_AUTHORIZED_CONTEXT);
        MockHttpServletResponse response = new MockHttpServletResponse();

        new TrustedAnswerStubSqlBotProxy(null).stream(trace, new TrustedAnswerRequest(), null, response);

        String body = response.getContentAsString();
        assertTrue(response.getContentType().startsWith("text/event-stream"));
        assertTrue(body.contains("event: error"));
        assertTrue(body.contains("\"trace_id\":\"trace-null-error\""));
        assertTrue(body.contains("\"code\":\"SQLBOT_UNAVAILABLE\""));
        assertTrue(body.contains("\"done\":true"));
    }

    @Test
    void streamEndpointShouldEmitSseErrorWhenRuntimeContextFails() throws Exception {
        TrustedAnswerTraceStore traceStore = new TrustedAnswerTraceStore();
        TrustedAnswerRuntimeContextService runtimeContextService = new TrustedAnswerRuntimeContextService(null, null, traceStore, null) {
            @Override
            public TrustedAnswerTraceVO buildTrace(TrustedAnswerRequest request) {
                throw new IllegalStateException("boom");
            }
        };
        AIQueryTrustedAnswerServer server = new AIQueryTrustedAnswerServer(
                runtimeContextService,
                new TrustedAnswerStubSqlBotProxy(null),
                traceStore,
                new TrustedAnswerOpsService(traceStore)
        );
        MockHttpServletResponse response = new MockHttpServletResponse();

        server.stream(new TrustedAnswerRequest(), null, response);

        String body = response.getContentAsString();
        assertTrue(response.getContentType().startsWith("text/event-stream"));
        assertTrue(body.contains("event: error"));
        assertTrue(body.contains("\"state\":\"FAILED\""));
        assertTrue(body.contains("\"code\":\"SQLBOT_UNAVAILABLE\""));
    }

    @Test
    void sqlbotEventShouldCarryRawRuntimePayloadThroughTrustedAnswerWrapper() throws Exception {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("sqlbot");
        event.setTraceId("trace-real");
        event.setState(TrustedAnswerState.TRUSTED);
        event.setData(java.util.Map.of("sqlbot_event", java.util.Map.of(
                "type", "sql",
                "content", "select 1"
        )));
        event.setDone(false);

        String json = objectMapper.writeValueAsString(event);

        assertTrue(json.contains("\"event\":\"sqlbot\""));
        assertTrue(json.contains("\"trace_id\":\"trace-real\""));
        assertTrue(json.contains("\"type\":\"sql\""));
        assertTrue(json.contains("\"content\":\"select 1\""));
    }

    @Test
    void wrappedSqlbotStreamEventsShouldPreserveTrustedTraceForFrontendLineage() throws Exception {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("sqlbot");
        event.setTraceId("ta-lineage");
        event.setState(TrustedAnswerState.TRUSTED);
        event.setData(Map.of("sqlbot_event", Map.of(
                "type", "id",
                "id", 68
        )));
        event.setDone(false);

        String json = objectMapper.writeValueAsString(event);

        assertTrue(json.contains("\"trace_id\":\"ta-lineage\""));
        assertTrue(json.contains("\"trusted_answer_done\":false")
                || json.contains("\"done\":false"));
        assertTrue(json.contains("\"type\":\"id\""));
    }

    @Test
    void trustedAnswerServerShouldExposeTypedEndpoints() throws Exception {
        Method streamMethod = AIQueryTrustedAnswerServer.class.getMethod(
                "stream",
                TrustedAnswerRequest.class,
                HttpServletRequest.class,
                HttpServletResponse.class
        );
        Method sqlBotRuntimeMethod = AIQueryTrustedAnswerServer.class.getMethod(
                "sqlBotRuntime",
                AIQuerySqlBotRuntimeProxyRequest.class,
                HttpServletRequest.class,
                HttpServletResponse.class
        );
        Method traceMethod = AIQueryTrustedAnswerServer.class.getMethod("trace", String.class);
        Method trustHealthMethod = AIQueryTrustedAnswerServer.class.getMethod("trustHealth");
        Method repairQueueMethod = AIQueryTrustedAnswerServer.class.getMethod("repairQueue");

        assertEquals(Void.TYPE, streamMethod.getReturnType());
        assertEquals(Void.TYPE, sqlBotRuntimeMethod.getReturnType());
        assertEquals(TrustedAnswerTraceVO.class, traceMethod.getReturnType());
        assertNotNull(trustHealthMethod.getReturnType());
        assertEquals(List.class, repairQueueMethod.getReturnType());
    }

    @Test
    void assistantCertificateShouldCarryCurrentDataEaseTokenAsHeader() throws Exception {
        TrustedAnswerContextVO context = new TrustedAnswerContextVO();
        context.setThemeId(1001L);
        context.setThemeName("销售分析");
        context.setDatasourceId(2002L);
        context.setDatasetIds(List.of(11L, 12L));

        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setContext(context);

        Method method = TrustedAnswerStubSqlBotProxy.class.getDeclaredMethod(
                "encodeAssistantCertificate",
                TrustedAnswerTraceVO.class,
                String.class
        );
        method.setAccessible(true);
        String encoded = String.valueOf(method.invoke(new TrustedAnswerStubSqlBotProxy(null), trace, "de-token-qa"));
        String raw = URLDecoder.decode(
                new String(java.util.Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8),
                StandardCharsets.UTF_8
        );

        assertTrue(raw.contains("\"target\":\"header\""));
        assertTrue(raw.contains("\"key\":\"X-DE-TOKEN\""));
        assertTrue(raw.contains("\"value\":\"de-token-qa\""));
        assertTrue(raw.contains("\"key\":\"datasetIds\""));
        assertTrue(raw.contains("\"value\":\"11,12\""));
    }

    @Test
    void runtimeProxyShouldForwardDataEaseUserHeadersFromCurrentToken() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-DE-TOKEN", "header." + java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"uid\":1,\"oid\":2}".getBytes(StandardCharsets.UTF_8)) + ".signature");
        HttpGet proxyRequest = new HttpGet("http://127.0.0.1:8000/api/v1/chat/36/with_data");

        Method method = TrustedAnswerStubSqlBotProxy.class.getDeclaredMethod(
                "appendDataEaseUserHeaders",
                org.apache.http.client.methods.HttpRequestBase.class,
                HttpServletRequest.class
        );
        method.setAccessible(true);
        method.invoke(new TrustedAnswerStubSqlBotProxy(null), proxyRequest, request);

        assertEquals("1", proxyRequest.getFirstHeader("X-DE-USER-ID").getValue());
        assertEquals("2", proxyRequest.getFirstHeader("X-DE-ORG-ID").getValue());
    }

    @Test
    void runtimeProxyShouldFallbackOrgHeaderFromTokenWhenAuthUserHasNoOrg() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-DE-TOKEN", "header." + java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString("{\"uid\":4,\"oid\":44}".getBytes(StandardCharsets.UTF_8)) + ".signature");
        HttpGet proxyRequest = new HttpGet("http://127.0.0.1:8000/api/v1/chat/36/with_data");

        Method method = TrustedAnswerStubSqlBotProxy.class.getDeclaredMethod(
                "appendDataEaseUserHeaders",
                org.apache.http.client.methods.HttpRequestBase.class,
                HttpServletRequest.class
        );
        method.setAccessible(true);

        try {
            AuthUtils.setUser(new TokenUserBO(4L, null));
            method.invoke(new TrustedAnswerStubSqlBotProxy(null), proxyRequest, request);
        } finally {
            AuthUtils.remove();
        }

        assertEquals("4", proxyRequest.getFirstHeader("X-DE-USER-ID").getValue());
        assertEquals("44", proxyRequest.getFirstHeader("X-DE-ORG-ID").getValue());
    }

    @Test
    void wrappedSqlbotSseShouldPreserveMultiLineDataBlocks() throws Exception {
        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId("ta-multiline");
        trace.setState(TrustedAnswerState.TRUSTED);
        MockHttpServletResponse response = new MockHttpServletResponse();

        Method method = TrustedAnswerStubSqlBotProxy.class.getDeclaredMethod(
                "forwardSqlBotSseBlock",
                TrustedAnswerTraceVO.class,
                String.class,
                HttpServletResponse.class
        );
        method.setAccessible(true);
        method.invoke(
                new TrustedAnswerStubSqlBotProxy(null),
                trace,
                "event: message\n"
                        + "data: {\"type\":\"sql\",\n"
                        + "data: \"content\":\"select 1\"}",
                response
        );

        String body = response.getContentAsString();

        assertTrue(body.contains("event: sqlbot"));
        assertTrue(body.contains("\"trace_id\":\"ta-multiline\""));
        assertTrue(body.contains("\"type\":\"sql\""));
        assertTrue(body.contains("\"content\":\"select 1\""));
    }

    @Test
    void sqlbotRuntimeFailureShouldAttachActionableDetailToTraceError() throws Exception {
        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId("ta-sqlbot-403");
        trace.setState(TrustedAnswerState.TRUSTED);
        MockHttpServletResponse response = new MockHttpServletResponse();

        Method method = TrustedAnswerStubSqlBotProxy.class.getDeclaredMethod(
                "writeSqlBotError",
                HttpServletResponse.class,
                TrustedAnswerTraceVO.class,
                String.class
        );
        method.setAccessible(true);
        method.invoke(
                new TrustedAnswerStubSqlBotProxy(null),
                response,
                trace,
                "SQLBot /chat/question returned HTTP 403: permission denied"
        );

        String body = response.getContentAsString();

        assertEquals(TrustedAnswerState.FAILED, trace.getState());
        assertEquals("SQLBOT_UNAVAILABLE", trace.getError().getCode());
        assertTrue(trace.getError().getAdminVisibleDetail().contains("HTTP 403"));
        assertTrue(trace.getPermissionSteps().contains("sqlbot-runtime-failed"));
        assertTrue(body.contains("\"code\":\"SQLBOT_UNAVAILABLE\""));
        assertTrue(body.contains("HTTP 403"));
    }
}
