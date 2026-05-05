package io.dataease.ai.query.trusted;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.auth.bo.TokenUserBO;
import io.dataease.api.ai.query.request.AIQuerySqlBotRuntimeProxyRequest;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerActionType;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorVO;
import io.dataease.api.ai.query.vo.TrustedAnswerSseEventVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.system.vo.SQLBotConfigVO;
import io.dataease.constant.AuthConstant;
import io.dataease.exception.DEException;
import io.dataease.system.manage.SysParameterManage;
import io.dataease.utils.AuthUtils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpEntity;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpRequestBase;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@Component
public class TrustedAnswerStubSqlBotProxy {

    private static final Set<String> RUNTIME_ALLOWED_METHODS = Set.of("GET", "POST", "DELETE");
    private static final Set<String> RUNTIME_ALLOWED_HEADERS = Set.of(
            "accept",
            "accept-language",
            "content-type",
            "x-sqlbot-assistant-token",
            "x-sqlbot-assistant-certificate",
            "x-sqlbot-host-origin"
    );
    private static final int ERROR_DETAIL_LIMIT = 500;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SysParameterManage sysParameterManage;
    private final TrustedAnswerActionContractService actionContractService;
    private final TrustedAnswerRuntimePolicyService runtimePolicyService;
    private final TrustedAnswerFactBoundaryService factBoundaryService;
    private final TrustedAnswerTraceStore traceStore;

    public TrustedAnswerStubSqlBotProxy(SysParameterManage sysParameterManage) {
        this(
                sysParameterManage,
                new TrustedAnswerActionContractService(),
                new TrustedAnswerRuntimePolicyService(sysParameterManage),
                new TrustedAnswerTraceStore()
        );
    }

    @Autowired
    public TrustedAnswerStubSqlBotProxy(
            SysParameterManage sysParameterManage,
            TrustedAnswerActionContractService actionContractService,
            TrustedAnswerRuntimePolicyService runtimePolicyService,
            TrustedAnswerTraceStore traceStore
    ) {
        this.sysParameterManage = sysParameterManage;
        this.actionContractService = actionContractService == null
                ? new TrustedAnswerActionContractService()
                : actionContractService;
        this.runtimePolicyService = runtimePolicyService == null
                ? new TrustedAnswerRuntimePolicyService(sysParameterManage)
                : runtimePolicyService;
        this.factBoundaryService = new TrustedAnswerFactBoundaryService();
        this.traceStore = traceStore == null ? new TrustedAnswerTraceStore() : traceStore;
    }

    public TrustedAnswerStubSqlBotProxy(
            SysParameterManage sysParameterManage,
            TrustedAnswerActionContractService actionContractService
    ) {
        this(
                sysParameterManage,
                actionContractService,
                new TrustedAnswerRuntimePolicyService(sysParameterManage),
                new TrustedAnswerTraceStore()
        );
    }

    public void stream(
            TrustedAnswerTraceVO trace,
            TrustedAnswerRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) throws IOException {
        prepareSse(response);

        try {
            write(response, TrustedAnswerSseEventVO.trace(trace.getTraceId(), trace.getState(), trace));

            if (trace.getState() != TrustedAnswerState.TRUSTED) {
                write(response, TrustedAnswerSseEventVO.error(trace.getTraceId(), trace.getError()));
                response.getWriter().flush();
                return;
            }

            if (proxyQuestionStream(trace, request, httpRequest, response)) {
                write(response, TrustedAnswerSseEventVO.done(trace.getTraceId(), trace.getState()));
            }
            response.getWriter().flush();
        } catch (Exception e) {
            writeSqlBotError(response, trace, e.getMessage());
        }
    }

    public void streamError(HttpServletResponse response) throws IOException {
        prepareSse(response);
        writeStableError(response, null);
    }

