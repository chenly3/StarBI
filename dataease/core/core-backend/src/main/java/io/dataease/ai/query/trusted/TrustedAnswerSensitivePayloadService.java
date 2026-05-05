package io.dataease.ai.query.trusted;

import io.dataease.system.manage.SysParameterManage;
import org.apache.commons.codec.digest.HmacAlgorithms;
import org.apache.commons.codec.digest.HmacUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class TrustedAnswerSensitivePayloadService {

    private static final Pattern PHONE = Pattern.compile("1[3-9]\\d{9}");
    private static final Pattern EMAIL = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private static final Pattern ID_CARD = Pattern.compile("\\b\\d{15}(\\d{2}[0-9Xx])?\\b");
    private static final Pattern ORDER = Pattern.compile("\\b(ORD|ORDER|HT|CONTRACT|CUST|客户编号|订单号|合同号)[A-Za-z0-9\\-]{1,}\\b");
    private static final Pattern MONEY = Pattern.compile("\\b\\d{4,}(\\.\\d{1,2})?\\b");
    private static final Pattern CHINESE_NAME = Pattern.compile("客户[\\u4e00-\\u9fa5]{2,4}");
    static final String SECRET_PARAMETER_KEY = "sqlbot.secret";

    private final String secret;

    @Autowired
    public TrustedAnswerSensitivePayloadService(SysParameterManage sysParameterManage) {
        this(sysParameterManage == null ? null : sysParameterManage.singleVal(SECRET_PARAMETER_KEY));
    }

    public TrustedAnswerSensitivePayloadService(String secret) {
        if (StringUtils.isBlank(secret)) {
            throw new IllegalArgumentException("trusted answer sensitive payload secret is required");
        }
        this.secret = secret;
    }

    public String redact(String raw) {
        String result = StringUtils.defaultString(raw);
        result = PHONE.matcher(result).replaceAll("[手机号]");
        result = EMAIL.matcher(result).replaceAll("[邮箱]");
        result = ID_CARD.matcher(result).replaceAll("[证件号]");
        result = ORDER.matcher(result).replaceAll("[业务编号]");
        result = MONEY.matcher(result).replaceAll("[金额]");
        result = CHINESE_NAME.matcher(result).replaceAll("客户[姓名]");
        return result;
    }

    public String fingerprint(
            String tenantId,
            String workspaceId,
            String themeId,
            String resourceId,
            String diagnosisType,
            String question
    ) {
        String normalized = String.join("|",
                StringUtils.defaultString(tenantId),
                StringUtils.defaultString(workspaceId),
                StringUtils.defaultString(themeId),
                StringUtils.defaultString(resourceId),
                StringUtils.defaultString(diagnosisType),
                redact(question).toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim()
        );
        byte[] digest = new HmacUtils(HmacAlgorithms.HMAC_SHA_256, secret.getBytes(StandardCharsets.UTF_8))
                .hmac(normalized);
        return "sha256:" + org.apache.commons.codec.binary.Hex.encodeHexString(digest);
    }

    public int restrictedPayloadRetentionDays() {
        return 180;
    }

    public int todoSummaryRetentionDays() {
        return 365;
    }
}
