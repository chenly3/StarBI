package io.dataease.ai.query;

import io.dataease.auth.bo.TokenUserBO;
import io.dataease.utils.AuthUtils;
import org.junit.jupiter.api.Test;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class TrustedAnswerSemanticPatchServiceTest {

    @Test
    void resourceOwnerCanDraftButCannotPublishGlobalPatch() throws Exception {
        Object service = service();
        Object draft = request("semantic_publisher", "resource", "FIELD_ALIAS", "draft");

        Object patch = apply(service, draft);

        assertEquals("DRAFT", property(patch, "getStatus"));
        RuntimeException error = assertThrows(RuntimeException.class, () ->
                applyUnchecked(service, requestUnchecked("semantic_publisher", "global", "BUSINESS_RULE", "publish"))
        );
        assertTrue(error.getMessage().contains("global") || error.getMessage().contains("role"));
    }

    @Test
    void sysAdminCanPublishDisableUnpublishAndRollback() throws Exception {
        Object service = service();
        Object draftPatch = apply(service, request("resource_owner", "theme", "TERM", "draft"));
        Object published;
        Object disabled;
        Object unpublished;
        Object rolledBack;
        try {
            AuthUtils.setUser(new TokenUserBO(1L, 1001L));
            Object publish = request("resource_owner", "theme", "TERM", "publish");
            set(publish, "setPatchId", property(draftPatch, "getPatchId"));
            published = apply(service, publish);

            Object disable = request("resource_owner", "theme", "TERM", "disable");
            set(disable, "setPatchId", property(published, "getPatchId"));
            disabled = apply(service, disable);

            Object unpublish = request("resource_owner", "theme", "TERM", "unpublish");
            set(unpublish, "setPatchId", property(published, "getPatchId"));
            unpublished = apply(service, unpublish);

            Object rollback = request("resource_owner", "theme", "TERM", "rollback");
            set(rollback, "setPatchId", property(published, "getPatchId"));
            set(rollback, "setPreviousPatchId", "patch-previous");
            rolledBack = apply(service, rollback);
        } finally {
            AuthUtils.remove();
        }

        assertEquals("PUBLISHED", property(published, "getStatus"));
        assertEquals("DISABLED", property(disabled, "getStatus"));
        assertEquals("UNPUBLISHED", property(unpublished, "getStatus"));
        assertEquals("ROLLED_BACK", property(rolledBack, "getStatus"));
        assertEquals("patch-previous", property(rolledBack, "getRollbackToPatchId"));
        assertTrue(String.valueOf(property(rolledBack, "getAuditEventNo")).startsWith("audit-"));
    }

    @Test
    void publishedPatchesShouldBeAvailableForRuntimeContextOnlyWhileActive() throws Exception {
        Object service = service();
        Object draftPatch = apply(service, request("resource_owner", "theme", "TERM", "draft"));
        Object published;
        try {
            AuthUtils.setUser(new TokenUserBO(1L, 1001L));
            Object publish = request("resource_owner", "theme", "TERM", "publish");
            set(publish, "setPatchId", property(draftPatch, "getPatchId"));
            published = apply(service, publish);
        } finally {
            AuthUtils.remove();
        }

        Object active = invoke(
                service,
                "activePatches",
                new Class<?>[]{String.class, String.class, String.class},
                "theme",
                "1001",
                null
        );

        assertTrue(active instanceof List<?>);
        assertEquals(1, ((List<?>) active).size());
        assertEquals(property(published, "getPatchId"), property(((List<?>) active).get(0), "getPatchId"));
        assertEquals("销售额 = 成交金额", property(((List<?>) active).get(0), "getContent"));
    }

    @Test
    void themeScopedPatchShouldNotLeakToOtherThemes() throws Exception {
        Object service = service();
        Object draftPatch = apply(service, request("resource_owner", "theme", "TERM", "draft"));
        try {
            AuthUtils.setUser(new TokenUserBO(1L, 1001L));
            Object publish = request("resource_owner", "theme", "TERM", "publish");
            set(publish, "setPatchId", property(draftPatch, "getPatchId"));
            apply(service, publish);
        } finally {
            AuthUtils.remove();
        }

        Object currentTheme = invoke(
                service,
                "activePatches",
                new Class<?>[]{String.class, String.class, String.class},
                "theme",
                "1001",
                null
        );
        Object otherTheme = invoke(
                service,
                "activePatches",
                new Class<?>[]{String.class, String.class, String.class},
                "theme",
                "2002",
                null
        );

        assertEquals(1, ((List<?>) currentTheme).size());
        assertEquals(0, ((List<?>) otherTheme).size());
    }

    private static Object service() throws Exception {
        return requireClass("io.dataease.ai.query.trusted.TrustedAnswerSemanticPatchService")
                .getConstructor()
                .newInstance();
    }

    private static Object request(String role, String scope, String patchType, String operation) throws Exception {
        Object request = requireClass("io.dataease.api.ai.query.request.TrustedAnswerSemanticPatchRequest")
                .getConstructor()
                .newInstance();
        set(request, "setActorRole", role);
        set(request, "setScope", scope);
        set(request, "setThemeId", "1001");
        set(request, "setTargetId", "1001");
        set(request, "setPatchType", patchType);
        set(request, "setOperation", operation);
        set(request, "setTodoId", "todo-1");
        set(request, "setContent", "销售额 = 成交金额");
        return request;
    }

    private static Object requestUnchecked(String role, String scope, String patchType, String operation) {
        try {
            return request(role, scope, patchType, operation);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static Object apply(Object service, Object request) throws Exception {
        Method method = service.getClass().getMethod("apply", request.getClass());
        return method.invoke(service, request);
    }

    private static void applyUnchecked(Object service, Object request) {
        try {
            apply(service, request);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause();
            if (cause instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new RuntimeException(cause);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private static void set(Object target, String methodName, Object value) throws Exception {
        Method method = target.getClass().getMethod(methodName, String.class);
        method.invoke(target, value);
    }

    private static Object property(Object target, String getter) throws Exception {
        Method method = target.getClass().getMethod(getter);
        return method.invoke(target);
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
            fail("Missing class required by semantic patch tests: " + className);
            return null;
        }
    }
}
