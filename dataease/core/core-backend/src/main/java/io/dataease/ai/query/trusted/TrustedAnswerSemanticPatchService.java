package io.dataease.ai.query.trusted;

import io.dataease.api.ai.query.request.TrustedAnswerSemanticPatchRequest;
import io.dataease.api.ai.query.vo.TrustedAnswerSemanticPatchVO;
import io.dataease.utils.AuthUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class TrustedAnswerSemanticPatchService {

    private final Map<String, TrustedAnswerSemanticPatchVO> patches = new LinkedHashMap<>();

    public synchronized TrustedAnswerSemanticPatchVO apply(TrustedAnswerSemanticPatchRequest request) {
        validateRole(request);
        String operation = StringUtils.defaultIfBlank(request.getOperation(), "draft").toLowerCase();
        return switch (operation) {
            case "draft" -> draft(request);
            case "publish" -> transition(request, "PUBLISHED");
            case "disable" -> transition(request, "DISABLED");
            case "unpublish" -> transition(request, "UNPUBLISHED");
            case "rollback" -> rollback(request);
            default -> throw new IllegalArgumentException("unsupported semantic patch operation");
        };
    }

    private TrustedAnswerSemanticPatchVO draft(TrustedAnswerSemanticPatchRequest request) {
        TrustedAnswerSemanticPatchVO patch = new TrustedAnswerSemanticPatchVO();
        patch.setPatchId("patch-" + UUID.randomUUID());
        patch.setScope(request.getScope());
        patch.setTargetId(resolveTargetId(request));
        patch.setThemeId(request.getThemeId());
        patch.setResourceId(request.getResourceId());
        patch.setPatchType(request.getPatchType());
        patch.setStatus("DRAFT");
        patch.setSourceTodoId(request.getTodoId());
        patch.setContent(request.getContent());
        patch.setAuditEventNo(auditNo());
        patches.put(patch.getPatchId(), patch);
        return snapshot(patch);
    }

    private TrustedAnswerSemanticPatchVO transition(TrustedAnswerSemanticPatchRequest request, String status) {
        TrustedAnswerSemanticPatchVO patch = patches.get(request.getPatchId());
        if (patch == null) {
            throw new IllegalArgumentException("semantic patch not found");
        }
        patch.setStatus(status);
        patch.setAuditEventNo(auditNo());
        return snapshot(patch);
    }

    private TrustedAnswerSemanticPatchVO rollback(TrustedAnswerSemanticPatchRequest request) {
        TrustedAnswerSemanticPatchVO patch = patches.get(request.getPatchId());
        if (patch == null) {
            throw new IllegalArgumentException("semantic patch not found");
        }
        patch.setStatus("ROLLED_BACK");
        patch.setAuditEventNo(auditNo());
        patch.setRollbackToPatchId(request.getPreviousPatchId());
        return snapshot(patch);
    }

    private void validateRole(TrustedAnswerSemanticPatchRequest request) {
        String operation = StringUtils.defaultIfBlank(request.getOperation(), "draft").toLowerCase();
        String scope = StringUtils.defaultString(request.getScope());
        boolean sysAdmin = AuthUtils.isSysAdmin();
        if ("global".equals(scope) && !sysAdmin) {
            throw new IllegalArgumentException("global semantic patch requires elevated role");
        }
        if (("publish".equals(operation) || "disable".equals(operation) || "unpublish".equals(operation) || "rollback".equals(operation))
                && !sysAdmin) {
            throw new IllegalArgumentException("semantic patch publish operation requires publisher role");
        }
    }

    private String auditNo() {
        return "audit-" + UUID.randomUUID();
    }

    public synchronized List<TrustedAnswerSemanticPatchVO> activePatches(String scope) {
        return activePatches(scope, null, null);
    }

    public synchronized List<TrustedAnswerSemanticPatchVO> listAll() {
        return patches.values().stream()
                .map(this::snapshot)
                .toList();
    }

    public synchronized List<TrustedAnswerSemanticPatchVO> activePatches(String scope, String themeId, String resourceId) {
        String requestedScope = StringUtils.trimToEmpty(scope);
        String requestedThemeId = StringUtils.trimToEmpty(themeId);
        String requestedResourceId = StringUtils.trimToEmpty(resourceId);
        return patches.values().stream()
                .filter(Objects::nonNull)
                .filter(patch -> "PUBLISHED".equals(patch.getStatus()))
                .filter(patch -> StringUtils.equals("global", patch.getScope())
                        || matchesRequestedScope(patch, requestedScope, requestedThemeId, requestedResourceId))
                .map(this::snapshot)
                .toList();
    }

    private boolean matchesRequestedScope(
            TrustedAnswerSemanticPatchVO patch,
            String requestedScope,
            String requestedThemeId,
            String requestedResourceId
    ) {
        if (StringUtils.isBlank(requestedScope) || !StringUtils.equals(requestedScope, patch.getScope())) {
            return false;
        }
        if (StringUtils.equals("theme", requestedScope)) {
            return scopedIdMatches(patch.getTargetId(), requestedThemeId)
                    || scopedIdMatches(patch.getThemeId(), requestedThemeId);
        }
        if (StringUtils.equals("resource", requestedScope)) {
            return scopedIdMatches(patch.getTargetId(), requestedResourceId)
                    || scopedIdMatches(patch.getResourceId(), requestedResourceId);
        }
        return false;
    }

    private boolean scopedIdMatches(String patchId, String requestedId) {
        return StringUtils.isNoneBlank(patchId, requestedId) && StringUtils.equals(patchId, requestedId);
    }

    private String resolveTargetId(TrustedAnswerSemanticPatchRequest request) {
        String targetId = StringUtils.trimToEmpty(request.getTargetId());
        if (StringUtils.isNotBlank(targetId)) {
            return targetId;
        }
        if (StringUtils.equals("theme", StringUtils.trimToEmpty(request.getScope()))) {
            return StringUtils.trimToEmpty(request.getThemeId());
        }
        if (StringUtils.equals("resource", StringUtils.trimToEmpty(request.getScope()))) {
            return StringUtils.trimToEmpty(request.getResourceId());
        }
        return "";
    }

    private TrustedAnswerSemanticPatchVO snapshot(TrustedAnswerSemanticPatchVO source) {
        TrustedAnswerSemanticPatchVO snapshot = new TrustedAnswerSemanticPatchVO();
        snapshot.setPatchId(source.getPatchId());
        snapshot.setScope(source.getScope());
        snapshot.setTargetId(source.getTargetId());
        snapshot.setThemeId(source.getThemeId());
        snapshot.setResourceId(source.getResourceId());
        snapshot.setPatchType(source.getPatchType());
        snapshot.setStatus(source.getStatus());
        snapshot.setSourceTodoId(source.getSourceTodoId());
        snapshot.setAuditEventNo(source.getAuditEventNo());
        snapshot.setRollbackToPatchId(source.getRollbackToPatchId());
        snapshot.setContent(source.getContent());
        return snapshot;
    }
}
