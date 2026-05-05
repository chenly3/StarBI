package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.request.TrustedAnswerCorrectionFeedbackRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerCorrectionTodoVO;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TrustedAnswerCorrectionTodoService {

    private final TrustedAnswerSensitivePayloadService sensitivePayloadService;
    private final Map<String, TrustedAnswerCorrectionTodoVO> todosByFingerprint = new LinkedHashMap<>();

    public TrustedAnswerCorrectionTodoService(TrustedAnswerSensitivePayloadService sensitivePayloadService) {
        if (sensitivePayloadService == null) {
            throw new IllegalArgumentException("trusted answer sensitive payload service is required");
        }
        this.sensitivePayloadService = sensitivePayloadService;
    }

    public synchronized TrustedAnswerCorrectionTodoVO create(
            String tenantId,
            String workspaceId,
            String submitter,
            TrustedAnswerCorrectionFeedbackRequest request
    ) {
        String fingerprint = sensitivePayloadService.fingerprint(
                tenantId,
                workspaceId,
                request.getThemeId(),
                request.getResourceId(),
                request.getDiagnosisType(),
                request.getQuestionText()
        );
        TrustedAnswerCorrectionTodoVO existing = todosByFingerprint.get(fingerprint);
        if (existing != null) {
            existing.setImpactCount(existing.getImpactCount() + 1);
            return existing;
        }

        TrustedAnswerCorrectionTodoVO todo = new TrustedAnswerCorrectionTodoVO();
        todo.setTodoId("todo-" + UUID.randomUUID());
        todo.setTenantId(tenantId);
        todo.setWorkspaceId(workspaceId);
        todo.setThemeId(request.getThemeId());
        todo.setResourceId(request.getResourceId());
        todo.setDiagnosisType(StringUtils.defaultIfBlank(request.getDiagnosisType(), "USER_FEEDBACK"));
        todo.setSanitizedQuestionSummary(sensitivePayloadService.redact(request.getQuestionText()));
        todo.setDuplicateFingerprint(fingerprint);
        todo.setStatus("PENDING");
        todo.setSeverity("P1");
        todo.setImpactCount(1);
        todo.setRestrictedPayloadVisible(false);
        todosByFingerprint.put(fingerprint, todo);
        return todo;
    }

    public synchronized List<TrustedAnswerCorrectionTodoVO> listForRole(String role) {
        boolean diagnosis = "diagnosis_operator".equals(role);
        return todosByFingerprint.values().stream()
                .map(item -> copyForVisibility(item, diagnosis))
                .toList();
    }

    public synchronized List<TrustedAnswerCorrectionTodoVO> listForScope(
            String role,
            String tenantId,
            String workspaceId
    ) {
        boolean diagnosis = "diagnosis_operator".equals(role);
        return todosByFingerprint.values().stream()
                .filter(item -> StringUtils.equals(item.getTenantId(), tenantId))
                .filter(item -> StringUtils.equals(item.getWorkspaceId(), workspaceId))
                .map(item -> copyForVisibility(item, diagnosis))
                .toList();
    }

    private TrustedAnswerCorrectionTodoVO copyForVisibility(TrustedAnswerCorrectionTodoVO source, boolean restrictedVisible) {
        TrustedAnswerCorrectionTodoVO copy = new TrustedAnswerCorrectionTodoVO();
        copy.setTodoId(source.getTodoId());
        copy.setTenantId(source.getTenantId());
        copy.setWorkspaceId(source.getWorkspaceId());
        copy.setThemeId(source.getThemeId());
        copy.setResourceId(source.getResourceId());
        copy.setDiagnosisType(source.getDiagnosisType());
        copy.setSanitizedQuestionSummary(source.getSanitizedQuestionSummary());
        copy.setDuplicateFingerprint(source.getDuplicateFingerprint());
        copy.setStatus(source.getStatus());
        copy.setSeverity(source.getSeverity());
        copy.setImpactCount(source.getImpactCount());
        copy.setRestrictedPayloadVisible(restrictedVisible);
        copy.setLinkedKnowledgeId(source.getLinkedKnowledgeId());
        copy.setLinkedRelearningJobId(source.getLinkedRelearningJobId());
        return copy;
    }
}
