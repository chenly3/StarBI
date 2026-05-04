package io.dataease.ai.query;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.dataease.ai.query.manage.AIQueryThemeManage;
import io.dataease.api.ai.query.request.AIQueryLearningFeedbackRequest;
import io.dataease.api.ai.query.request.AIQueryLearningPatchDisableRequest;
import io.dataease.api.ai.query.vo.AIQueryLearningFeedbackEventVO;
import io.dataease.api.ai.query.vo.AIQueryLearningFeedbackMetricVO;
import io.dataease.api.ai.query.vo.AIQueryLearningFeedbackSummaryVO;
import io.dataease.api.ai.query.vo.AIQueryLearningPatchDisableVO;
import io.dataease.api.ai.query.vo.AIQueryLearningPatchVO;
import io.dataease.api.ai.query.vo.AIQueryLearningQualitySummaryVO;
import io.dataease.api.ai.query.vo.AIQueryLearningRelearningDecisionVO;
import io.dataease.api.ai.query.vo.AIQueryLearningReplayVO;
import io.dataease.api.ai.query.vo.AIQueryLearningResourceVO;
import io.dataease.api.ai.query.vo.AIQueryLearningTriggerVO;
import io.dataease.ai.query.server.AIQueryResourceLearningServer;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AIQueryResourceLearningContractSmokeTest {

    @Test
    void learningContractsShouldExist() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();

        AIQueryLearningResourceVO resource = new AIQueryLearningResourceVO();
        resource.setResourceId("resource-1");
        resource.setName("销售数据集");
        resource.setLearningStatus("succeeded");

        AIQueryLearningTriggerVO trigger = new AIQueryLearningTriggerVO();
        trigger.setTaskId("task-1");
        trigger.setResourceId("resource-1");
        trigger.setTaskStatus("pending");

        AIQueryLearningQualitySummaryVO qualitySummary = new AIQueryLearningQualitySummaryVO();
        AIQueryLearningFeedbackSummaryVO feedbackSummary = new AIQueryLearningFeedbackSummaryVO();
        AIQueryLearningFeedbackEventVO feedbackEvent = new AIQueryLearningFeedbackEventVO();
        AIQueryLearningFeedbackMetricVO feedbackMetric = new AIQueryLearningFeedbackMetricVO();
        AIQueryLearningPatchVO patch = new AIQueryLearningPatchVO();
        AIQueryLearningPatchDisableVO patchDisable = new AIQueryLearningPatchDisableVO();
        AIQueryLearningReplayVO replay = new AIQueryLearningReplayVO();
        AIQueryLearningRelearningDecisionVO relearningDecision = new AIQueryLearningRelearningDecisionVO();
        AIQueryLearningFeedbackRequest feedbackRequest = new AIQueryLearningFeedbackRequest();
        AIQueryLearningPatchDisableRequest patchDisableRequest = new AIQueryLearningPatchDisableRequest();

        assertNotNull(resource);
        assertNotNull(trigger);
        assertNotNull(qualitySummary);
        assertNotNull(feedbackSummary);
        assertNotNull(feedbackEvent);
        assertNotNull(feedbackMetric);
        assertNotNull(patch);
        assertNotNull(patchDisable);
        assertNotNull(replay);
        assertNotNull(relearningDecision);
        assertNotNull(feedbackRequest);
        assertNotNull(patchDisableRequest);

        assertNotNull(qualitySummary.getRisks());
        assertNotNull(qualitySummary.getSignals());
        assertNotNull(qualitySummary.getSuggestions());
        assertNotNull(feedbackSummary.getRecentIssues());
        assertEquals(0, feedbackSummary.getDownvoteRate());
        assertEquals(0, feedbackSummary.getFailureRate());
        assertEquals(Boolean.FALSE, feedbackSummary.getRelearningSuggested());
        assertEquals(Boolean.FALSE, feedbackEvent.getAccepted());
        assertNotNull(feedbackEvent.getMetric());
        assertEquals(0, feedbackMetric.getWindow7dFailureRate());
        assertNotNull(replay.getBeforeSnapshot());
        assertNotNull(replay.getAfterSnapshot());
        assertNotNull(replay.getPatchTypes());
        assertEquals(Boolean.FALSE, relearningDecision.getRelearningSuggested());
        assertNotNull(relearningDecision.getMetric());
        assertNotNull(feedbackRequest.getBeforeSnapshot());
        assertNotNull(feedbackRequest.getAfterSnapshot());
        assertNotNull(feedbackRequest.getPatchTypes());
        assertEquals("system", feedbackRequest.getActorAccount());
        assertEquals("admin_only", feedbackRequest.getVisibility());
        assertEquals("system", patchDisableRequest.getActorAccount());

        String resourceJson = objectMapper.writeValueAsString(resource);
        String triggerJson = objectMapper.writeValueAsString(trigger);
        String qualitySummaryJson = objectMapper.writeValueAsString(qualitySummary);
        String feedbackSummaryJson = objectMapper.writeValueAsString(feedbackSummary);
        String feedbackEventJson = objectMapper.writeValueAsString(feedbackEvent);
        String feedbackMetricJson = objectMapper.writeValueAsString(feedbackMetric);
        String replayJson = objectMapper.writeValueAsString(replay);
        String relearningDecisionJson = objectMapper.writeValueAsString(relearningDecision);
        String feedbackRequestJson = objectMapper.writeValueAsString(feedbackRequest);
        String patchDisableRequestJson = objectMapper.writeValueAsString(patchDisableRequest);

        assertTrue(resourceJson.contains("\"resourceId\":\"resource-1\""));
        assertTrue(resourceJson.contains("\"learningStatus\":\"succeeded\""));
        assertTrue(triggerJson.contains("\"taskStatus\":\"pending\""));
        assertTrue(qualitySummaryJson.contains("\"risks\":[]"));
        assertTrue(qualitySummaryJson.contains("\"signals\":[]"));
        assertTrue(qualitySummaryJson.contains("\"suggestions\":[]"));
        assertTrue(feedbackSummaryJson.contains("\"totalFeedbackCount\":0"));
        assertTrue(feedbackSummaryJson.contains("\"downvoteRate\":0"));
        assertTrue(feedbackSummaryJson.contains("\"failureRate\":0"));
        assertTrue(feedbackSummaryJson.contains("\"relearningSuggested\":false"));
        assertTrue(feedbackSummaryJson.contains("\"recentIssues\":[]"));
        assertTrue(feedbackEventJson.contains("\"accepted\":false"));
        assertTrue(feedbackEventJson.contains("\"activePatchCount\":0"));
        assertTrue(feedbackMetricJson.contains("\"window7dFailureRate\":0"));
        assertTrue(replayJson.contains("\"beforeSnapshot\":{}"));
        assertTrue(relearningDecisionJson.contains("\"relearningSuggested\":false"));
        assertTrue(feedbackRequestJson.contains("\"actorAccount\":\"system\""));
        assertTrue(feedbackRequestJson.contains("\"beforeSnapshot\":{}"));
        assertTrue(feedbackRequestJson.contains("\"patchTypes\":[]"));
        assertTrue(feedbackRequestJson.contains("\"visibility\":\"admin_only\""));
        assertTrue(patchDisableRequestJson.contains("\"actorAccount\":\"system\""));
    }

    @Test
    void resourceLearningServerShouldExposeTypedContracts() throws Exception {
        Method resourcesMethod = AIQueryResourceLearningServer.class.getMethod("resources");
        Method learnMethod = AIQueryResourceLearningServer.class.getMethod("learn", String.class);
        Method qualitySummaryMethod = AIQueryResourceLearningServer.class.getMethod("qualitySummary", String.class);
        Method feedbackSummaryMethod = AIQueryResourceLearningServer.class.getMethod("feedbackSummary", String.class);
        Method createFeedbackEventMethod = AIQueryResourceLearningServer.class.getMethod(
                "createFeedbackEvent",
                String.class,
                AIQueryLearningFeedbackRequest.class
        );
        Method patchesMethod = AIQueryResourceLearningServer.class.getMethod("patches", String.class, String.class);
        Method disablePatchMethod = AIQueryResourceLearningServer.class.getMethod(
                "disablePatch",
                String.class,
                Long.class,
                AIQueryLearningPatchDisableRequest.class
        );
        Method feedbackEventsMethod = AIQueryResourceLearningServer.class.getMethod(
                "feedbackEvents",
                String.class,
                String.class,
                Long.class,
                String.class,
                String.class
        );
        Method replayMethod = AIQueryResourceLearningServer.class.getMethod("replayFeedbackEvent", String.class, String.class);
        Method feedbackMetricMethod = AIQueryResourceLearningServer.class.getMethod("feedbackMetric", String.class);
        Method evaluateRelearningMethod = AIQueryResourceLearningServer.class.getMethod("evaluateRelearning", String.class);

        assertEquals(AIQueryLearningTriggerVO.class, learnMethod.getReturnType());
        assertEquals(AIQueryLearningQualitySummaryVO.class, qualitySummaryMethod.getReturnType());
        assertEquals(AIQueryLearningFeedbackSummaryVO.class, feedbackSummaryMethod.getReturnType());
        assertEquals(AIQueryLearningFeedbackEventVO.class, createFeedbackEventMethod.getReturnType());
        assertEquals(AIQueryLearningPatchDisableVO.class, disablePatchMethod.getReturnType());
        assertEquals(AIQueryLearningReplayVO.class, replayMethod.getReturnType());
        assertEquals(AIQueryLearningFeedbackMetricVO.class, feedbackMetricMethod.getReturnType());
        assertEquals(AIQueryLearningRelearningDecisionVO.class, evaluateRelearningMethod.getReturnType());
        assertEquals(AIQueryLearningResourceVO.class, firstGenericArgument(resourcesMethod));
        assertEquals(AIQueryLearningPatchVO.class, firstGenericArgument(patchesMethod));
        assertEquals(AIQueryLearningReplayVO.class, firstGenericArgument(feedbackEventsMethod));
    }

    @Test
    void feedbackReplayContractsShouldCarryTrustedAnswerTraceLineage() {
        AIQueryLearningFeedbackRequest request = new AIQueryLearningFeedbackRequest();
        request.setSourceTraceId("ta-lineage");

        AIQueryLearningReplayVO replay = AIQueryThemeManage.toLearningReplayVO(Map.of(
                "event_no", "evt-1",
                "resource_id", "resource-1",
                "source_trace_id", "ta-lineage"
        ));

        assertEquals("ta-lineage", request.getSourceTraceId());
        assertNotNull(replay);
        assertEquals("ta-lineage", replay.getSourceTraceId());
    }

    private static Class<?> firstGenericArgument(Method method) {
        Type returnType = method.getGenericReturnType();
        assertTrue(returnType instanceof ParameterizedType);
        Type actualType = ((ParameterizedType) returnType).getActualTypeArguments()[0];
        assertTrue(actualType instanceof Class<?>);
        return (Class<?>) actualType;
    }
}
