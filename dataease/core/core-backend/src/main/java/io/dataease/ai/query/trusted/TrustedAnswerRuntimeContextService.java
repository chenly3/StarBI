package io.dataease.ai.query.trusted;

import io.dataease.ai.query.manage.AIQueryThemeManage;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.AIQueryLearningResourceVO;
import io.dataease.api.ai.query.vo.AIQueryThemeVO;
import io.dataease.api.ai.query.vo.AuthorizedAskabilityState;
import io.dataease.api.ai.query.vo.ResourceReadinessState;
import io.dataease.api.ai.query.vo.TrustedAnswerActionType;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerSemanticPatchVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.dataset.vo.DataSQLBotAssistantVO;
import io.dataease.api.dataset.vo.SQLBotAssistanTable;
import io.dataease.auth.bo.TokenUserBO;
import io.dataease.dataset.manage.DatasetSQLBotManage;
import io.dataease.substitute.permissions.dataset.SubstituteDatasetExampleStore;
import io.dataease.utils.AuthUtils;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class TrustedAnswerRuntimeContextService {

    private final AIQueryThemeManage aiQueryThemeManage;
    private final DatasetSQLBotManage datasetSQLBotManage;
    private final TrustedAnswerTraceStore traceStore;
    private final SubstituteDatasetExampleStore substituteDatasetExampleStore;
    private final TrustedAnswerRuntimePolicyService runtimePolicyService;
    private final TrustedAnswerActionContractService actionContractService;
    private final TrustedAnswerConversationContextService conversationContextService;
    private final TrustedAnswerFactBoundaryService factBoundaryService;
    private final TrustedAnswerResourceReadinessService resourceReadinessService;
    private final TrustedAnswerSemanticPatchService semanticPatchService;

    public TrustedAnswerRuntimeContextService(
            AIQueryThemeManage aiQueryThemeManage,
            DatasetSQLBotManage datasetSQLBotManage,
            TrustedAnswerTraceStore traceStore,
            SubstituteDatasetExampleStore substituteDatasetExampleStore
    ) {
        this(
                aiQueryThemeManage,
                datasetSQLBotManage,
                traceStore,
                substituteDatasetExampleStore,
                new TrustedAnswerRuntimePolicyService((java.util.function.Function<String, String>) key -> null),
                new TrustedAnswerActionContractService(),
                new TrustedAnswerConversationContextService(),
                new TrustedAnswerFactBoundaryService(),
                new TrustedAnswerResourceReadinessService(),
                new TrustedAnswerSemanticPatchService()
        );
    }

    @Autowired
    public TrustedAnswerRuntimeContextService(
            AIQueryThemeManage aiQueryThemeManage,
            DatasetSQLBotManage datasetSQLBotManage,
            TrustedAnswerTraceStore traceStore,
            SubstituteDatasetExampleStore substituteDatasetExampleStore,
            TrustedAnswerRuntimePolicyService runtimePolicyService,
            TrustedAnswerActionContractService actionContractService,
            TrustedAnswerConversationContextService conversationContextService,
            TrustedAnswerFactBoundaryService factBoundaryService,
            TrustedAnswerResourceReadinessService resourceReadinessService,
            TrustedAnswerSemanticPatchService semanticPatchService
    ) {
        this.aiQueryThemeManage = aiQueryThemeManage;
        this.datasetSQLBotManage = datasetSQLBotManage;
        this.traceStore = traceStore;
        this.substituteDatasetExampleStore = substituteDatasetExampleStore;
        this.runtimePolicyService = runtimePolicyService;
        this.actionContractService = actionContractService;
        this.conversationContextService = conversationContextService;
        this.factBoundaryService = factBoundaryService;
        this.resourceReadinessService = resourceReadinessService;
        this.semanticPatchService = semanticPatchService == null
                ? new TrustedAnswerSemanticPatchService()
                : semanticPatchService;
    }

    public TrustedAnswerRuntimeContextService(
            AIQueryThemeManage aiQueryThemeManage,
            DatasetSQLBotManage datasetSQLBotManage,
            TrustedAnswerTraceStore traceStore,
            SubstituteDatasetExampleStore substituteDatasetExampleStore,
            TrustedAnswerRuntimePolicyService runtimePolicyService,
            TrustedAnswerActionContractService actionContractService,
            TrustedAnswerConversationContextService conversationContextService,
            TrustedAnswerFactBoundaryService factBoundaryService,
            TrustedAnswerResourceReadinessService resourceReadinessService
    ) {
        this(
                aiQueryThemeManage,
                datasetSQLBotManage,
                traceStore,
                substituteDatasetExampleStore,
                runtimePolicyService,
                actionContractService,
                conversationContextService,
                factBoundaryService,
                resourceReadinessService,
                new TrustedAnswerSemanticPatchService()
        );
    }

    public TrustedAnswerTraceVO buildTrace(TrustedAnswerRequest request) {
        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId("ta-" + UUID.randomUUID());
        trace.setState(TrustedAnswerState.FAILED);
        attachCurrentOwner(trace);
        TrustedAnswerContextVO context = new TrustedAnswerContextVO();
        trace.setContext(context);

        var policy = runtimePolicyService.load();
        context.setRuntimePolicy(policy);
        TrustedAnswerActionType actionType = request == null || request.getActionType() == null
                ? TrustedAnswerActionType.BASIC_ASK
                : request.getActionType();
        context.setActionType(actionType);
        if (request != null) {
            context.setEntryScene(request.getEntryScene());
            context.setResourceKind(request.getResourceKind());
            context.setResourceId(request.getResourceId());
            context.setChatId(request.getChatId());
            trace.setSourceTraceId(request.getSourceTraceId());
            trace.setParentTraceId(request.getParentTraceId());
        }
        var disabledError = actionContractService.disabledError(actionType, policy);
        if (disabledError.isPresent()) {
            context.setAskabilityState(AuthorizedAskabilityState.ASK_BLOCKED);
            trace.setBlockedReason(disabledError.get().name());
            trace.getPermissionSteps().add("runtime-switch-blocked");
            return completeWithError(trace, disabledError.get());
        }

        if (request == null || StringUtils.isBlank(request.getQuestion()) || request.getThemeId() == null) {
            return completeWithError(trace, TrustedAnswerErrorCode.THEME_REQUIRED);
        }

        context.setThemeId(request.getThemeId());
        context.setDatasourceId(request.getDatasourceId());

        AIQueryThemeVO theme;
        try {
            theme = aiQueryThemeManage.getTheme(request.getThemeId());
        } catch (Exception e) {
            return completeWithError(trace, TrustedAnswerErrorCode.THEME_NOT_VISIBLE);
        }
        if (theme == null || !Boolean.TRUE.equals(theme.getStatus())) {
            if (theme != null) {
                context.setThemeId(theme.getId());
                context.setThemeName(theme.getName());
            }
            return completeWithError(trace, TrustedAnswerErrorCode.THEME_NOT_VISIBLE);
        }

        context.setThemeId(theme.getId());
        context.setThemeName(theme.getName());
        List<Long> datasetIds = distinctIds(theme.getDatasetIds());
        List<Long> defaultDatasetIds = distinctIds(theme.getDefaultDatasetIds()).stream()
                .filter(datasetIds::contains)
                .collect(Collectors.toList());
        context.setDatasetIds(datasetIds);
        context.setDefaultDatasetIds(defaultDatasetIds);
        trace.getPermissionSteps().add("authorized-datasets-filtered");

        if (datasetIds.isEmpty()) {
            return completeWithError(trace, TrustedAnswerErrorCode.NO_AUTHORIZED_DATASET);
        }

        String datasetIdCsv = datasetIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        List<DataSQLBotAssistantVO> schema = loadSchema(request.getDatasourceId(), datasetIds, datasetIdCsv);
        if (CollectionUtils.isEmpty(schema)) {
            return completeWithError(trace, TrustedAnswerErrorCode.NO_VISIBLE_FIELD);
        }
        schema = filterAuthorizedSchema(schema, datasetIds);
        if (CollectionUtils.isEmpty(schema)) {
            return completeWithError(trace, TrustedAnswerErrorCode.NO_VISIBLE_FIELD);
        }

        List<Long> datasourceIds = schema.stream()
                .map(DataSQLBotAssistantVO::getId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        context.setDatasourceIds(datasourceIds);
        context.setSchemaTableCount(schema.stream()
                .map(DataSQLBotAssistantVO::getTables)
                .filter(Objects::nonNull)
                .mapToInt(List::size)
                .sum());
        context.setVisibleFieldCount(schema.stream()
                .map(DataSQLBotAssistantVO::getTables)
                .filter(Objects::nonNull)
                .flatMap(List::stream)
                .map(SQLBotAssistanTable::getFields)
                .filter(Objects::nonNull)
                .mapToInt(List::size)
                .sum());
        if (context.getVisibleFieldCount() <= 0) {
            return completeWithError(trace, TrustedAnswerErrorCode.NO_VISIBLE_FIELD);
        }
        trace.getPermissionSteps().add("visible-schema-built");
        applySemanticPatchContext(context);

        if (request.getDatasourceId() == null && datasourceIds.size() > 1) {
            return completeWithError(trace, TrustedAnswerErrorCode.MULTI_DATASOURCE_AMBIGUOUS);
        }
        if (request.getDatasourceId() == null && datasourceIds.size() == 1) {
            context.setDatasourceId(datasourceIds.get(0));
        }

        TrustedAnswerResourceReadinessService.Evaluation readiness = evaluateReadiness(context, datasetIds);
        context.setReadinessState(readiness.state());
        if (readiness.state() == ResourceReadinessState.NOT_ASKABLE) {
            context.setAskabilityState(AuthorizedAskabilityState.ASK_BLOCKED);
            trace.getPermissionSteps().add("resource-readiness-evaluated:" + readiness.reason());
            return completeWithError(trace, TrustedAnswerErrorCode.RESOURCE_NOT_ASKABLE);
        }
        context.setAskabilityState(readiness.state() == ResourceReadinessState.NEEDS_OPTIMIZATION
                ? AuthorizedAskabilityState.ASK_PARTIAL
                : AuthorizedAskabilityState.ASK_ALLOWED);
        trace.getPermissionSteps().add("resource-readiness-evaluated:" + readiness.reason());
        trace.setUserSafeEvidenceSummary("基于" + context.getThemeName() + "，已按当前权限裁剪资源、字段和行权限。");
        trace.setState(TrustedAnswerState.TRUSTED);
        traceStore.put(trace);
        return trace;
    }

    private TrustedAnswerResourceReadinessService.Evaluation evaluateReadiness(
            TrustedAnswerContextVO context,
            List<Long> datasetIds
    ) {
        AIQueryLearningResourceVO resource = resolveLearningResource(context, datasetIds);
        if (resource != null && (resource.getFieldCount() == null || resource.getFieldCount() <= 0)) {
            resource.setFieldCount(context.getVisibleFieldCount());
        }
        return resourceReadinessService.evaluate(resource);
    }

    private void applySemanticPatchContext(TrustedAnswerContextVO context) {
        if (semanticPatchService == null || context == null) {
            return;
        }
        String themeId = context.getThemeId() == null ? "" : String.valueOf(context.getThemeId());
        List<TrustedAnswerSemanticPatchVO> patches = semanticPatchService.activePatches(
                "theme",
                themeId,
                context.getResourceId()
        );
        context.setActiveSemanticPatchCount(patches.size());
        context.setActiveSemanticPatchSummary(patches.stream()
                .map(this::patchSummary)
                .filter(StringUtils::isNotBlank)
                .limit(20)
                .toList());
        Map<String, String> patchContext = new LinkedHashMap<>();
        for (TrustedAnswerSemanticPatchVO patch : patches) {
            String patchId = patch.getPatchId();
            if (StringUtils.isNotBlank(patchId)) {
                patchContext.put(patchId, StringUtils.defaultString(patch.getContent()));
            }
        }
        context.setSemanticPatchContext(patchContext);
    }

    private String patchSummary(TrustedAnswerSemanticPatchVO patch) {
        if (patch == null) {
            return "";
        }
        return StringUtils.defaultString(patch.getPatchType(), "SEMANTIC_PATCH")
                + ":"
                + StringUtils.abbreviate(StringUtils.defaultString(patch.getContent()), 80);
    }

    private AIQueryLearningResourceVO resolveLearningResource(
            TrustedAnswerContextVO context,
            List<Long> datasetIds
    ) {
        List<String> candidates = new java.util.ArrayList<>();
        if (StringUtils.isNotBlank(context.getResourceId())) {
            candidates.add(context.getResourceId());
        }
        datasetIds.stream().map(String::valueOf).forEach(candidates::add);
        if (candidates.isEmpty()) {
            return null;
        }
        try {
            return aiQueryThemeManage.listQueryLearningResources().stream()
                    .filter(Objects::nonNull)
                    .filter(resource -> candidates.contains(resource.getResourceId()))
                    .findFirst()
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private TrustedAnswerTraceVO completeWithError(TrustedAnswerTraceVO trace, TrustedAnswerErrorCode errorCode) {
        var error = errorCode.toError();
        trace.setState(error.getState());
        trace.setError(error);
        traceStore.put(trace);
        return trace;
    }

    private void attachCurrentOwner(TrustedAnswerTraceVO trace) {
        TokenUserBO user = AuthUtils.getUser();
        if (user == null) {
            return;
        }
        if (user.getUserId() != null) {
            trace.setOwnerUserId(String.valueOf(user.getUserId()));
        }
        if (user.getDefaultOid() != null) {
            String orgId = String.valueOf(user.getDefaultOid());
            trace.setOwnerOrgId(orgId);
            trace.setOwnerWorkspaceId(orgId);
        }
    }

    private static List<DataSQLBotAssistantVO> filterAuthorizedSchema(List<DataSQLBotAssistantVO> schema, List<Long> datasetIds) {
        Set<Long> authorizedDatasetIds = new HashSet<>(datasetIds);
        return schema.stream()
                .filter(Objects::nonNull)
                .peek(datasource -> datasource.setTables(filterAuthorizedTables(datasource.getTables(), authorizedDatasetIds)))
                .filter(datasource -> CollectionUtils.isNotEmpty(datasource.getTables()))
                .collect(Collectors.toList());
    }

    private static List<SQLBotAssistanTable> filterAuthorizedTables(List<SQLBotAssistanTable> tables, Set<Long> authorizedDatasetIds) {
        if (CollectionUtils.isEmpty(tables)) {
            return Collections.emptyList();
        }
        return tables.stream()
                .filter(Objects::nonNull)
                .filter(table -> authorizedDatasetIds.contains(table.getDatasetGroupId()))
                .collect(Collectors.toList());
    }

    private static List<Long> distinctIds(List<Long> ids) {
        if (CollectionUtils.isEmpty(ids)) {
            return Collections.emptyList();
        }
        return ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
    }

    private List<DataSQLBotAssistantVO> loadSchema(Long datasourceId, List<Long> datasetIds, String datasetIdCsv) {
        if (Objects.equals(datasourceId, SubstituteDatasetExampleStore.DATASET_ID)
                && CollectionUtils.isNotEmpty(datasetIds)
                && datasetIds.stream().allMatch(id -> Objects.equals(id, SubstituteDatasetExampleStore.DATASET_ID))) {
            return substituteDatasetExampleStore == null
                    ? datasetSQLBotManage.getDatasourceList(null, null, datasetIdCsv)
                    : substituteDatasetExampleStore.sqlBotDatasource();
        }
        return datasetSQLBotManage.getDatasourceList(datasourceId, null, datasetIdCsv);
    }
}
