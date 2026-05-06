package io.dataease.ai.gateway;

import io.dataease.utils.HttpClientConfig;
import io.dataease.system.manage.SysParameterManage;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;
import org.springframework.beans.factory.annotation.Value;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public abstract class BaseAiProxyServer {

    @Value("${starbi.sqlbot.api-base:http://127.0.0.1:8000/api/v1}")
    protected String sqlbotBase;

    @Value("${starbi.sqlbot.assistant-secret:}")
    protected String sqlbotAssistantSecret;

    @Resource
    protected ResponseNormalizer normalizer;

    @Resource
    private SysParameterManage sysParameterManage;

    @Resource
    private UserContextHeaders userContextHeaders;

    protected HttpClientConfig buildConfig() {
        HttpClientConfig config = new HttpClientConfig();
        Map<String, String> userHeaders = currentUserHeaders();
        for (Map.Entry<String, String> header : userHeaders.entrySet()) {
            config.addHeader(header.getKey(), header.getValue());
        }
        if (StringUtils.isNotBlank(userHeaders.get("X-DE-ORG-ID"))) {
            addInternalSignatureHeaders(config, userHeaders);
        }
        config.addHeader("Accept", "application/json");
        config.setConnectTimeout(5000);
        config.setSocketTimeout(10000);
        return config;
    }

    protected Map<String, String> currentUserHeaders() {
        if (userContextHeaders != null) {
            return userContextHeaders.buildHeaders();
        }
        UserContextHeaders fallback = new UserContextHeaders();
        return fallback.buildHeaders();
    }

    private void addInternalSignatureHeaders(HttpClientConfig config, Map<String, String> userHeaders) {
        String secret = resolveSqlBotAssistantSecret();
        if (StringUtils.isAnyBlank(userHeaders.get("X-DE-USER-ID"), userHeaders.get("X-DE-ORG-ID"), secret)) {
            return;
        }
        String timestamp = String.valueOf(System.currentTimeMillis() / 1000);
        config.addHeader("X-DE-INTERNAL-TIMESTAMP", timestamp);
        config.addHeader("X-DE-INTERNAL-SIGNATURE", internalSignature(secret, userHeaders, timestamp));
    }

    private String resolveSqlBotAssistantSecret() {
        String settingSecret = sysParameterManage == null ? null : sysParameterManage.singleVal("sqlbot.secret");
        return StringUtils.trimToEmpty(StringUtils.defaultIfBlank(settingSecret, sqlbotAssistantSecret));
    }

    private String internalSignature(String secret, Map<String, String> userHeaders, String timestamp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(internalSignaturePayload(userHeaders, timestamp).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("DataEase internal SQLBot signature failed", e);
        }
    }

    private String internalSignaturePayload(Map<String, String> userHeaders, String timestamp) {
        return String.join("\n",
                StringUtils.defaultString(userHeaders.get("X-DE-USER-ID")),
                StringUtils.defaultString(userHeaders.get("X-DE-ORG-ID")),
                StringUtils.defaultString(userHeaders.get("X-DE-USER-ACCOUNT")),
                StringUtils.defaultString(userHeaders.get("X-DE-USER-NAME")),
                StringUtils.defaultString(userHeaders.get("X-DE-IS-ADMIN")),
                StringUtils.defaultString(userHeaders.get("X-DE-IS-WS-ADMIN")),
                timestamp
        );
    }

    protected String deleteWithJsonBody(String url, String json, HttpClientConfig config) throws Exception {
        if (config == null) {
            config = buildConfig();
        }
        try (CloseableHttpClient httpClient = HttpClientBuilder.create().build()) {
            HttpDeleteWithBody request = new HttpDeleteWithBody(url);
            request.setConfig(config.buildRequestConfig());
            for (Map.Entry<String, String> header : config.getHeader().entrySet()) {
                request.addHeader(header.getKey(), header.getValue());
            }
            request.setEntity(new StringEntity(json, ContentType.APPLICATION_JSON));
            HttpResponse response = httpClient.execute(request);
            HttpEntity entity = response.getEntity();
            return entity == null ? "" : EntityUtils.toString(entity, StandardCharsets.UTF_8);
        }
    }

    private static class HttpDeleteWithBody extends HttpEntityEnclosingRequestBase {
        HttpDeleteWithBody(String uri) {
            setURI(URI.create(uri));
        }

        @Override
        public String getMethod() {
            return HttpDelete.METHOD_NAME;
        }
    }
}
