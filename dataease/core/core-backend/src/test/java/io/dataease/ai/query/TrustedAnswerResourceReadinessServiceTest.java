package io.dataease.ai.query;

import io.dataease.api.ai.query.vo.AIQueryLearningResourceVO;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

class TrustedAnswerResourceReadinessServiceTest {

    @Test
    void disabledOrNoFieldsShouldBeNotAskable() throws Exception {
        Object service = service();
        AIQueryLearningResourceVO disabled = resource("succeeded", 95, 3, 0, 0, 0);
        set(disabled, "setEnabled", Boolean.FALSE);

        assertEquals("NOT_ASKABLE", evaluateState(service, disabled));

        AIQueryLearningResourceVO noFields = resource("succeeded", 95, 3, 0, 0, 0);
        set(noFields, "setFieldCount", 0);

        assertEquals("NOT_ASKABLE", evaluateState(service, noFields));
    }

    @Test
    void learnedWithoutRecommendationsShouldNotBecomeFormalAskable() throws Exception {
        Object service = service();

        assertEquals("TRIAL_ASKABLE", evaluateState(service, resource("succeeded", 90, 0, 0, 0, 0)));
    }

    @Test
    void notLearnedOrFailedShouldBeNotAskable() throws Exception {
        Object service = service();

        assertEquals("NOT_ASKABLE", evaluateState(service, resource("pending", 70, 3, 0, 0, 0)));
        assertEquals("NOT_ASKABLE", evaluateState(service, resource("failed", 70, 3, 0, 0, 0)));
        assertEquals("NOT_ASKABLE", evaluateState(service, resource("", 70, 3, 0, 0, 0)));
    }

    @Test
    void learnedWithLowScoreOrRiskShouldNeedOptimization() throws Exception {
        Object service = service();

        assertEquals("NEEDS_OPTIMIZATION", evaluateState(service, resource("succeeded", 49, 3, 0, 0, 0)));
        assertEquals("NEEDS_OPTIMIZATION", evaluateState(service, resource("succeeded", 90, 3, 10, 0, 0)));
        assertEquals("NEEDS_OPTIMIZATION", evaluateState(service, resource("succeeded", 90, 3, 0, 20, 0)));
        assertEquals("NEEDS_OPTIMIZATION", evaluateState(service, resource("succeeded", 90, 3, 0, 0, 15)));
    }

    @Test
    void highQualityLearnedResourceShouldBecomeFormalAskable() throws Exception {
        Object service = service();

        assertEquals("FORMAL_ASKABLE", evaluateState(service, resource("succeeded", 90, 3, 0, 0, 0)));
    }

    private static Object service() throws Exception {
        return requireClass("io.dataease.ai.query.trusted.TrustedAnswerResourceReadinessService")
                .getConstructor()
                .newInstance();
    }

    private static String evaluateState(Object service, AIQueryLearningResourceVO resource) throws Exception {
        Method evaluate = service.getClass().getMethod("evaluate", AIQueryLearningResourceVO.class);
        Object evaluation = evaluate.invoke(service, resource);
        Object state = invokeNoArg(evaluation, "state");
        return state == null ? "" : state.toString();
    }

    private static AIQueryLearningResourceVO resource(
            String status,
            int score,
            int recommendationCount,
            int failureRate,
            int negativeFeedbackRate,
            int ambiguityRate
    ) throws Exception {
        AIQueryLearningResourceVO resource = new AIQueryLearningResourceVO();
        resource.setResourceId("resource-1");
        resource.setName("销售资源");
        resource.setLearningStatus(status);
        resource.setQualityScore(score);
        set(resource, "setEnabled", Boolean.TRUE);
        set(resource, "setThemeBound", Boolean.TRUE);
        set(resource, "setFieldCount", 8);
        set(resource, "setRecommendationCount", recommendationCount);
        set(resource, "setFailureRate30d", failureRate);
        set(resource, "setNegativeFeedbackRate30d", negativeFeedbackRate);
        set(resource, "setAmbiguityRate30d", ambiguityRate);
        return resource;
    }

    private static void set(Object target, String methodName, Object value) throws Exception {
        Method method = findSetter(target.getClass(), methodName);
        method.invoke(target, value);
    }

    private static Method findSetter(Class<?> type, String methodName) {
        for (Method method : type.getMethods()) {
            if (method.getName().equals(methodName) && method.getParameterCount() == 1) {
                return method;
            }
        }
        fail(type.getName() + " should expose " + methodName);
        return null;
    }

    private static Object invokeNoArg(Object target, String methodName) throws Exception {
        Method method = target.getClass().getMethod(methodName);
        return method.invoke(target);
    }

    private static Class<?> requireClass(String className) {
        try {
            return Class.forName(className);
        } catch (ClassNotFoundException e) {
            fail("Missing class required by resource readiness tests: " + className);
            return null;
        }
    }
}
