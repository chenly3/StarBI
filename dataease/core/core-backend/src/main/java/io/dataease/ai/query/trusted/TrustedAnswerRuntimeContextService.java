package io.dataease.ai.query.trusted;

import io.dataease.ai.query.manage.AIQueryThemeManage;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.AIQueryThemeVO;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerErrorCode;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.dataset.vo.DataSQLBotAssistantVO;
import io.dataease.api.dataset.vo.SQLBotAssistanTable;
import io.dataease.dataset.manage.DatasetSQLBotManage;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class TrustedAnswerRuntimeContextService {

    private final AIQueryThemeManage aiQueryThemeManage;
    private final DatasetSQLBotManage datasetSQLBotManage;
    private final TrustedAnswerTraceStore traceStore;

    public TrustedAnswerRuntimeContextService(
            AIQueryThemeManage aiQueryThemeManage,
            DatasetSQLBotManage datasetSQLBotManage,
            TrustedAnswerTraceStore traceStore
    ) {
        this.aiQueryThemeManage = aiQueryThemeManage;
        this.datasetSQLBotManage = datasetSQLBotManage;
        this.traceStore = traceStore;
    }

    public TrustedAnswerTraceVO buildTrace(TrustedAnswerRequest request) {
        TrustedAnswerTraceVO trace = new TrustedAnswerTraceVO();
        trace.setTraceId("ta-" + UUID.randomUUID());
        trace.setState(TrustedAnswerState.FAILED);
        TrustedAnswerContextVO context = new TrustedAnswerContextVO();
        trace.setContext(context);

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

        List<DataSQLBotAssistantVO> schema = datasetSQLBotManage.getDatasourceList(
                request.getDatasourceId(),
                null,
                datasetIds.stream().map(String::valueOf).collect(Collectors.joining(","))
        );
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

        if (request.getDatasourceId() == null && datasourceIds.size() > 1) {
            return completeWithError(trace, TrustedAnswerErrorCode.MULTI_DATASOURCE_AMBIGUOUS);
        }
        if (request.getDatasourceId() == null && datasourceIds.size() == 1) {
            context.setDatasourceId(datasourceIds.get(0));
        }

        trace.setState(TrustedAnswerState.TRUSTED);
        traceStore.put(trace);
        return trace;
    }

    private TrustedAnswerTraceVO completeWithError(TrustedAnswerTraceVO trace, TrustedAnswerErrorCode errorCode) {
        var error = errorCode.toError();
        trace.setState(error.getState());
        trace.setError(error);
        traceStore.put(trace);
        return trace;
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
}
