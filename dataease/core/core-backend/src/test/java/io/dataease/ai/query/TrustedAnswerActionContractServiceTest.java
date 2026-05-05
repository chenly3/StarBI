package io.dataease.ai.query;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class TrustedAnswerActionContractServiceTest {

    @Test
    void endpointContractsShouldCoverEveryUserVisibleRuntimeAction() throws Exception {
        Object service = newInstance("io.dataease.ai.query.trusted.TrustedAnswerActionContractService");

        List<?> contracts = assertList(invoke(service, "contracts"));

        assertEquals(18, contracts.size(), "runtime action matrix should be explicit and finite");
        assertHasAction(contracts, "ASSISTANT_VALIDATE");
        assertHasAction(contracts, "ASSISTANT_START");
        assertHasAction(contracts, "BASIC_ASK");
        assertHasAction(contracts, "DATA_INTERPRETATION");
        assertHasAction(contracts, "FORECAST");
        assertHasAction(contracts, "HISTORY_RESTORE");
        assertHasAction(contracts, "DASHBOARD_ASK");
        assertHasAction(contracts, "FILE_ASK");
    }

    @Test
    void sqlbotProxyPathShouldResolveToActionContractOrDefaultDeny() throws Exception {
        Object service = newInstance("io.dataease.ai.query.trusted.TrustedAnswerActionContractService");

        Optional<?> analysis = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "POST",
                "/chat/record/7/analysis"
        ));
        Optional<?> validator = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "GET",
                "/system/assistant/validator?id=assistant-1&virtual=1"
        ));
        Optional<?> start = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "POST",
                "/chat/assistant/start"
        ));
        Optional<?> chartData = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "GET",
                "/chat/record/7/data"
        ));
        Optional<?> predict = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "POST",
                "/chat/record/7/predict"
        ));
        Optional<?> chatList = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "GET",
                "/chat/list"
        ));
        Optional<?> recentQuestions = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "GET",
                "/chat/recent_questions/21"
        ));
        Optional<?> chatWithData = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "GET",
                "/chat/8/with_data"
        ));
        Optional<?> deleteChat = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "DELETE",
                "/chat/8/brief"
        ));
        Optional<?> unmapped = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "POST",
                "/admin/raw-sql"
        ));
        Optional<?> wrongMethod = assertOptional(invoke(
                service,
                "resolveSqlBotRuntime",
                new Class<?>[]{String.class, String.class},
                "DELETE",
                "/chat/record/7/analysis"
        ));

        assertTrue(analysis.isPresent());
        assertEquals("DATA_INTERPRETATION", stringProperty(analysis.orElseThrow(), "getActionType"));
        assertTrue(validator.isPresent());
        assertEquals("ASSISTANT_VALIDATE", stringProperty(validator.orElseThrow(), "getActionType"));
        assertTrue(start.isPresent());
        assertEquals("ASSISTANT_START", stringProperty(start.orElseThrow(), "getActionType"));
        assertTrue(chartData.isPresent());
        assertEquals("CHART_DATA", stringProperty(chartData.orElseThrow(), "getActionType"));
        assertTrue(predict.isPresent());
        assertEquals("FORECAST", stringProperty(predict.orElseThrow(), "getActionType"));
        assertTrue(chatList.isPresent());
        assertEquals("HISTORY_LIST", stringProperty(chatList.orElseThrow(), "getActionType"));
        assertTrue(recentQuestions.isPresent());
        assertEquals("HISTORY_LIST", stringProperty(recentQuestions.orElseThrow(), "getActionType"));
        assertTrue(chatWithData.isPresent());
        assertEquals("HISTORY_RESTORE", stringProperty(chatWithData.orElseThrow(), "getActionType"));
        assertTrue(deleteChat.isPresent());
        assertEquals("HISTORY_LIST", stringProperty(deleteChat.orElseThrow(), "getActionType"));
        assertFalse(unmapped.isPresent());
        assertFalse(wrongMethod.isPresent());
    }

    @Test
    void sqlbotProxyShouldRequireTrustedTraceForHistorySnapshotAndContextActions() throws Exception {
        String source = java.nio.file.Files.readString(java.nio.file.Path.of(
                "src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java"
        ));

        assertTrue(
                source.contains("actionType == TrustedAnswerActionType.HISTORY_RESTORE"),
                "history restore must rebuild current trusted scope before proxying facts"
        );
        assertTrue(
                source.contains("actionType == TrustedAnswerActionType.CONTEXT_SWITCH"),
                "context switch must be bound to a trusted trace"
        );
        assertTrue(
                source.contains("actionType == TrustedAnswerActionType.SNAPSHOT"),
                "snapshot writes must be bound to a trusted trace"
        );
        assertTrue(
                source.contains("requiresTrustedRecordScope(actionType)"),
                "record-level scope checks should not be weakened when chat-level trace checks are added"
        );
    }

    @Test
    void disabledSwitchesShouldReturnExplicitRuntimeErrors() throws Exception {
        Object service = newInstance("io.dataease.ai.query.trusted.TrustedAnswerActionContractService");
        Object policy = newInstance("io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO");
        invoke(policy, "setAskEnabled", new Class<?>[]{Boolean.class}, Boolean.FALSE);

        Object actionType = enumConstant("io.dataease.api.ai.query.vo.TrustedAnswerActionType", "BASIC_ASK");
        Optional<?> disabled = assertOptional(invoke(
                service,
                "disabledError",
                new Class<?>[]{
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerActionType"),
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO")
                },
                actionType,
                policy
        ));

        assertTrue(disabled.isPresent());
        assertEquals("ASK_DISABLED", disabled.orElseThrow().toString());

        Object interpretationType = enumConstant("io.dataease.api.ai.query.vo.TrustedAnswerActionType", "DATA_INTERPRETATION");
        Optional<?> interpretationAskDisabled = assertOptional(invoke(
                service,
                "disabledError",
                new Class<?>[]{
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerActionType"),
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO")
                },
                interpretationType,
                policy
        ));
        assertTrue(interpretationAskDisabled.isPresent());
        assertEquals("ASK_DISABLED", interpretationAskDisabled.orElseThrow().toString());

        Object forecastType = enumConstant("io.dataease.api.ai.query.vo.TrustedAnswerActionType", "FORECAST");
        Optional<?> forecastAskDisabled = assertOptional(invoke(
                service,
                "disabledError",
                new Class<?>[]{
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerActionType"),
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO")
                },
                forecastType,
                policy
        ));
        assertTrue(forecastAskDisabled.isPresent());
        assertEquals("ASK_DISABLED", forecastAskDisabled.orElseThrow().toString());

        invoke(policy, "setAskEnabled", new Class<?>[]{Boolean.class}, Boolean.TRUE);
        invoke(policy, "setDataInterpretationEnabled", new Class<?>[]{Boolean.class}, Boolean.FALSE);
        invoke(policy, "setForecastEnabled", new Class<?>[]{Boolean.class}, Boolean.FALSE);

        Optional<?> interpretationActionDisabled = assertOptional(invoke(
                service,
                "disabledError",
                new Class<?>[]{
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerActionType"),
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO")
                },
                interpretationType,
                policy
        ));
        assertTrue(interpretationActionDisabled.isPresent());
        assertEquals("ACTION_DISABLED", interpretationActionDisabled.orElseThrow().toString());

        Optional<?> forecastActionDisabled = assertOptional(invoke(
                service,
                "disabledError",
                new Class<?>[]{
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerActionType"),
                        requireClass("io.dataease.api.ai.query.vo.TrustedAnswerRuntimePolicyVO")
                },
                forecastType,
                policy
        ));
        assertTrue(forecastActionDisabled.isPresent());
        assertEquals("ACTION_DISABLED", forecastActionDisabled.orElseThrow().toString());
    }

    @Test
    void runtimePolicyShouldDefaultToEnabledExceptExplicitFalse() throws Exception {
        Class<?> serviceClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerRuntimePolicyService");
        Constructor<?> constructor = serviceClass.getConstructor(Function.class);
        Function<String, String> parameterReader = key -> {
            if ("ai.query.ask_enabled".equals(key)) {
                return "false";
            }
            if ("ai.query.voice_enabled".equals(key)) {
                return "";
            }
            return "true";
        };

        Object service = constructor.newInstance(parameterReader);
        Object policy = invoke(service, "load");

        assertEquals(Boolean.FALSE, invoke(policy, "getAskEnabled"));
        assertEquals(Boolean.TRUE, invoke(policy, "getDataInterpretationEnabled"));
        assertEquals(Boolean.TRUE, invoke(policy, "getForecastEnabled"));
        assertEquals(Boolean.TRUE, invoke(policy, "getFollowupEnabled"));
        assertEquals(Boolean.TRUE, invoke(policy, "getSampleDatasetEnabled"));
        assertEquals(Boolean.TRUE, invoke(policy, "getVoiceEnabled"));
    }

    private static void assertHasAction(List<?> contracts, String actionType) throws Exception {
        boolean present = false;
        for (Object contract : contracts) {
            if (actionType.equals(stringProperty(contract, "getActionType"))) {
                present = true;
                break;
            }
        }
        assertTrue(present, "runtime action matrix should contain " + actionType);
    }

    private static String stringProperty(Object target, String getter) throws Exception {
        Object value = invoke(target, getter);
        return value == null ? "" : value.toString();
    }

    private static List<?> assertList(Object value) {
        assertInstanceOf(List.class, value);
        return (List<?>) value;
    }

    private static Optional<?> assertOptional(Object value) {
        assertInstanceOf(Optional.class, value);
        return (Optional<?>) value;
    }

    private static Object enumConstant(String className, String name) {
        Class<?> enumClass = requireClass(className);
        if (!enumClass.isEnum()) {
            fail(className + " should be an enum");
        }
        for (Object constant : enumClass.getEnumConstants()) {
            if (name.equals(constant.toString())) {
                return constant;
            }
        }
        fail(className + " should contain " + name);
        return null;
    }

    private static Object newInstance(String className) throws Exception {
        return requireClass(className).getConstructor().newInstance();
    }

    private static Object invoke(Object target, String methodName) throws Exception {
        return invoke(target, methodName, new Class<?>[0]);
    }

    private static Object invoke(Object target, String methodName, Class<?>[] parameterTypes, Object... args)
            throws Exception {
        Method method = target.getClass().getMethod(methodName, parameterTypes);
        return method.invoke(target, args);
    }

    private static Class<?> requireClass(String className) {
        try {
            return Class.forName(className);
        } catch (ClassNotFoundException e) {
            fail("Missing class required by action contract tests: " + className);
            return null;
        }
    }
}
