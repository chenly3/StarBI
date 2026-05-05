package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
public class TrustedAnswerContextVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 825221748116762453L;

    @JsonProperty("theme_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long themeId;

    @JsonProperty("theme_name")
    private String themeName;

    @JsonProperty("datasource_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long datasourceId;

    @JsonProperty("dataset_ids")
    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> datasetIds = new ArrayList<>();

    @JsonProperty("default_dataset_ids")
    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> defaultDatasetIds = new ArrayList<>();

    @JsonProperty("datasource_ids")
    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> datasourceIds = new ArrayList<>();

    @JsonProperty("excluded_dataset_ids")
    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> excludedDatasetIds = new ArrayList<>();

    @JsonProperty("visible_field_count")
    private Integer visibleFieldCount = 0;

    @JsonProperty("excluded_field_count")
    private Integer excludedFieldCount = 0;

    @JsonProperty("schema_table_count")
    private Integer schemaTableCount = 0;

    @JsonProperty("action_type")
    private TrustedAnswerActionType actionType;

    @JsonProperty("entry_scene")
    private String entryScene;

    @JsonProperty("resource_kind")
    private String resourceKind;

    @JsonProperty("resource_id")
    private String resourceId;

    @JsonProperty("chat_id")
    @JsonSerialize(using = ToStringSerializer.class)
    private Long chatId;

    @JsonProperty("readiness_state")
    private ResourceReadinessState readinessState;

    @JsonProperty("askability_state")
    private AuthorizedAskabilityState askabilityState;

    @JsonProperty("runtime_policy")
    private TrustedAnswerRuntimePolicyVO runtimePolicy;

    @JsonProperty("active_semantic_patch_count")
    private Integer activeSemanticPatchCount = 0;

    @JsonProperty("active_semantic_patch_summary")
    private List<String> activeSemanticPatchSummary = new ArrayList<>();

    @JsonProperty("semantic_patch_context")
    private Map<String, String> semanticPatchContext = new LinkedHashMap<>();
}
