from apps.chat.task.llm import LLMService


def test_apply_dynamic_temp_table_replacements_handles_uppercase_and_backticks():
    sql_text = (
        "SELECT `t1`.`account` AS `account` "
        "FROM (SELECT * FROM `sqlbot_dynamic_temp_table_cloud_bill_dataset_9001`) AS `t1` "
        "GROUP BY `t1`.`account`"
    )
    dynamic_sql_result = {
        "cloud_bill_dataset_9001": "SELECT * FROM `dataease10`.`cloud_bill_dataset_9001`"
    }

    replaced_sql = LLMService.apply_dynamic_temp_table_replacements(sql_text, dynamic_sql_result)

    assert "sqlbot_dynamic_temp_table_cloud_bill_dataset_9001" not in replaced_sql
    assert "SELECT * FROM `dataease10`.`cloud_bill_dataset_9001`" in replaced_sql


def test_apply_dynamic_temp_table_replacements_handles_db_wrapped_temp_subquery():
    sql_text = (
        "SELECT `t1`.`account` AS `account` "
        "FROM `dataease10`.`(select * from sqlbot_dynamic_temp_table_cloud_bill_dataset_9001)` AS `t1` "
        "GROUP BY `t1`.`account`"
    )
    dynamic_sql_result = {
        "cloud_bill_dataset_9001": "SELECT * FROM `dataease10`.`cloud_bill_dataset_9001`"
    }

    replaced_sql = LLMService.apply_dynamic_temp_table_replacements(sql_text, dynamic_sql_result)

    assert "sqlbot_dynamic_temp_table_cloud_bill_dataset_9001" not in replaced_sql
    assert "(SELECT * FROM `dataease10`.`cloud_bill_dataset_9001`)" in replaced_sql


def test_apply_dynamic_temp_table_replacements_handles_non_ascii_table_name():
    sql_text = (
        "SELECT `t`.`店铺` AS `store`, SUM(`t`.`金额`) AS `total_sales` "
        "FROM (select * from `sqlbot_dynamic_temp_table_codex 茶饮经营组合_20260426_013828`) AS `t` "
        "GROUP BY `t`.`店铺`"
    )
    dynamic_sql_result = {
        "Codex 茶饮经营组合_20260426_013828": "SELECT * FROM `dataease10`.`Codex 茶饮经营组合_20260426_013828`"
    }

    replaced_sql = LLMService.apply_dynamic_temp_table_replacements(sql_text, dynamic_sql_result)

    assert "sqlbot_dynamic_temp_table_codex 茶饮经营组合_20260426_013828" not in replaced_sql
    assert "SELECT * FROM `dataease10`.`Codex 茶饮经营组合_20260426_013828`" in replaced_sql
