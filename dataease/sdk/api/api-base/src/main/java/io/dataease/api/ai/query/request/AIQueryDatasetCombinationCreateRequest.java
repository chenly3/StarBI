package io.dataease.api.ai.query.request;

import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Data
public class AIQueryDatasetCombinationCreateRequest implements Serializable {

    @Serial
    private static final long serialVersionUID = 5091442729963810692L;

    private String name;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long primaryDatasetId;

    @JsonSerialize(contentUsing = ToStringSerializer.class)
    private List<Long> secondaryDatasetIds = new ArrayList<>();

    private List<RelationItem> relations = new ArrayList<>();

    @Data
    public static class RelationItem implements Serializable {

        @Serial
        private static final long serialVersionUID = 490445109803767570L;

        @JsonSerialize(using = ToStringSerializer.class)
        private Long leftDatasetId;

        private String leftField;

        @JsonSerialize(using = ToStringSerializer.class)
        private Long rightDatasetId;

        private String rightField;

        private String relationType;
    }
}
