package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO;
import io.dataease.system.manage.SysParameterManage;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.function.Function;

@Service
public class TrustedAnswerRuntimePolicyService {

    private final Function<String, String> parameterReader;

    @Autowired
    public TrustedAnswerRuntimePolicyService(SysParameterManage sysParameterManage) {
        this(sysParameterManage == null ? key -> null : sysParameterManage::singleVal);
    }

    public TrustedAnswerRuntimePolicyService(Function<String, String> parameterReader) {
        this.parameterReader = parameterReader;
    }

    public TrustedAnswerRuntimePolicyVO load() {
        TrustedAnswerRuntimePolicyVO policy = new TrustedAnswerRuntimePolicyVO();
        policy.setAskEnabled(readBoolean("ai.query.ask_enabled", true));
        policy.setDataInterpretationEnabled(readBoolean("ai.query.data_interpretation_enabled", true));
        policy.setForecastEnabled(readBoolean("ai.query.forecast_enabled", true));
        policy.setFollowupEnabled(readBoolean("ai.query.followup_enabled", true));
        policy.setSampleDatasetEnabled(readBoolean("ai.query.sample_dataset_enabled", true));
        policy.setVoiceEnabled(readBoolean("ai.query.voice_enabled", true));
        return policy;
    }

    private boolean readBoolean(String key, boolean defaultValue) {
        String raw = parameterReader == null ? null : parameterReader.apply(key);
        return StringUtils.isBlank(raw) ? defaultValue : Boolean.parseBoolean(StringUtils.trim(raw));
    }
}