    public void proxyRuntime(
            AIQuerySqlBotRuntimeProxyRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) throws IOException {
        SQLBotConfigVO config = loadSqlBotConfig();
        if (!sqlBotRuntimeReady(config)) {
            DEException.throwException("sqlbot config disabled");
        }
        String method = StringUtils.upperCase(StringUtils.defaultIfBlank(request.getMethod(), "GET"));
        String path = normalizeRuntimeProxyPath(request.getPath());
        var contract = actionContractService.resolveSqlBotRuntime(method, path);
        if (!RUNTIME_ALLOWED_METHODS.contains(method) || contract.isEmpty()) {
            DEException.throwException(TrustedAnswerErrorCode.UNMAPPED_SQLBOT_PROXY_PATH.toError().getMessage());
        }
        var disabledError = actionContractService.disabledError(contract.get().getActionType(), runtimePolicyService.load());
        if (disabledError.isPresent()) {
            DEException.throwException(disabledError.get().toError().getMessage());
        }
        validateTrustedRuntimeScope(request, contract.get().getActionType(), path);

        HttpRequestBase proxyRequest = buildRuntimeProxyRequest(method, buildSqlBotApiUrl(config.getDomain(), path), request);
        appendDataEaseUserHeaders(proxyRequest, httpRequest, config);
        try (CloseableHttpClient client = buildRuntimeHttpClient(config.getDomain());
             CloseableHttpResponse proxyResponse = client.execute(proxyRequest)) {
            response.setStatus(proxyResponse.getStatusLine().getStatusCode());
            HttpEntity entity = proxyResponse.getEntity();
            if (entity == null) {
                return;
            }
            ContentType contentType = ContentType.get(entity);
            if (contentType != null) {
                response.setContentType(contentType.toString());
            }
            try (InputStream inputStream = entity.getContent(); OutputStream outputStream = response.getOutputStream()) {
                inputStream.transferTo(outputStream);
                outputStream.flush();
            } finally {
                EntityUtils.consumeQuietly(entity);
            }
        }
    }

    private void prepareSse(HttpServletResponse response) {
        response.setContentType("text/event-stream");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
    }

    private void writeStableError(HttpServletResponse response, String traceId) throws IOException {
        writeSqlBotError(response, null, null, traceId);
    }

    private void writeSqlBotError(
            HttpServletResponse response,
            TrustedAnswerTraceVO trace,
            String detail
    ) throws IOException {
        writeSqlBotError(response, trace, detail, trace == null ? null : trace.getTraceId());
    }

    private void writeSqlBotError(
            HttpServletResponse response,
            TrustedAnswerTraceVO trace,
            String detail,
            String fallbackTraceId
    ) throws IOException {
        TrustedAnswerErrorVO error = sqlBotUnavailableError(detail);
        String traceId = trace == null ? fallbackTraceId : trace.getTraceId();
        if (trace != null) {
            trace.setState(error.getState());
            trace.setError(error);
            if (!trace.getPermissionSteps().contains("sqlbot-runtime-failed")) {
                trace.getPermissionSteps().add("sqlbot-runtime-failed");
            }
        }
        write(response, TrustedAnswerSseEventVO.error(traceId, error));
        response.getWriter().flush();
    }

    private TrustedAnswerErrorVO sqlBotUnavailableError(String detail) {
        TrustedAnswerErrorVO error = TrustedAnswerErrorCode.SQLBOT_UNAVAILABLE.toError();
        String normalizedDetail = StringUtils.abbreviate(StringUtils.trimToEmpty(detail), ERROR_DETAIL_LIMIT);
        if (StringUtils.isNotBlank(normalizedDetail)) {
            error.setCause(error.getCause() + " 详细信息：" + normalizedDetail);
            error.setAdminVisibleDetail(error.getAdminVisibleDetail() + " 详细信息：" + normalizedDetail);
        }
        return error;
    }

    private void write(HttpServletResponse response, TrustedAnswerSseEventVO event) throws IOException {
        response.getWriter().write("event: " + event.getEvent() + "\n");
        response.getWriter().write("data: " + objectMapper.writeValueAsString(event) + "\n\n");
    }

