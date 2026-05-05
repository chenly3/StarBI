package io.dataease.api.ai.query.vo;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class TrustedAnswerTraceVO implements Serializable {

    @Serial
    private static final long serialVersionUID = -2717705775495906537L;

    @JsonProperty("trace_id")
    private String traceId;

    private TrustedAnswerState state;

    private TrustedAnswerContextVO context;

    private TrustedAnswerErrorVO error;

    @JsonProperty("matched_terms")
    private List<String> matchedTerms = new ArrayList<>();

    @JsonProperty("matched_sql_examples")
    private List<String> matchedSqlExamples = new ArrayList<>();

    @JsonProperty("permission_steps")
    private List<String> permissionSteps = new ArrayList<>();

    @JsonProperty("authorized_record_ids")
    private List<String> authorizedRecordIds = new ArrayList<>();

    @JsonProperty("source_trace_id")
    private String sourceTraceId;

    @JsonProperty("parent_trace_id")
    private String parentTraceId;

    @JsonProperty("user_safe_evidence_summary")
    private String userSafeEvidenceSummary;

    @JsonProperty("blocked_reason")
    private String blockedReason;

    @JsonProperty("owner_user_id")
    private String ownerUserId;

    @JsonProperty("owner_org_id")
    private String ownerOrgId;

    @JsonProperty("owner_workspace_id")
    private String ownerWorkspaceId;
}
