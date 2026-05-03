package io.dataease.ai.query;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorVO;
import io.dataease.api.ai.query.vo.TrustedAnswerSseEventVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import org.junit.jupiter.api.Test;

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
}
