package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class TrustedAnswerSseEventVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 6975122076274093925L;

    private String event;

    @JsonProperty("trace_id")
    private String traceId;

    private TrustedAnswerState state;

    private Object data;

    private TrustedAnswerErrorVO error;

    private Boolean done = false;

    public static TrustedAnswerSseEventVO trace(String traceId, TrustedAnswerState state, Object data) {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("trace");
        event.setTraceId(traceId);
        event.setState(state);
        event.setData(data);
        event.setDone(false);
        return event;
    }

    public static TrustedAnswerSseEventVO answer(String traceId, Object data) {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("answer");
        event.setTraceId(traceId);
        event.setState(TrustedAnswerState.TRUSTED);
        event.setData(data);
        event.setDone(false);
        return event;
    }

    public static TrustedAnswerSseEventVO done(String traceId, TrustedAnswerState state) {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("done");
        event.setTraceId(traceId);
        event.setState(state);
        event.setDone(true);
        return event;
    }

    public static TrustedAnswerSseEventVO error(String traceId, TrustedAnswerErrorVO error) {
        TrustedAnswerSseEventVO event = new TrustedAnswerSseEventVO();
        event.setEvent("error");
        event.setTraceId(traceId);
        event.setState(error.getState());
        event.setError(error);
        event.setDone(true);
        return event;
    }
}
