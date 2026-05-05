package io.dataease.ai.query.trusted;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class AuthorizedAskScope {

    private Long themeId;
    private Long datasourceId;
    private final List<String> visibleThemeIds = new ArrayList<>();
    private final List<String> visibleResourceIds = new ArrayList<>();
    private final List<String> visibleFieldIds = new ArrayList<>();
    private final List<String> allowedActions = new ArrayList<>();
    private String rowPolicySummary;
    private String columnPolicySummary;
    private String permissionSummary;
    private String deniedReason;
}
