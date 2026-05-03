package io.dataease.ai.query.trusted;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.api.ai.query.request.AIQuerySqlBotRuntimeProxyRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerSseEventVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.system.vo.SQLBotConfigVO;
import io.dataease.exception.DEException;
import io.dataease.system.manage.SysParameterManage;
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
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.config.Registry;
import org.apache.http.config.RegistryBuilder;
import org.apache.http.conn.HttpClientConnectionManager;
import org.apache.http.conn.socket.ConnectionSocketFactory;
import org.apache.http.conn.socket.PlainConnectionSocketFactory;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.apache.http.ssl.SSLContextBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.cert.X509Certificate;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

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

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SysParameterManage sysParameterManage;

    public TrustedAnswerStubSqlBotProxy(SysParameterManage sysParameterManage) {
        this.sysParameterManage = sysParameterManage;
    }

    public void stream(TrustedAnswerTraceVO trace, HttpServletResponse response) throws IOException {
        prepareSse(response);

        try {
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
        } catch (Exception e) {
            writeStableError(response, trace == null ? null : trace.getTraceId());
        }
    }

    public void streamError(HttpServletResponse response) throws IOException {
        prepareSse(response);
        writeStableError(response, null);
    }

    public void proxyRuntime(AIQuerySqlBotRuntimeProxyRequest request, HttpServletResponse response) throws IOException {
        SQLBotConfigVO config = loadSqlBotConfig();
        if (!sqlBotRuntimeReady(config)) {
            DEException.throwException("sqlbot config disabled");
        }
        String method = StringUtils.upperCase(StringUtils.defaultIfBlank(request.getMethod(), "GET"));
        String path = normalizeRuntimeProxyPath(request.getPath());
        if (!RUNTIME_ALLOWED_METHODS.contains(method) || !isAllowedRuntimeProxyPath(path)) {
            DEException.throwException("unsupported sqlbot runtime proxy request");
        }

        HttpUriRequest proxyRequest = buildRuntimeProxyRequest(method, buildSqlBotApiUrl(config.getDomain(), path), request);
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
        write(response, TrustedAnswerSseEventVO.error(traceId, TrustedAnswerErrorCode.SQLBOT_UNAVAILABLE.toError()));
        response.getWriter().flush();
    }

    private void write(HttpServletResponse response, TrustedAnswerSseEventVO event) throws IOException {
        response.getWriter().write("event: " + event.getEvent() + "\n");
        response.getWriter().write("data: " + objectMapper.writeValueAsString(event) + "\n\n");
    }

    private HttpUriRequest buildRuntimeProxyRequest(
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

    private boolean isAllowedRuntimeProxyPath(String path) {
        String rawPath = URI.create("http://dataease.local" + path).getPath();
        return rawPath.matches("^/system/assistant/validator$")
                || rawPath.matches("^/chat/assistant/start$")
                || rawPath.matches("^/chat/list$")
                || rawPath.matches("^/chat/recent_questions/[^/]+$")
                || rawPath.matches("^/chat/recommend_questions/[^/]+$")
                || rawPath.matches("^/chat/record/[^/]+/(data|usage|analysis|predict)$")
                || rawPath.matches("^/chat/[^/]+/with_data$")
                || rawPath.matches("^/chat/[^/]+/[^/]+$")
                || rawPath.matches("^/chat/sqlbot-new/history$")
                || rawPath.matches("^/chat/[^/]+/sqlbot-new/(context|context-switch|snapshot)$");
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
        String normalizedDomain = StringUtils.defaultString(domain);
        if (!normalizedDomain.startsWith("https")) {
            return HttpClientBuilder.create().build();
        }
        try {
            SSLContextBuilder builder = new SSLContextBuilder();
            builder.loadTrustMaterial(null, (X509Certificate[] certificates, String authType) -> true);
            SSLConnectionSocketFactory socketFactory = new SSLConnectionSocketFactory(
                    builder.build(),
                    new String[]{"TLSv1.1", "TLSv1.2", "SSLv3"},
                    null,
                    NoopHostnameVerifier.INSTANCE
            );
            Registry<ConnectionSocketFactory> registry = RegistryBuilder.<ConnectionSocketFactory>create()
                    .register("http", new PlainConnectionSocketFactory())
                    .register("https", socketFactory)
                    .build();
            HttpClientConnectionManager connManager = new PoolingHttpClientConnectionManager(registry);
            return HttpClients.custom().setConnectionManager(connManager).build();
        } catch (Exception e) {
            DEException.throwException("HttpClient查询失败: " + e.getMessage());
            return null;
        }
    }
}
