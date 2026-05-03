package io.dataease.ai.query;

import io.dataease.ai.query.manage.AIQueryThemeManage;
import io.dataease.ai.query.trusted.TrustedAnswerRuntimeContextService;
import io.dataease.ai.query.trusted.TrustedAnswerTraceStore;
import io.dataease.api.ai.query.request.TrustedAnswerRequest;
import io.dataease.api.ai.query.vo.AIQueryThemeVO;
import io.dataease.api.ai.query.vo.TrustedAnswerContextVO;
import io.dataease.api.ai.query.vo.TrustedAnswerState;
import io.dataease.api.ai.query.vo.TrustedAnswerTraceVO;
import io.dataease.api.dataset.vo.DataSQLBotAssistantVO;
import io.dataease.api.dataset.vo.SQLBotAssistanTable;
import io.dataease.api.dataset.vo.SQLBotAssistantField;
import io.dataease.dataset.manage.DatasetSQLBotManage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrustedAnswerRuntimeContextServiceTest {

    @Mock
    private AIQueryThemeManage aiQueryThemeManage;

    @Mock
    private DatasetSQLBotManage datasetSQLBotManage;

    private TrustedAnswerTraceStore traceStore;
    private TrustedAnswerRuntimeContextService service;

    @BeforeEach
    void setUp() {
        traceStore = new TrustedAnswerTraceStore();
        service = new TrustedAnswerRuntimeContextService(aiQueryThemeManage, datasetSQLBotManage, traceStore);
    }

    @Test
    void missingThemeShouldAskForClarificationBeforeSchemaLookup() {
        TrustedAnswerRequest request = new TrustedAnswerRequest();
        request.setQuestion("本月销售额");

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.NEEDS_CLARIFICATION, trace.getState());
        assertEquals("THEME_REQUIRED", trace.getError().getCode());
        assertEquals("validate-theme", trace.getError().getTraceStep());
        assertTrue(trace.getTraceId().startsWith("ta-"));
    }

    @Test
    void disabledThemeShouldNotReachSqlBotSchema() {
        TrustedAnswerRequest request = request(1001L, null);
        AIQueryThemeVO theme = theme(false, List.of(11L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.NO_AUTHORIZED_CONTEXT, trace.getState());
        assertEquals("THEME_NOT_VISIBLE", trace.getError().getCode());
        assertEquals(1001L, trace.getContext().getThemeId());
    }

    @Test
    void noAuthorizedDatasetsShouldNotBuildSchema() {
        TrustedAnswerRequest request = request(1001L, null);
        AIQueryThemeVO theme = theme(true, List.of(), List.of());
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.NO_AUTHORIZED_CONTEXT, trace.getState());
        assertEquals("NO_AUTHORIZED_DATASET", trace.getError().getCode());
        assertEquals(0, trace.getContext().getDatasetIds().size());
    }

    @Test
    void multipleDatasourcesWithoutSelectionShouldNeedClarification() {
        TrustedAnswerRequest request = request(1001L, null);
        AIQueryThemeVO theme = theme(true, List.of(11L, 12L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);
        when(datasetSQLBotManage.getDatasourceList(null, null, "11,12"))
                .thenReturn(List.of(datasource(21L, 11L, "amount"), datasource(22L, 12L, "gmv")));

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.NEEDS_CLARIFICATION, trace.getState());
        assertEquals("MULTI_DATASOURCE_AMBIGUOUS", trace.getError().getCode());
        assertEquals(List.of(21L, 22L), trace.getContext().getDatasourceIds());
        assertEquals(2, trace.getContext().getVisibleFieldCount());
    }

    @Test
    void selectedDatasourceShouldBuildTrustedContextWithOnlyAuthorizedDatasets() {
        TrustedAnswerRequest request = request(1001L, 21L);
        AIQueryThemeVO theme = theme(true, List.of(11L, 12L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);
        when(datasetSQLBotManage.getDatasourceList(21L, null, "11,12"))
                .thenReturn(List.of(datasource(21L, 11L, "amount")));

        TrustedAnswerTraceVO trace = service.buildTrace(request);
        TrustedAnswerContextVO context = trace.getContext();

        assertEquals(TrustedAnswerState.TRUSTED, trace.getState());
        assertEquals(1001L, context.getThemeId());
        assertEquals(21L, context.getDatasourceId());
        assertEquals(List.of(11L, 12L), context.getDatasetIds());
        assertEquals(List.of(11L), context.getDefaultDatasetIds());
        assertEquals(List.of(21L), context.getDatasourceIds());
        assertEquals(1, context.getVisibleFieldCount());
        assertEquals(1, context.getSchemaTableCount());
        assertNotNull(traceStore.get(trace.getTraceId()));
    }

    @Test
    void schemaFallbackTablesOutsideAuthorizedDatasetsShouldBeFilteredBeforeCounting() {
        TrustedAnswerRequest request = request(1001L, 21L);
        AIQueryThemeVO theme = theme(true, List.of(11L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);
        when(datasetSQLBotManage.getDatasourceList(21L, null, "11"))
                .thenReturn(List.of(datasource(21L,
                        table(11L, "amount"),
                        table(99L, "leaked_amount"))));

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.TRUSTED, trace.getState());
        assertEquals(1, trace.getContext().getSchemaTableCount());
        assertEquals(1, trace.getContext().getVisibleFieldCount());
    }

    @Test
    void schemaFallbackWithOnlyUnauthorizedTablesShouldFailClosed() {
        TrustedAnswerRequest request = request(1001L, 21L);
        AIQueryThemeVO theme = theme(true, List.of(11L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);
        when(datasetSQLBotManage.getDatasourceList(21L, null, "11"))
                .thenReturn(List.of(datasource(21L, table(99L, "leaked_amount"))));

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.UNSAFE_BLOCKED, trace.getState());
        assertEquals("NO_VISIBLE_FIELD", trace.getError().getCode());
        assertEquals(0, trace.getContext().getVisibleFieldCount());
        assertEquals(0, trace.getContext().getSchemaTableCount());
    }

    @Test
    void schemaWithNoVisibleFieldsShouldBeBlocked() {
        TrustedAnswerRequest request = request(1001L, 21L);
        AIQueryThemeVO theme = theme(true, List.of(11L), List.of(11L));
        when(aiQueryThemeManage.getTheme(1001L)).thenReturn(theme);
        when(datasetSQLBotManage.getDatasourceList(21L, null, "11"))
                .thenReturn(List.of(datasourceWithoutFields(21L, 11L)));

        TrustedAnswerTraceVO trace = service.buildTrace(request);

        assertEquals(TrustedAnswerState.UNSAFE_BLOCKED, trace.getState());
        assertEquals("NO_VISIBLE_FIELD", trace.getError().getCode());
        assertEquals(0, trace.getContext().getVisibleFieldCount());
        assertNotNull(traceStore.get(trace.getTraceId()));
    }

    private static TrustedAnswerRequest request(Long themeId, Long datasourceId) {
        TrustedAnswerRequest request = new TrustedAnswerRequest();
        request.setQuestion("本月销售额");
        request.setThemeId(themeId);
        request.setDatasourceId(datasourceId);
        return request;
    }

    private static AIQueryThemeVO theme(boolean enabled, List<Long> datasetIds, List<Long> defaultDatasetIds) {
        AIQueryThemeVO theme = new AIQueryThemeVO();
        theme.setId(1001L);
        theme.setName("销售分析");
        theme.setStatus(enabled);
        theme.setDatasetIds(datasetIds);
        theme.setDefaultDatasetIds(defaultDatasetIds);
        return theme;
    }

    private static DataSQLBotAssistantVO datasource(Long datasourceId, Long datasetGroupId, String fieldName) {
        SQLBotAssistantField field = new SQLBotAssistantField();
        field.setName(fieldName);
        field.setComment(fieldName);
        field.setType("NUMBER");

        SQLBotAssistanTable table = new SQLBotAssistanTable();
        table.setName("sales_table");
        table.setComment("sales_table");
        table.setDatasetGroupId(datasetGroupId);
        table.setFields(List.of(field));

        DataSQLBotAssistantVO datasource = new DataSQLBotAssistantVO();
        datasource.setId(datasourceId);
        datasource.setName("ds-" + datasourceId);
        datasource.setTables(List.of(table));
        return datasource;
    }

    private static DataSQLBotAssistantVO datasource(Long datasourceId, SQLBotAssistanTable... tables) {
        DataSQLBotAssistantVO datasource = new DataSQLBotAssistantVO();
        datasource.setId(datasourceId);
        datasource.setName("ds-" + datasourceId);
        datasource.setTables(List.of(tables));
        return datasource;
    }

    private static SQLBotAssistanTable table(Long datasetGroupId, String fieldName) {
        SQLBotAssistantField field = new SQLBotAssistantField();
        field.setName(fieldName);
        field.setComment(fieldName);
        field.setType("NUMBER");

        SQLBotAssistanTable table = new SQLBotAssistanTable();
        table.setName("sales_table");
        table.setComment("sales_table");
        table.setDatasetGroupId(datasetGroupId);
        table.setFields(List.of(field));
        return table;
    }

    private static DataSQLBotAssistantVO datasourceWithoutFields(Long datasourceId, Long datasetGroupId) {
        SQLBotAssistanTable table = new SQLBotAssistanTable();
        table.setName("sales_table");
        table.setComment("sales_table");
        table.setDatasetGroupId(datasetGroupId);
        table.setFields(List.of());

        DataSQLBotAssistantVO datasource = new DataSQLBotAssistantVO();
        datasource.setId(datasourceId);
        datasource.setName("ds-" + datasourceId);
        datasource.setTables(List.of(table));
        return datasource;
    }
}
