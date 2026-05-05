package io.dataease.ai.query;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

class TrustedAnswerSensitivePayloadServiceTest {

    @Test
    void redactionShouldRemoveCommonBusinessSensitiveValues() throws Exception {
        Object service = service();

        String redacted = String.valueOf(invoke(
                service,
                "redact",
                new Class<?>[]{String.class},
                "客户张三 手机13812345678 邮箱a@b.com 订单ORD-20260504 金额12345.67 合同HT-9"
        ));

        assertFalse(redacted.contains("张三"));
        assertFalse(redacted.contains("13812345678"));
        assertFalse(redacted.contains("a@b.com"));
        assertFalse(redacted.contains("ORD-20260504"));
        assertFalse(redacted.contains("12345.67"));
        assertFalse(redacted.contains("HT-9"));
        assertTrue(redacted.contains("[姓名]"));
        assertTrue(redacted.contains("[手机号]"));
        assertTrue(redacted.contains("[邮箱]"));
    }

    @Test
    void fingerprintShouldBeTenantScopedAndStable() throws Exception {
        Object service = service();

        String left = fingerprint(service, "tenant-a");
        String same = fingerprint(service, "tenant-a");
        String otherTenant = fingerprint(service, "tenant-b");

        assertEquals(left, same);
        assertNotEquals(left, otherTenant);
        assertTrue(left.startsWith("sha256:"));
        assertFalse(left.contains("张三"));
    }

    @Test
    void retentionDefaultsShouldBeConcrete() throws Exception {
        Object service = service();

        assertEquals(180, invoke(service, "restrictedPayloadRetentionDays"));
        assertEquals(365, invoke(service, "todoSummaryRetentionDays"));
    }

    @Test
    void defaultConstructorShouldNotUseHardcodedSecretFallback() throws Exception {
        Class<?> serviceClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerSensitivePayloadService");
        Constructor<?> constructor = serviceClass.getConstructor(String.class);

        InvocationTargetException error = assertThrows(
                InvocationTargetException.class,
                () -> constructor.newInstance("")
        );

        assertTrue(error.getCause() instanceof IllegalArgumentException);
        assertTrue(error.getCause().getMessage().contains("secret is required"));
    }

    private static String fingerprint(Object service, String tenantId) throws Exception {
        return String.valueOf(invoke(
                service,
                "fingerprint",
                new Class<?>[]{
                        String.class,
                        String.class,
                        String.class,
                        String.class,
                        String.class,
                        String.class
                },
                tenantId,
                "workspace-a",
                "theme-1",
                "resource-1",
                "FIELD_AMBIGUOUS",
                "客户张三的销售额"
        ));
    }

    private static Object service() throws Exception {
        Class<?> serviceClass = requireClass("io.dataease.ai.query.trusted.TrustedAnswerSensitivePayloadService");
        Constructor<?> constructor = serviceClass.getConstructor(String.class);
        return constructor.newInstance("unit-test-secret");
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
            fail("Missing class required by sensitive payload tests: " + className);
            return null;
        }
    }
}
