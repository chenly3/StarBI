package io.dataease.ai.query;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class SmartQueryAccuracyLoopSdkContractTest {

    @Test
    void trustedAnswerRequestShouldCarryActionEntryResourceAndTraceLineage() {
        Class<?> requestClass = requireClass("io.dataease.api.ai.query.request.TrustedAnswerRequest");

        assertJsonField(requestClass, "actionType", "action_type");
        assertJsonField(requestClass, "entryScene", "entry_scene");
        assertJsonField(requestClass, "resourceKind", "resource_kind");
        assertJsonField(requestClass, "resourceId", "resource_id");
        assertJsonField(requestClass, "sourceTraceId", "source_trace_id");
        assertJsonField(requestClass, "parentTraceId", "parent_trace_id");
        assertJsonField(requestClass, "recordId", "record_id");
    }

    @Test
    void trustedAnswerRuntimeValueObjectsShouldExistWithRequiredJsonContracts() {
        assertEnumConstants(
                "io.dataease.api.ai.query.vo.TrustedAnswerActionType",
                "ASSISTANT_VALIDATE",
                "ASSISTANT_START",
                "BASIC_ASK",
                "RECOMMENDATION_ASK",
                "DATA_INTERPRETATION",
                "FORECAST",
                "MANUAL_FOLLOW_UP",
                "AUTO_FOLLOW_UP",
                "HISTORY_LIST",
                "HISTORY_RESTORE",
                "HISTORY_FOLLOW_UP",
                "CHART_DATA",
                "USAGE",
                "CONTEXT_SWITCH",
                "SNAPSHOT",
                "DASHBOARD_ASK",
                "FILE_ASK"
        );
        assertEnumConstants(
                "io.dataease.api.ai.query.vo.TrustedAnswerSwitchKey",
                "ASK_ENABLED",
                "DATA_INTERPRETATION_ENABLED",
                "FORECAST_ENABLED",
                "FOLLOWUP_ENABLED",
                "SAMPLE_DATASET_ENABLED",
                "VOICE_ENABLED"
        );
        assertEnumConstants(
                "io.dataease.api.ai.query.vo.AuthorizedAskabilityState",
                "ASK_ALLOWED",
                "ASK_PARTIAL",
                "ASK_BLOCKED"
        );
        assertEnumConstants(
                "io.dataease.api.ai.query.vo.ResourceReadinessState",
                "NOT_ASKABLE",
                "TRIAL_ASKABLE",
                "FORMAL_ASKABLE",
                "NEEDS_OPTIMIZATION"
        );

        Class<?> contextClass = requireClass("io.dataease.api.ai.query.vo.TrustedAnswerContextVO");
        assertJsonField(contextClass, "actionType", "action_type");
        assertJsonField(contextClass, "entryScene", "entry_scene");
        assertJsonField(contextClass, "resourceKind", "resource_kind");
        assertJsonField(contextClass, "resourceId", "resource_id");
        assertJsonField(contextClass, "chatId", "chat_id");
        assertJsonField(contextClass, "readinessState", "readiness_state");
        assertJsonField(contextClass, "askabilityState", "askability_state");
        assertJsonField(contextClass, "runtimePolicy", "runtime_policy");

        Class<?> traceClass = requireClass("io.dataease.api.ai.query.vo.TrustedAnswerTraceVO");
        assertJsonField(traceClass, "authorizedRecordIds", "authorized_record_ids");
        assertJsonField(traceClass, "sourceTraceId", "source_trace_id");
        assertJsonField(traceClass, "parentTraceId", "parent_trace_id");
        assertJsonField(traceClass, "userSafeEvidenceSummary", "user_safe_evidence_summary");
        assertJsonField(traceClass, "blockedReason", "blocked_reason");

        Class<?> runtimePolicyClass = requireClass("io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO");
        assertJsonField(runtimePolicyClass, "askEnabled", "ask_enabled");
        assertJsonField(runtimePolicyClass, "dataInterpretationEnabled", "data_interpretation_enabled");
        assertJsonField(runtimePolicyClass, "forecastEnabled", "forecast_enabled");
        assertJsonField(runtimePolicyClass, "followupEnabled", "followup_enabled");
        assertJsonField(runtimePolicyClass, "sampleDatasetEnabled", "sample_dataset_enabled");
        assertJsonField(runtimePolicyClass, "voiceEnabled", "voice_enabled");

        Class<?> contractClass = requireClass("io.dataease.api.ai.query.vo.TrustedAnswerEndpointContractVO");
        assertJsonField(contractClass, "dataEaseEndpoint", "dataease_endpoint");
        assertJsonField(contractClass, "actionType", "action_type");
        assertJsonField(contractClass, "requiredSwitch", "required_switch");
        assertJsonField(contractClass, "sqlBotUpstream", "sqlbot_upstream");
        assertJsonField(contractClass, "capabilityCheck", "capability_check");
        assertJsonField(contractClass, "negativeTest", "negative_test");

        Class<?> todoClass = requireClass("io.dataease.api.ai.query.vo.TrustedAnswerCorrectionTodoVO");
        assertJsonField(todoClass, "todoId", "todo_id");
        assertJsonField(todoClass, "sanitizedQuestionSummary", "sanitized_question_summary");
        assertJsonField(todoClass, "duplicateFingerprint", "duplicate_fingerprint");
        assertJsonField(todoClass, "restrictedPayloadVisible", "restricted_payload_visible");

        Class<?> patchClass = requireClass("io.dataease.api.ai.query.vo.TrustedAnswerSemanticPatchVO");
        assertJsonField(patchClass, "patchId", "patch_id");
        assertJsonField(patchClass, "sourceTodoId", "source_todo_id");
        assertJsonField(patchClass, "auditEventNo", "audit_event_no");
        assertJsonField(patchClass, "rollbackToPatchId", "rollback_to_patch_id");

        requireClass("io.dataease.api.ai.query.request.TrustedAnswerCorrectionFeedbackRequest");
        requireClass("io.dataease.api.ai.query.request.TrustedAnswerSemanticPatchRequest");
    }

    @Test
    void trustedAnswerErrorCodesShouldCoverAccuracyLoopGuardrails() {
        Class<?> errorCodeClass = requireClass("io.dataease.api.ai.query.vo.TrustedAnswerErrorCode");

        assertEnumConstants(
                errorCodeClass,
                "ASK_DISABLED",
                "ACTION_DISABLED",
                "UNMAPPED_SQLBOT_PROXY_PATH",
                "TRUSTED_TRACE_REQUIRED",
                "FACT_RESULT_REQUIRED",
                "RESOURCE_NOT_ASKABLE",
                "SENSITIVE_PAYLOAD_RESTRICTED"
        );
    }

    @Test
    void trustedAnswerServerShouldExposeAccuracyLoopEndpoints() {
        Class<?> serverClass = requireClass("io.dataease.ai.query.server.AIQueryTrustedAnswerServer");

        assertHasPublicMethod(serverClass, "contracts");
        assertHasPublicMethod(serverClass, "createCorrectionTodo");
        assertHasPublicMethod(serverClass, "correctionTodos");
        assertHasPublicMethod(serverClass, "applySemanticPatch");
        assertHasPublicMethod(serverClass, "dashboardAsk");
        assertHasPublicMethod(serverClass, "fileAsk");
    }

    private static void assertEnumConstants(String className, String... expectedNames) {
        assertEnumConstants(requireClass(className), expectedNames);
    }

    private static void assertEnumConstants(Class<?> enumClass, String... expectedNames) {
        assertTrue(enumClass.isEnum(), enumClass.getName() + " should be an enum");
        Set<String> actualNames = Arrays.stream(enumClass.getEnumConstants())
                .map(Object::toString)
                .collect(Collectors.toSet());
        for (String expectedName : expectedNames) {
            assertTrue(
                    actualNames.contains(expectedName),
                    enumClass.getName() + " should contain " + expectedName
            );
        }
    }

    private static void assertJsonField(Class<?> type, String fieldName, String jsonName) {
        Field field = requireField(type, fieldName);
        JsonProperty jsonProperty = field.getAnnotation(JsonProperty.class);
        assertNotNull(jsonProperty, type.getName() + "." + fieldName + " should have @JsonProperty");
        assertEquals(jsonName, jsonProperty.value());
    }

    private static Field requireField(Class<?> type, String fieldName) {
        try {
            return type.getDeclaredField(fieldName);
        } catch (NoSuchFieldException e) {
            fail(type.getName() + " should declare field " + fieldName);
            return null;
        }
    }

    private static void assertHasPublicMethod(Class<?> type, String methodName) {
        boolean present = Arrays.stream(type.getMethods()).map(Method::getName).anyMatch(methodName::equals);
        assertTrue(present, type.getName() + " should expose method " + methodName);
    }

    private static Class<?> requireClass(String className) {
        try {
            return Class.forName(className);
        } catch (ClassNotFoundException e) {
            fail("Missing class required by smart query accuracy loop contract: " + className);
            return null;
        }
    }
}
