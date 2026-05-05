package io.dataease.ai.query;

import io.dataease.ai.query.server.AIQueryTrustedAnswerServer;
import io.dataease.ai.query.trusted.TrustedAnswerCorrectionTodoService;
import io.dataease.ai.query.trusted.TrustedAnswerSensitivePayloadService;
import io.dataease.api.ai.query.request.TrustedAnswerCorrectionFeedbackRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerCorrectionTodoVO;
import io.dataease.auth.bo.TokenUserBO;
import io.dataease.utils.AuthUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockHttpServletRequest;

import java.lang.annotation.Annotation;
import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class TrustedAnswerCorrectionTodoServiceTest {

    @Test
    void duplicateFeedbackShouldAggregateByTenantScopedFingerprint() throws Exception {
        Object service = service();
        Object request = feedbackRequest("FIELD_AMBIGUOUS", "客户张三手机号13812345678销售额是多少");

        Object first = create(service, request);
        Object second = create(service, request);
        List<?> todos = listForRole(service, "resource_owner");

        assertEquals(property(first, "getTodoId"), property(second, "getTodoId"));
        assertEquals(2, property(second, "getImpactCount"));
        assertEquals(1, todos.size());
        assertFalse(String.valueOf(property(todos.get(0), "getSanitizedQuestionSummary")).contains("13812345678"));
        assertEquals(Boolean.FALSE, property(todos.get(0), "getRestrictedPayloadVisible"));
    }

    @Test
    void restrictedPayloadShouldOnlyBeVisibleToDiagnosisRole() throws Exception {
        Object service = service();
        Object request = feedbackRequest("FIELD_AMBIGUOUS", "客户张三的销售额");

        create(service, request);

        Object resourceOwnerTodo = listForRole(service, "resource_owner").get(0);
        Object diagnosisTodo = listForRole(service, "diagnosis_operator").get(0);

        assertEquals(Boolean.FALSE, property(resourceOwnerTodo, "getRestrictedPayloadVisible"));
        assertEquals(Boolean.TRUE, property(diagnosisTodo, "getRestrictedPayloadVisible"));
        assertTrue(String.valueOf(property(diagnosisTodo, "getSanitizedQuestionSummary")).contains("[姓名]"));
    }

    @Test
    void serverCreateCorrectionTodoShouldUseServerAuthScopeNotClientHeaders() throws Exception {
        Class<?> serverClass = requireClass("io.dataease.ai.query.server.AIQueryTrustedAnswerServer");
        Constructor<?> springConstructor = springConstructor(serverClass);
        assertTrue(
                List.of(springConstructor.getParameterTypes()).contains(
                        requireClass("io.dataease.ai.query.trusted.TrustedAnswerCorrectionTodoService")
                ),
                "Spring constructor should receive the real TrustedAnswerCorrectionTodoService bean"
        );
        Method method = serverClass.getMethod(
                "createCorrectionTodo",
                requireClass("io.dataease.api.ai.query.request.TrustedAnswerCorrectionFeedbackRequest"),
                HttpServletRequest.class
        );
        assertEquals(HttpServletRequest.class, method.getParameterTypes()[1]);

        TrustedAnswerCorrectionTodoService todoService = new TrustedAnswerCorrectionTodoService(
                new TrustedAnswerSensitivePayloadService("server-unit-test-secret")
        );
        AIQueryTrustedAnswerServer server = new AIQueryTrustedAnswerServer(
                null,
                null,
                null,
                null,
                null,
                todoService,
                null
        );
        TrustedAnswerCorrectionFeedbackRequest request = typedFeedbackRequest(
                "FIELD_AMBIGUOUS",
                "同一个问题跨租户不能合并"
        );
        MockHttpServletRequest httpRequest = new MockHttpServletRequest();
        httpRequest.addHeader("X-DE-Tenant-Id", "spoofed-tenant");
        httpRequest.addHeader("X-DE-Workspace-Id", "spoofed-workspace");
        httpRequest.addHeader("X-DE-User-Id", "spoofed-user");

        TrustedAnswerCorrectionTodoVO todo;
        try {
            AuthUtils.setUser(new TokenUserBO(99L, 12345L));
            todo = server.createCorrectionTodo(request, httpRequest);
        } finally {
            AuthUtils.remove();
        }

        assertEquals("12345", todo.getTenantId());
        assertEquals("12345", todo.getWorkspaceId());

        String source = Files.readString(Path.of(
                "src/main/java/io/dataease/ai/query/server/AIQueryTrustedAnswerServer.java"
        ));
        assertFalse(source.contains("X-DE-Role"), "server must not trust client supplied correction todo role");
        assertFalse(source.contains("X-DE-Tenant-Id"), "server must not trust client supplied correction todo tenant");
        assertTrue(source.contains("AuthUtils.getUser()"), "server should derive correction todo scope from AuthUtils");
    }

    @Test
    void runtimePolicyServiceSpringConstructorShouldUseSysParameterManage() {
        Class<?> serviceClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerRuntimePolicyService");
        Constructor<?> springConstructor = springConstructor(serviceClass);

        assertEquals(1, springConstructor.getParameterCount());
        assertEquals(
                "SysParameterManage",
                springConstructor.getParameterTypes()[0].getSimpleName(),
                "Spring constructor should inject SysParameterManage instead of the Function test constructor"
        );
    }

    @Test
    void opsServiceSpringConstructorShouldUseCorrectionTodoService() {
        Class<?> serviceClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerOpsService");
        Constructor<?> springConstructor = springConstructor(serviceClass);

        assertTrue(
                List.of(springConstructor.getParameterTypes()).contains(
                        requireClass("io.dataease.ai.query.trusted.TrustedAnswerCorrectionTodoService")
                ),
                "Spring constructor should receive TrustedAnswerCorrectionTodoService"
        );
    }

    @Test
    void serverCreateCorrectionTodoShouldRejectMissingServerAuthScope() {
        AIQueryTrustedAnswerServer server = server(new TrustedAnswerCorrectionTodoService(
                new TrustedAnswerSensitivePayloadService("server-unit-test-secret")
        ));
        TrustedAnswerCorrectionFeedbackRequest request = typedFeedbackRequest("FIELD_AMBIGUOUS", "缺上下文不能创建");

        AuthUtils.remove();
        assertThrows(IllegalArgumentException.class, () -> server.createCorrectionTodo(request, headers(null, "workspace-a", "user-a", null)));
        try {
            AuthUtils.setUser(new TokenUserBO(9L, null));
            assertThrows(IllegalArgumentException.class, () -> server.createCorrectionTodo(request, headers("tenant-a", "workspace-a", "user-a", null)));
        } finally {
            AuthUtils.remove();
        }
    }

    @Test
    void serverCorrectionTodosShouldListOnlyCurrentTenantAndWorkspace() throws Exception {
        TrustedAnswerCorrectionTodoService todoService = new TrustedAnswerCorrectionTodoService(
                new TrustedAnswerSensitivePayloadService("server-unit-test-secret")
        );
        AIQueryTrustedAnswerServer server = server(todoService);
        TrustedAnswerCorrectionFeedbackRequest request = typedFeedbackRequest("FIELD_AMBIGUOUS", "同一个问题不同空间隔离");
        withUser(11L, 1001L, () -> server.createCorrectionTodo(request, headers("spoofed-a", "spoofed-a", "user-a", null)));
        withUser(12L, 1002L, () -> server.createCorrectionTodo(request, headers("spoofed-b", "spoofed-a", "user-b", null)));
        withUser(13L, 1003L, () -> server.createCorrectionTodo(request, headers("spoofed-a", "spoofed-b", "user-c", null)));

        Method method = server.getClass().getMethod("correctionTodos", HttpServletRequest.class);
        MockHttpServletRequest scopedRequest = headers("tenant-a", "workspace-a", "user-a", "diagnosis_operator");

        @SuppressWarnings("unchecked")
        List<TrustedAnswerCorrectionTodoVO> todos;
        try {
            AuthUtils.setUser(new TokenUserBO(1L, 1001L));
            todos = (List<TrustedAnswerCorrectionTodoVO>) method.invoke(server, scopedRequest);
        } finally {
            AuthUtils.remove();
        }

        assertEquals(1, todos.size());
        assertEquals("1001", todos.get(0).getTenantId());
        assertEquals("1001", todos.get(0).getWorkspaceId());
        assertEquals(Boolean.TRUE, todos.get(0).getRestrictedPayloadVisible());
    }

    private static void withUser(Long userId, Long oid, Runnable action) {
        try {
            AuthUtils.setUser(new TokenUserBO(userId, oid));
            action.run();
        } finally {
            AuthUtils.remove();
        }
    }

    private static Object service() throws Exception {
        Class<?> sensitiveClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerSensitivePayloadService");
        Object sensitiveService = sensitiveClass.getConstructor(String.class).newInstance("unit-test-secret");
        Class<?> serviceClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerCorrectionTodoService");
        Constructor<?> constructor = serviceClass.getConstructor(sensitiveClass);
        return constructor.newInstance(sensitiveService);
    }

    private static Object feedbackRequest(String diagnosisType, String questionText) throws Exception {
        Object request = requireClass("io.dataease.api.ai.query.request.TrustedAnswerCorrectionFeedbackRequest")
                .getConstructor()
                .newInstance();
        set(request, "setThemeId", "1001");
        set(request, "setResourceId", "11");
        set(request, "setDiagnosisType", diagnosisType);
        set(request, "setQuestionText", questionText);
        set(request, "setFeedbackText", "字段理解错");
        return request;
    }

    private static TrustedAnswerCorrectionFeedbackRequest typedFeedbackRequest(String diagnosisType, String questionText) {
        TrustedAnswerCorrectionFeedbackRequest request = new TrustedAnswerCorrectionFeedbackRequest();
        request.setThemeId("1001");
        request.setResourceId("11");
        request.setDiagnosisType(diagnosisType);
        request.setQuestionText(questionText);
        request.setFeedbackText("字段理解错");
        return request;
    }

    private static AIQueryTrustedAnswerServer server(TrustedAnswerCorrectionTodoService todoService) {
        return new AIQueryTrustedAnswerServer(
                null,
                null,
                null,
                null,
                null,
                todoService,
                null
        );
    }

    private static MockHttpServletRequest headers(String tenantId, String workspaceId, String userId, String role) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        if (tenantId != null) {
            request.addHeader("X-DE-Tenant-Id", tenantId);
        }
        if (workspaceId != null) {
            request.addHeader("X-DE-Workspace-Id", workspaceId);
        }
        if (userId != null) {
            request.addHeader("X-DE-User-Id", userId);
        }
        if (role != null) {
            request.addHeader("X-DE-Role", role);
        }
        return request;
    }

    private static Object create(Object service, Object request) throws Exception {
        Method method = service.getClass().getMethod(
                "create",
                String.class,
                String.class,
                String.class,
                request.getClass()
        );
        return method.invoke(service, "tenant-a", "workspace-a", "submitter", request);
    }

    private static List<?> listForRole(Object service, String role) throws Exception {
        Object value = invoke(service, "listForRole", new Class<?>[]{String.class}, role);
        assertInstanceOf(List.class, value);
        return (List<?>) value;
    }

    private static void set(Object target, String methodName, Object value) throws Exception {
        Method method = target.getClass().getMethod(methodName, String.class);
        method.invoke(target, value);
    }

    private static Object property(Object target, String getter) throws Exception {
        return invoke(target, getter, new Class<?>[0]);
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
            fail("Missing class required by correction todo tests: " + className);
            return null;
        }
    }

    private static Constructor<?> springConstructor(Class<?> type) {
        Constructor<?> found = null;
        for (Constructor<?> constructor : type.getConstructors()) {
            for (Annotation annotation : constructor.getAnnotations()) {
                if (annotation.annotationType() == Autowired.class) {
                    if (found != null) {
                        fail(type.getSimpleName() + " should have only one Spring constructor");
                    }
                    found = constructor;
                }
            }
        }
        if (found == null) {
            fail(type.getSimpleName() + " should have a Spring constructor");
        }
        return found;
    }
}