    private boolean proxyQuestionStream(
            TrustedAnswerTraceVO trace,
            TrustedAnswerRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response
    ) throws IOException {
        SQLBotConfigVO config = loadSqlBotConfig();
        if (!sqlBotRuntimeReady(config) || request == null || request.getChatId() == null) {
            writeSqlBotError(response, trace, "SQLBot config disabled or chat_id missing");
            return false;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("question", request.getQuestion());
        body.put("chat_id", request.getChatId());
        if (request.getDatasourceId() != null) {
            body.put("datasource_id", request.getDatasourceId());
        }
        if (StringUtils.isNotBlank(request.getModelId())) {
            body.put("ai_modal_id", request.getModelId());
        }

        AIQuerySqlBotRuntimeProxyRequest proxyRequest = new AIQuerySqlBotRuntimeProxyRequest();
        proxyRequest.setMethod("POST");
        proxyRequest.setPath("/chat/question");
        proxyRequest.setBody(objectMapper.writeValueAsString(body));
        proxyRequest.setHeaders(buildQuestionStreamHeaders(config, trace, httpRequest));

        HttpRequestBase sqlBotRequest = buildRuntimeProxyRequest(
                "POST",
                buildSqlBotApiUrl(config.getDomain(), "/chat/question"),
                proxyRequest
        );
        appendDataEaseUserHeaders(sqlBotRequest, httpRequest, config);

        try (CloseableHttpClient client = buildRuntimeHttpClient(config.getDomain());
             CloseableHttpResponse sqlBotResponse = client.execute(sqlBotRequest)) {
            HttpEntity entity = sqlBotResponse.getEntity();
            if (sqlBotResponse.getStatusLine().getStatusCode() >= 400) {
                writeSqlBotError(
                        response,
                        trace,
                        sqlBotFailureDetail(sqlBotResponse.getStatusLine().getStatusCode(), entity)
                );
                return false;
            }
            if (entity == null) {
                writeSqlBotError(response, trace, "SQLBot returned an empty response body");
                return false;
            }
            try (InputStream inputStream = entity.getContent()) {
                forwardSqlBotSse(trace, inputStream, response);
                return true;
            } finally {
                EntityUtils.consumeQuietly(entity);
            }
        }
    }

    private Map<String, String> buildQuestionStreamHeaders(
            SQLBotConfigVO config,
            TrustedAnswerTraceVO trace,
            HttpServletRequest httpRequest
    ) throws IOException {
        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Accept", "text/event-stream");
        headers.put("Content-Type", "application/json");
        headers.put("X-SQLBOT-ASSISTANT-TOKEN", "Assistant " + requestAssistantToken(config));
        headers.put("X-SQLBOT-ASSISTANT-CERTIFICATE", encodeAssistantCertificate(trace, currentDataEaseToken(httpRequest)));
        headers.put("X-SQLBOT-HOST-ORIGIN", resolveHostOrigin(httpRequest));
        headers.put("Accept-Language", "zh-CN");
        return headers;
    }

    private String requestAssistantToken(SQLBotConfigVO config) throws IOException {
        String url = buildSqlBotApiUrl(config.getDomain(), "/system/assistant/validator?id=" + config.getId() + "&virtual=1");
        HttpGet tokenRequest = new HttpGet(url);
        tokenRequest.setHeader("Accept", "application/json");
        tokenRequest.setConfig(
                RequestConfig.custom()
                        .setConnectTimeout(5000)
                        .setConnectionRequestTimeout(5000)
                        .setSocketTimeout(30000)
                        .build()
        );
        try (CloseableHttpClient client = buildRuntimeHttpClient(config.getDomain());
             CloseableHttpResponse tokenResponse = client.execute(tokenRequest)) {
            if (tokenResponse.getStatusLine().getStatusCode() >= 400 || tokenResponse.getEntity() == null) {
                throw new IOException("SQLBot assistant validator failed");
            }
            String payload = EntityUtils.toString(tokenResponse.getEntity(), StandardCharsets.UTF_8);
            Map<?, ?> result = objectMapper.readValue(payload, Map.class);
            Object token = result.get("token");
            if (token == null && result.get("data") instanceof Map<?, ?> data) {
                token = data.get("token");
            }
            if (token == null || StringUtils.isBlank(String.valueOf(token))) {
                throw new IOException("SQLBot assistant token is empty");
            }
            return String.valueOf(token);
        }
    }

    private String encodeAssistantCertificate(TrustedAnswerTraceVO trace, String dataEaseToken) throws IOException {
        List<Map<String, String>> certificate = new java.util.ArrayList<>();
        certificate.add(certificateHeader(AuthConstant.TOKEN_KEY, dataEaseToken));
        certificate.add(certificateParam("datasetIds", trace.getContext().getDatasetIds()));
        certificate.add(certificateParam("dsId", trace.getContext().getDatasourceId()));
        certificate.add(certificateParam("entryScene", "dataset_query"));
        certificate.add(certificateParam("themeId", trace.getContext().getThemeId()));
        certificate.add(certificateParam("themeName", trace.getContext().getThemeName()));
        String rawCertificate = objectMapper.writeValueAsString(
                certificate.stream().filter(item -> StringUtils.isNotBlank(item.get("value"))).toList()
        );
        return java.util.Base64.getEncoder()
                .encodeToString(java.net.URLEncoder.encode(rawCertificate, StandardCharsets.UTF_8).getBytes(StandardCharsets.UTF_8));
    }

    private Map<String, String> certificateParam(String key, Object value) {
        Map<String, String> item = new LinkedHashMap<>();
        item.put("target", "param");
        item.put("key", key);
        if (value instanceof List<?> values) {
            item.put("value", values.stream().map(String::valueOf).filter(StringUtils::isNotBlank).reduce((a, b) -> a + "," + b).orElse(""));
        } else {
            item.put("value", value == null ? "" : String.valueOf(value));
        }
        return item;
    }

    private Map<String, String> certificateHeader(String key, String value) {
        Map<String, String> item = new LinkedHashMap<>();
        item.put("target", "header");
        item.put("key", key);
        item.put("value", StringUtils.defaultString(value));
        return item;
    }

    private String currentDataEaseToken(HttpServletRequest httpRequest) {
        if (httpRequest == null) {
            return "";
        }
        return StringUtils.trimToEmpty(httpRequest.getHeader(AuthConstant.TOKEN_KEY));
    }

    private String resolveHostOrigin(HttpServletRequest httpRequest) {
        if (httpRequest == null) {
            return "http://127.0.0.1:8080";
        }
        String origin = StringUtils.trimToEmpty(httpRequest.getHeader("Origin"));
        if (StringUtils.isNotBlank(origin)) {
            return origin;
        }
        String referer = StringUtils.trimToEmpty(httpRequest.getHeader("Referer"));
        if (StringUtils.isNotBlank(referer)) {
            try {
                URI uri = URI.create(referer);
                StringBuilder builder = new StringBuilder();
                builder.append(uri.getScheme()).append("://").append(uri.getHost());
                if (uri.getPort() > 0) {
                    builder.append(":").append(uri.getPort());
                }
                return builder.toString();
            } catch (Exception ignored) {
                return "http://127.0.0.1:8080";
            }
        }
        return "http://127.0.0.1:8080";
    }

    private void forwardSqlBotSse(TrustedAnswerTraceVO trace, InputStream inputStream, HttpServletResponse response) throws IOException {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            StringBuilder block = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                if (StringUtils.isBlank(line)) {
                    forwardSqlBotSseBlock(trace, block.toString(), response);
                    block.setLength(0);
                    continue;
                }
                if (block.length() > 0) {
                    block.append('\n');
                }
                block.append(line);
            }
            if (block.length() > 0) {
                forwardSqlBotSseBlock(trace, block.toString(), response);
            }
        }
    }

    private void forwardSqlBotSseBlock(TrustedAnswerTraceVO trace, String block, HttpServletResponse response) throws IOException {
        String dataLine = block.lines()
                .filter(item -> item.startsWith("data:"))
                .map(item -> item.replaceFirst("^data:\\s*", ""))
                .reduce((left, right) -> left + "\n" + right)
                .orElse("");
        if (StringUtils.isBlank(dataLine)) {
            return;
        }
        Map<String, Object> data = new LinkedHashMap<>();
        Object sqlbotEvent = objectMapper.readValue(dataLine, Object.class);
        sqlbotEvent = factBoundaryService.authorizeTrustedFactPayload(
                sqlbotEvent,
                trace != null && trace.getState() == TrustedAnswerState.TRUSTED
        );
        if (!factBoundaryService.isFactPayloadAllowed(sqlbotEvent)) {
            writeSqlBotError(response, trace, TrustedAnswerErrorCode.FACT_RESULT_REQUIRED.toError().getMessage());
            return;
        }
        rememberTrustedRecordId(trace, sqlbotEvent);
        data.put("sqlbot_event", sqlbotEvent);
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("sqlbot");
        event.setTraceId(trace.getTraceId());
        event.setState(trace.getState());
        event.setData(data);
        event.setDone(false);
        write(response, event);
        response.getWriter().flush();
    }

    private String sqlBotFailureDetail(int statusCode, HttpEntity entity) throws IOException {
        String body = entity == null ? "" : EntityUtils.toString(entity, StandardCharsets.UTF_8);
        String detail = "SQLBot /chat/question returned HTTP " + statusCode;
        if (StringUtils.isNotBlank(body)) {
            detail = detail + ": " + body;
        }
        return detail;
    }

    private HttpRequestBase buildRuntimeProxyRequest(
            String method,
            String url,
            AIQuerySqlBotRuntimeProxyRequest request
    ) {
        HttpRequestBase proxyRequest;
        if (StringUtils.equals(method, "POST")) {
            HttpPost post = new HttpPost(url);
            post.setEntity(new StringEntity(
                    StringUtils.defaultString(request.getBody()),
                    ContentType.APPLICATION_JSON.withCharset(StandardCharsets.UTF_8)
            ));
            proxyRequest = post;
        } else if (StringUtils.equals(method, "DELETE")) {
            proxyRequest = new HttpDelete(url);
        } else {
            proxyRequest = new HttpGet(url);
        }

        proxyRequest.setConfig(
                RequestConfig.custom()
                        .setConnectTimeout(5000)
                        .setConnectionRequestTimeout(5000)
                        .setSocketTimeout(120000)
                        .build()
        );
        Map<String, String> headers = request.getHeaders() == null ? new LinkedHashMap<>() : request.getHeaders();
        headers.forEach((key, value) -> {
            String normalizedKey = StringUtils.lowerCase(StringUtils.trimToEmpty(key));
            if (RUNTIME_ALLOWED_HEADERS.contains(normalizedKey) && StringUtils.isNotBlank(value)) {
                proxyRequest.setHeader(key, value);
            }
        });
        if (!headers.containsKey("Accept") && !headers.containsKey("accept")) {
            proxyRequest.setHeader("Accept", "application/json, text/event-stream");
        }
        if (proxyRequest instanceof HttpEntityEnclosingRequestBase
                && !headers.containsKey("Content-Type")
                && !headers.containsKey("content-type")) {
            proxyRequest.setHeader("Content-Type", "application/json");
        }
        return proxyRequest;
    }

    private void validateTrustedRuntimeScope(
            AIQuerySqlBotRuntimeProxyRequest request,
            TrustedAnswerActionType actionType,
            String path
    ) {
        if (!requiresTrustedTrace(actionType)) {
            return;
        }
        String sourceTraceId = StringUtils.trimToEmpty(request.getSourceTraceId());
        TrustedAnswerTraceVO sourceTrace = traceStore.get(sourceTraceId);
        if (sourceTrace == null || sourceTrace.getState() != TrustedAnswerState.TRUSTED) {
            DEException.throwException(TrustedAnswerErrorCode.TRUSTED_TRACE_REQUIRED.toError().getMessage());
        }
        if (!isTraceOwnedByCurrentUser(sourceTrace)) {
            DEException.throwException(TrustedAnswerErrorCode.TRUSTED_TRACE_REQUIRED.toError().getMessage());
        }
        if (requiresTrustedRecordScope(actionType)) {
            String recordId = StringUtils.defaultIfBlank(request.getRecordId(), extractRecordId(path));
            if (StringUtils.isNotBlank(recordId)
                    && sourceTrace.getAuthorizedRecordIds().stream().noneMatch(recordId::equals)) {
                DEException.throwException(TrustedAnswerErrorCode.TRUSTED_TRACE_REQUIRED.toError().getMessage());
            }
        }
    }

    private boolean requiresTrustedTrace(TrustedAnswerActionType actionType) {
        return actionType == TrustedAnswerActionType.RECOMMENDATION_ASK
                || actionType == TrustedAnswerActionType.DATA_INTERPRETATION
                || actionType == TrustedAnswerActionType.FORECAST
                || actionType == TrustedAnswerActionType.CHART_DATA
                || actionType == TrustedAnswerActionType.USAGE
                || actionType == TrustedAnswerActionType.HISTORY_RESTORE
                || actionType == TrustedAnswerActionType.CONTEXT_SWITCH
                || actionType == TrustedAnswerActionType.SNAPSHOT;
    }

    private boolean requiresTrustedRecordScope(TrustedAnswerActionType actionType) {
        return actionType == TrustedAnswerActionType.RECOMMENDATION_ASK
                || actionType == TrustedAnswerActionType.DATA_INTERPRETATION
                || actionType == TrustedAnswerActionType.FORECAST
                || actionType == TrustedAnswerActionType.CHART_DATA
                || actionType == TrustedAnswerActionType.USAGE;
    }

    private boolean isTraceOwnedByCurrentUser(TrustedAnswerTraceVO trace) {
        if (trace == null || !hasTraceOwner(trace) || AuthUtils.isSysAdmin()) {
            return true;
        }
        TokenUserBO user = AuthUtils.getUser();
        if (user == null || user.getUserId() == null || user.getDefaultOid() == null) {
            return false;
        }
        String userId = String.valueOf(user.getUserId());
        String orgId = String.valueOf(user.getDefaultOid());
        return StringUtils.equals(trace.getOwnerUserId(), userId)
                && StringUtils.equals(trace.getOwnerOrgId(), orgId)
                && StringUtils.equals(trace.getOwnerWorkspaceId(), orgId);
    }

    private boolean hasTraceOwner(TrustedAnswerTraceVO trace) {
        return StringUtils.isNotBlank(trace.getOwnerUserId())
                || StringUtils.isNotBlank(trace.getOwnerOrgId())
                || StringUtils.isNotBlank(trace.getOwnerWorkspaceId());
    }

    private String extractRecordId(String path) {
        String normalizedPath = StringUtils.substringBefore(StringUtils.defaultString(path), "?");
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^/chat/(?:record|recommend_questions)/([^/]+)")
                .matcher(normalizedPath);
        return matcher.find() ? matcher.group(1) : "";
    }

    private void rememberTrustedRecordId(TrustedAnswerTraceVO trace, Object sqlbotEvent) {
        if (trace == null || sqlbotEvent == null) {
            return;
        }
        String recordId = extractEventRecordId(sqlbotEvent);
        if (StringUtils.isBlank(recordId) || trace.getAuthorizedRecordIds().contains(recordId)) {
            return;
        }
        trace.getAuthorizedRecordIds().add(recordId);
        traceStore.put(trace);
    }

    @SuppressWarnings("unchecked")
    private String extractEventRecordId(Object sqlbotEvent) {
        if (!(sqlbotEvent instanceof Map<?, ?> event)) {
            return "";
        }
        Object type = event.get("type");
        if (!StringUtils.equals("id", String.valueOf(type))) {
            return "";
        }
        Object id = event.get("id");
        return id == null ? "" : StringUtils.trimToEmpty(String.valueOf(id));
    }

    private void appendDataEaseUserHeaders(
            HttpRequestBase proxyRequest,
            HttpServletRequest httpRequest,
            SQLBotConfigVO config
    ) {
        TokenUserBO user = AuthUtils.getUser();
        if (user != null && user.getUserId() != null) {
            String userId = String.valueOf(user.getUserId());
            proxyRequest.setHeader("X-DE-USER-ID", userId);
            if (user.getDefaultOid() != null) {
                String orgId = String.valueOf(user.getDefaultOid());
                proxyRequest.setHeader("X-DE-ORG-ID", orgId);
                appendInternalSignature(proxyRequest, config, userId, orgId);
            } else {
                String orgId = appendDataEaseOrgHeaderFromToken(proxyRequest, httpRequest);
                appendInternalSignature(proxyRequest, config, userId, orgId);
            }
            return;
        }

        if (httpRequest == null) {
            return;
        }

        String dataEaseToken = currentDataEaseToken(httpRequest);
        if (StringUtils.isBlank(dataEaseToken)) {
            return;
        }
        try {
            String[] parts = dataEaseToken.split("\\.");
            if (parts.length < 2) {
                return;
            }
            byte[] decodedPayload = java.util.Base64.getUrlDecoder().decode(parts[1]);
            Map<?, ?> payload = objectMapper.readValue(decodedPayload, Map.class);
            Object uid = payload.get("uid");
            String userId = "";
            if (uid != null && StringUtils.isNotBlank(String.valueOf(uid))) {
                userId = String.valueOf(uid);
                proxyRequest.setHeader("X-DE-USER-ID", userId);
            }
            Object oid = payload.get("oid");
            String orgId = "";
            if (oid != null && StringUtils.isNotBlank(String.valueOf(oid))) {
                orgId = String.valueOf(oid);
                proxyRequest.setHeader("X-DE-ORG-ID", orgId);
            }
            appendInternalSignature(proxyRequest, config, userId, orgId);
        } catch (Exception ignored) {
            // AuthUtils is the source of truth; token decoding is only a QA/dev fallback.
        }
    }

    private String appendDataEaseOrgHeaderFromToken(HttpRequestBase proxyRequest, HttpServletRequest httpRequest) {
        if (httpRequest == null) {
            return "";
        }
        String dataEaseToken = currentDataEaseToken(httpRequest);
        if (StringUtils.isBlank(dataEaseToken)) {
            return "";
        }
        try {
            String[] parts = dataEaseToken.split("\\.");
            if (parts.length < 2) {
                return "";
            }
            byte[] decodedPayload = java.util.Base64.getUrlDecoder().decode(parts[1]);
            Map<?, ?> payload = objectMapper.readValue(decodedPayload, Map.class);
            Object oid = payload.get("oid");
            if (oid != null && StringUtils.isNotBlank(String.valueOf(oid))) {
                String orgId = String.valueOf(oid);
                proxyRequest.setHeader("X-DE-ORG-ID", orgId);
                return orgId;
            }
        } catch (Exception ignored) {
            // Missing fallback org only affects dev/test tokens; request auth remains handled upstream.
        }
        return "";
    }

    private void appendInternalSignature(
            HttpRequestBase proxyRequest,
            SQLBotConfigVO config,
            String userId,
            String orgId
    ) {
        if (StringUtils.isAnyBlank(userId, orgId, config == null ? null : config.getSecret())) {
            return;
        }
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        proxyRequest.setHeader("X-DE-INTERNAL-TIMESTAMP", timestamp);
        proxyRequest.setHeader(
                "X-DE-INTERNAL-SIGNATURE",
                internalSignature(config.getSecret(), userId, orgId, timestamp)
        );
    }

    private String internalSignature(String secret, String userId, String orgId, String timestamp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal((userId + ":" + orgId + ":" + timestamp).getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            DEException.throwException("DataEase internal SQLBot signature failed: " + e.getMessage());
            return "";
        }
    }

    private String normalizeRuntimeProxyPath(String path) {
        String normalizedPath = StringUtils.defaultIfBlank(path, "/").trim();
        if (!normalizedPath.startsWith("/")) {
            normalizedPath = "/" + normalizedPath;
        }
        URI uri = URI.create("http://dataease.local" + normalizedPath);
        String normalized = uri.getRawPath();
        if (StringUtils.isBlank(normalized) || normalized.contains("..")) {
            DEException.throwException("invalid sqlbot runtime proxy path");
        }
        if (StringUtils.isNotBlank(uri.getRawQuery())) {
            normalized = normalized + "?" + uri.getRawQuery();
        }
        return normalized;
    }

    private SQLBotConfigVO loadSqlBotConfig() {
        SQLBotConfigVO config = new SQLBotConfigVO();
        config.setDomain(sysParameterManage.singleVal("sqlbot.domain"));
        config.setId(sysParameterManage.singleVal("sqlbot.id"));
        config.setSecret(sysParameterManage.singleVal("sqlbot.secret"));
        config.setEnabled(Boolean.parseBoolean(StringUtils.defaultString(sysParameterManage.singleVal("sqlbot.enabled"))));
        config.setValid(Boolean.parseBoolean(StringUtils.defaultString(sysParameterManage.singleVal("sqlbot.valid"))));
        return config;
    }

    private boolean sqlBotRuntimeReady(SQLBotConfigVO config) {
        return config != null
                && Boolean.TRUE.equals(config.getEnabled())
                && Boolean.TRUE.equals(config.getValid())
                && StringUtils.isNotBlank(config.getDomain())
                && StringUtils.isNotBlank(config.getId())
                && StringUtils.isNotBlank(config.getSecret());
    }

    private String buildSqlBotApiUrl(String domain, String path) {
        return normalizeSqlBotApiBase(domain) + path;
    }

    private String normalizeSqlBotApiBase(String domain) {
        String normalizedDomain = StringUtils.removeEnd(StringUtils.trimToEmpty(domain), "/");
        if (StringUtils.isBlank(normalizedDomain)) {
            return "/api/v1";
        }
        try {
            URI uri = URI.create(normalizedDomain);
            String host = uri.getHost();
            int port = uri.getPort();
            String scheme = StringUtils.defaultIfBlank(uri.getScheme(), "http");
            if (StringUtils.equalsAnyIgnoreCase(host, "127.0.0.1", "localhost") && port == 5173) {
                port = 8000;
            }
            StringBuilder builder = new StringBuilder();
            builder.append(scheme).append("://").append(host);
            if (port > 0) {
                builder.append(":").append(port);
            }
            return builder.append("/api/v1").toString();
        } catch (Exception e) {
            return normalizedDomain + "/api/v1";
        }
    }

    private CloseableHttpClient buildRuntimeHttpClient(String domain) {
        return HttpClientBuilder.create().build();
    }
}
