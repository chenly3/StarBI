package io.dataease.api.ai.query.vo;

import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

@Data
public class SQLBotAdminEmbedVO implements Serializable {

    @Serial
    private static final long serialVersionUID = 642711331774318481L;

    private String domain;

    private String id;

    private String pageKey;

    private String token;

    private Boolean enabled = false;

    private Boolean valid = false;
}
