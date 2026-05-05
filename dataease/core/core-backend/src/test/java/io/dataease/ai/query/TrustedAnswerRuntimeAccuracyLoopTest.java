package io.dataease.ai.query;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class TrustedAnswerRuntimeAccuracyLoopTest {

    @Test
    void runtimeContextShouldExposeConstructorForPolicyActionConversationAndFactBoundaryServices() {
        Class<?> runtimeContextClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerRuntimeContextService");

        boolean constructorPresent = Arrays.stream(runtimeContextClass.getConstructors()).anyMatch(constructor -> {
            List<String> parameterNames = Arrays.stream(constructor.getParameterTypes())
                    .map(Class::getSimpleName)
                    .toList();
            return parameterNames.contains("TrustedAnswerRuntimePolicyService")
                    && parameterNames.contains("TrustedAnswerActionContractService")
                    && parameterNames.contains("TrustedAnswerConversationContextService")
                    && parameterNames.contains("TrustedAnswerFactBoundaryService")
                    && parameterNames.contains("TrustedAnswerResourceReadinessService")
                    && parameterNames.contains("TrustedAnswerSemanticPatchService");
        });

        assertTrue(
                constructorPresent,
                "TrustedAnswerRuntimeContextService should be injectable with policy/action/conversation/fact services"
        );
    }

    @Test
    void springRuntimeContextConstructorShouldInjectRealRuntimePolicyService() {
        Class<?> runtimeContextClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerRuntimeContextService");

        Constructor<?> springConstructor = Arrays.stream(runtimeContextClass.getConstructors())
                .filter(constructor -> constructor.isAnnotationPresent(Autowired.class))
                .findFirst()
                .orElseGet(() -> fail("TrustedAnswerRuntimeContextService should have one Spring @Autowired constructor"));
        List<String> springParameterNames = Arrays.stream(springConstructor.getParameterTypes())
                .map(Class::getSimpleName)
                .toList();

        assertTrue(
                springParameterNames.contains("TrustedAnswerRuntimePolicyService"),
                "Spring constructor should receive the real TrustedAnswerRuntimePolicyService bean"
        );
        assertTrue(
                springParameterNames.contains("TrustedAnswerActionContractService"),
                "Spring constructor should receive the real TrustedAnswerActionContractService bean"
        );
        assertTrue(
                springParameterNames.contains("TrustedAnswerResourceReadinessService"),
                "Spring constructor should receive the real TrustedAnswerResourceReadinessService bean"
        );
        assertTrue(
                springParameterNames.contains("TrustedAnswerSemanticPatchService"),
                "Spring constructor should receive the real TrustedAnswerSemanticPatchService bean"
        );

        boolean legacyFourArgConstructorAutowired = Arrays.stream(runtimeContextClass.getConstructors())
                .filter(constructor -> constructor.getParameterCount() == 4)
                .anyMatch(constructor -> constructor.isAnnotationPresent(Autowired.class));

        assertFalse(
                legacyFourArgConstructorAutowired,
                "4-arg convenience constructor must not be the Spring injection entrypoint"
        );
    }

    @Test
    void historyContextShouldNotCarryRawSqlOrHiddenFieldsAfterPermissionRebuild() throws Exception {
        Object scope = newInstance("io.dataease.ai.query.trusted.AuthorizedAskScope");
        invoke(scope, "setPermissionSummary", new Class<?>[]{String.class}, "当前基于你有权限的数据生成");
        Object visibleFieldIds = invoke(scope, "getVisibleFieldIds");
        if (visibleFieldIds instanceof List<?> list) {
            @SuppressWarnings("unchecked")
            List<Object> mutableList = (List<Object>) list;
            mutableList.add("amount");
        } else {
            fail("AuthorizedAskScope#getVisibleFieldIds should return a List");
        }

        Object service = newInstance("io.dataease.ai.query.trusted.TrustedAnswerConversationContextService");
        String redacted = String.valueOf(invoke(
                service,
                "rebuildForSqlBot",
                new Class<?>[]{
                        requireClass("io.dataease.ai.query.trusted.AuthorizedAskScope"),
                        String.class
                },
                scope,
                "上一轮 SQL: select hidden_salary from t_user; 隐藏字段 hidden_salary 的值是多少"
        ));

        assertTrue(redacted.contains("当前基于你有权限的数据生成"));
        assertFalse(redacted.toLowerCase().contains("select"));
        assertFalse(redacted.contains("hidden_salary"));
        assertFalse(redacted.contains("t_user"));
    }

    @Test
    void sqlbotFactPayloadShouldAllowGenerationEventsButBlockUnmarkedFacts() throws Exception {
        Object service = newInstance("io.dataease.ai.query.trusted.TrustedAnswerFactBoundaryService");

        boolean chartGenerationEvent = (boolean) invoke(
                service,
                "isFactPayloadAllowed",
                new Class<?>[]{Object.class},
                Map.of("type", "chart-result", "content", "销售额为 100 万")
        );
        boolean unmarkedAnswer = (boolean) invoke(
                service,
                "isFactPayloadAllowed",
                new Class<?>[]{Object.class},
                Map.of("type", "answer", "content", "销售额为 100 万")
        );
        boolean authorizedAnswer = (boolean) invoke(
                service,
                "isFactPayloadAllowed",
                new Class<?>[]{Object.class},
                Map.of("type", "answer", "dataease_authorized_result", true, "content", "销售额为 100 万")
        );

        assertTrue(chartGenerationEvent);
        assertFalse(unmarkedAnswer);
        assertTrue(authorizedAnswer);
    }

    @Test
    void dataEaseShouldMarkFactPayloadsAfterTrustedScopeIsBuilt() throws Exception {
        Object service = newInstance("io.dataease.ai.query.trusted.TrustedAnswerFactBoundaryService");
        Map<String, Object> answer = new java.util.LinkedHashMap<>();
        answer.put("type", "answer");
        answer.put("content", "销售额为 100 万");

        Object marked = invoke(
                service,
                "authorizeTrustedFactPayload",
                new Class<?>[]{Object.class, boolean.class},
                answer,
                true
        );

        assertTrue(marked instanceof Map<?, ?>);
        assertTrue(Boolean.TRUE.equals(((Map<?, ?>) marked).get("dataease_authorized_result")));
        assertTrue((boolean) invoke(
                service,
                "isFactPayloadAllowed",
                new Class<?>[]{Object.class},
                marked
        ));
    }

    @Test
    void factBoundaryShouldNotSelfAuthorizeWithoutTrustedDataEaseScope() throws Exception {
        Object service = newInstance("io.dataease.ai.query.trusted.TrustedAnswerFactBoundaryService");
        Map<String, Object> answer = new java.util.LinkedHashMap<>();
        answer.put("type", "answer");
        answer.put("content", "销售额为 100 万");

        Object unmarked = invoke(
                service,
                "authorizeTrustedFactPayload",
                new Class<?>[]{Object.class},
                answer
        );
        Object explicitlyUntrusted = invoke(
                service,
                "authorizeTrustedFactPayload",
                new Class<?>[]{Object.class, boolean.class},
                answer,
                false
        );

        assertFalse(Boolean.TRUE.equals(((Map<?, ?>) unmarked).get("dataease_authorized_result")));
        assertFalse(Boolean.TRUE.equals(((Map<?, ?>) explicitlyUntrusted).get("dataease_authorized_result")));
        assertFalse((boolean) invoke(
                service,
                "isFactPayloadAllowed",
                new Class<?>[]{Object.class},
                unmarked
        ));
    }

    @Test
    void sqlbotProxyShouldUseActionContractDefaultDenyGuard() {
        Class<?> proxyClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerStubSqlBotProxy");

        boolean constructorPresent = Arrays.stream(proxyClass.getConstructors()).anyMatch(constructor ->
                Arrays.stream(constructor.getParameterTypes())
                        .map(Class::getSimpleName)
                        .anyMatch("TrustedAnswerActionContractService"::equals)
        );

        assertTrue(constructorPresent, "SQLBot runtime proxy should accept TrustedAnswerActionContractService");
    }

    @Test
    void sqlbotProxyShouldApplyRuntimePolicyAfterResolvingRuntimeActionContract() throws Exception {
        Class<?> proxyClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerStubSqlBotProxy");

        boolean policyFieldPresent = Arrays.stream(proxyClass.getDeclaredFields())
                .map(Field::getType)
                .map(Class::getSimpleName)
                .anyMatch("TrustedAnswerRuntimePolicyService"::equals);
        boolean policyConstructorPresent = Arrays.stream(proxyClass.getConstructors()).anyMatch(constructor ->
                Arrays.stream(constructor.getParameterTypes())
                        .map(Class::getSimpleName)
                        .anyMatch("TrustedAnswerRuntimePolicyService"::equals)
        );

        assertTrue(policyFieldPresent, "SQLBot proxy should hold TrustedAnswerRuntimePolicyService");
        assertTrue(policyConstructorPresent, "SQLBot proxy should be injectable with TrustedAnswerRuntimePolicyService");
        assertTrue(
                Arrays.stream(proxyClass.getConstructors()).anyMatch(constructor ->
                        Arrays.stream(constructor.getParameterTypes())
                                .map(Class::getSimpleName)
                                .anyMatch("TrustedAnswerTraceStore"::equals)
                ),
                "SQLBot proxy should be injectable with TrustedAnswerTraceStore for record scope checks"
        );

        String source = Files.readString(Path.of(
                "src/main/java/io/dataease/ai/query/trusted/TrustedAnswerStubSqlBotProxy.java"
        ));
        int resolveIndex = source.indexOf("resolveSqlBotRuntime(method, path)");
        int disabledIndex = source.indexOf("disabledError(", resolveIndex);
        int proxyBuildIndex = source.indexOf("buildRuntimeProxyRequest", resolveIndex);

        assertTrue(resolveIndex >= 0, "proxyRuntime should resolve runtime action contracts");
        assertTrue(disabledIndex > resolveIndex, "proxyRuntime should call disabledError after resolving the contract");
        assertTrue(
                proxyBuildIndex < 0 || disabledIndex < proxyBuildIndex,
                "runtime switches should be checked before proxying the upstream SQLBot request"
        );
        assertTrue(
                source.contains("validateTrustedRuntimeScope(request, contract.get().getActionType(), path)"),
                "runtime proxy should validate trusted trace and record scope before proxying record-level actions"
        );
        assertTrue(
                source.contains("rememberTrustedRecordId(trace, sqlbotEvent)"),
                "question stream should bind SQLBot record ids back to the trusted trace"
        );
    }

    @Test
    void runtimeContextShouldUseResourceReadinessInsteadOfHardcodingFormalAskable() throws Exception {
        String source = Files.readString(Path.of(
                "src/main/java/io/dataease/ai/query/trusted/TrustedAnswerRuntimeContextService.java"
        ));

        assertTrue(
                source.contains("resourceReadinessService.evaluate"),
                "runtime context should consume resource readiness service"
        );
        assertFalse(
                source.contains("context.setReadinessState(ResourceReadinessState.FORMAL_ASKABLE);"),
                "runtime context must not unconditionally mark resources as formal askable"
        );
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
            fail("Missing runtime class required by accuracy loop tests: " + className);
            return null;
        }
    }
}
