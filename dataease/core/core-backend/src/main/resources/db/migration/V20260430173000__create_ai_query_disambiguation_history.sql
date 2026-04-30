CREATE TABLE IF NOT EXISTS ai_query_disambiguation_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    question_pattern VARCHAR(500) NOT NULL COMMENT '问题模式',
    resolution JSON NOT NULL COMMENT '消歧结果',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    use_count INT DEFAULT 1,
    INDEX idx_user_id (user_id),
    INDEX idx_pattern (question_pattern)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
