package io.dataease.ai.query.trusted;

import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class TrustedAnswerConversationContextService {

    private static final Pattern SQL_PATTERN = Pattern.compile("(?is)\\b(select|insert|update|delete|from|where|join)\\b[^。；;\\n]*");
    private static final Pattern PHYSICAL_IDENTIFIER_PATTERN = Pattern.compile("(?i)\\b[a-z0-9_]*_(salary|amount|user|order|customer|table|field)[a-z0-9_]*\\b");

    public String rebuildForSqlBot(AuthorizedAskScope scope, String previousText) {
        String safeText = StringUtils.defaultString(previousText);
        safeText = SQL_PATTERN.matcher(safeText).replaceAll("[已按当前权限移除历史执行细节]");
        safeText = PHYSICAL_IDENTIFIER_PATTERN.matcher(safeText).replaceAll("[已脱敏字段]");
        String permissionSummary = scope == null || StringUtils.isBlank(scope.getPermissionSummary())
                ? "当前基于你有权限的数据生成"
                : scope.getPermissionSummary();
        return permissionSummary + "。历史上下文已按当前权限重新裁剪。" + safeText;
    }
}
