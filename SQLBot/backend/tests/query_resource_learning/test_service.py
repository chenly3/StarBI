import re
import sys
import unittest
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

BACKEND_ROOT = Path(__file__).resolve().parents[2]
MIGRATION_REVISION = "069_query_resource_learning"
FEEDBACK_LOOP_MIGRATION_REVISION = "070_qrl_feedback_loop"
MIGRATIONS_DIR = BACKEND_ROOT / "alembic" / "versions"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def find_migration_path(revision: str) -> Path:
    revision_pattern = re.compile(
        rf'^\s*revision\s*=\s*["\']{re.escape(revision)}["\']\s*$',
        re.MULTILINE,
    )
    for migration_path in MIGRATIONS_DIR.glob("*.py"):
        migration_source = migration_path.read_text(encoding="utf-8")
        if revision_pattern.search(migration_source):
            return migration_path
    raise FileNotFoundError(f"Migration for revision {revision} not found")


class FakeResult:
    def __init__(self, items: list[Any]):
        self._items = list(items)

    def all(self) -> list[Any]:
        return list(self._items)


class FakeServiceSession:
    def __init__(self):
        self._items: dict[type, list[Any]] = defaultdict(list)
        self._next_id = 1

    def add(self, item: Any) -> None:
        model_items = self._items[type(item)]
        if item in model_items:
            return
        if hasattr(item, "id") and getattr(item, "id", None) is None:
            item.id = self._next_id
            self._next_id += 1
        model_items.append(item)

    def exec(self, statement: Any) -> FakeResult:
        model = statement.column_descriptions[0]["entity"]
        return FakeResult(self._items[model])

    def flush(self) -> None:
        return None

    def commit(self) -> None:
        return None

    def refresh(self, _item: Any) -> None:
        return None

    def items(self, model: type) -> list[Any]:
        return list(self._items[model])


class QueryResourceLearningModelTests(unittest.TestCase):
    def test_learning_models_expose_expected_core_fields_and_column_types(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningResult,
            QueryResourceLearningScore,
            QueryResourceLearningTask,
        )

        task_columns = QueryResourceLearningTask.__table__.c
        result_columns = QueryResourceLearningResult.__table__.c
        score_columns = QueryResourceLearningScore.__table__.c

        self.assertIsInstance(task_columns.id.type, sa.BigInteger)
        self.assertIsInstance(task_columns.resource_id.type, sa.String)
        self.assertEqual(task_columns.resource_id.type.length, 64)
        self.assertIsInstance(task_columns.status.type, sa.String)
        self.assertEqual(task_columns.status.type.length, 32)
        self.assertIsInstance(task_columns.failure_reason.type, sa.Text)
        self.assertFalse(task_columns.resource_id.nullable)
        self.assertFalse(task_columns.status.nullable)

        self.assertIsInstance(result_columns.version.type, sa.Integer)
        self.assertIsInstance(result_columns.semantic_profile.type, JSONB)
        self.assertIsInstance(result_columns.sample_values.type, JSONB)
        self.assertIsInstance(result_columns.recommended_questions.type, JSONB)
        self.assertFalse(result_columns.semantic_profile.nullable)
        self.assertFalse(result_columns.sample_values.nullable)
        self.assertFalse(result_columns.recommended_questions.nullable)

        self.assertIsInstance(score_columns.grade.type, sa.String)
        self.assertEqual(score_columns.grade.type.length, 4)
        self.assertIsInstance(score_columns.score.type, sa.Integer)
        self.assertIsInstance(score_columns.signals.type, JSONB)
        self.assertFalse(score_columns.grade.nullable)
        self.assertFalse(score_columns.signals.nullable)

    def test_learning_models_use_structured_defaults_for_payloads(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningResult,
            QueryResourceLearningScore,
            QueryResourceLearningTask,
        )

        task = QueryResourceLearningTask(resource_id="resource-1", status="pending")
        result = QueryResourceLearningResult(resource_id="resource-1")
        score = QueryResourceLearningScore(resource_id="resource-1")

        self.assertEqual(task.trigger_type, "manual")
        self.assertIsNone(task.failure_reason)

        self.assertEqual(result.version, 1)
        self.assertEqual(result.semantic_profile, {})
        self.assertEqual(result.sample_values, [])
        self.assertEqual(result.recommended_questions, [])
        self.assertIsInstance(result.semantic_profile, dict)
        self.assertIsInstance(result.sample_values, list)
        self.assertIsInstance(result.recommended_questions, list)

        self.assertEqual(score.grade, "C")
        self.assertEqual(score.score, 0)
        self.assertEqual(score.signals, [])
        self.assertIsInstance(score.signals, list)

    def test_learning_migration_uses_current_revision_and_server_defaults(self):
        migration_path = find_migration_path(MIGRATION_REVISION)
        migration_source = migration_path.read_text(encoding="utf-8")
        self.assertIn(f'revision = "{MIGRATION_REVISION}"', migration_source)
        self.assertIn('down_revision = "068_ctx_combo"', migration_source)
        self.assertIn(
            'server_default=sa.text("\'manual\'")',
            migration_source,
        )
        self.assertIn('server_default=sa.text("1")', migration_source)
        self.assertIn(
            'server_default=sa.text("\'{}\'::jsonb")',
            migration_source,
        )
        self.assertIn(
            'server_default=sa.text("\'[]\'::jsonb")',
            migration_source,
        )
        self.assertIn(
            'server_default=sa.text("\'C\'")',
            migration_source,
        )
        self.assertIn('server_default=sa.text("0")', migration_source)

    def test_feedback_loop_models_and_revision_chain(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningFeedbackEvent,
            QueryResourceLearningFeedbackMetric,
            QueryResourceLearningPatchApplyLog,
            QueryResourceLearningPatchSnapshot,
        )

        self.assertEqual(
            QueryResourceLearningFeedbackEvent.__tablename__,
            "query_resource_learning_feedback_event",
        )
        self.assertEqual(
            QueryResourceLearningPatchSnapshot.__tablename__,
            "query_resource_learning_patch_snapshot",
        )
        self.assertEqual(
            QueryResourceLearningPatchApplyLog.__tablename__,
            "query_resource_learning_patch_apply_log",
        )
        self.assertEqual(
            QueryResourceLearningFeedbackMetric.__tablename__,
            "query_resource_learning_feedback_metric",
        )

        feedback_event_indexes = {
            index.name: index for index in QueryResourceLearningFeedbackEvent.__table__.indexes
        }
        self.assertIn(
            "uq_query_resource_learning_feedback_event_event_no",
            feedback_event_indexes,
        )
        self.assertTrue(
            feedback_event_indexes[
                "uq_query_resource_learning_feedback_event_event_no"
            ].unique
        )
        self.assertEqual(
            tuple(
                feedback_event_indexes[
                    "uq_query_resource_learning_feedback_event_event_no"
                ].columns.keys()
            ),
            ("event_no",),
        )

        patch_snapshot_indexes = {
            index.name: index for index in QueryResourceLearningPatchSnapshot.__table__.indexes
        }
        self.assertIn(
            "ix_query_resource_learning_patch_snapshot_resource_status",
            patch_snapshot_indexes,
        )
        self.assertIn(
            "uq_query_resource_learning_patch_snapshot_active_match",
            patch_snapshot_indexes,
        )
        self.assertEqual(
            tuple(
                patch_snapshot_indexes[
                    "ix_query_resource_learning_patch_snapshot_resource_status"
                ].columns.keys()
            ),
            ("resource_id", "status"),
        )
        self.assertEqual(
            tuple(
                patch_snapshot_indexes[
                    "uq_query_resource_learning_patch_snapshot_active_match"
                ].columns.keys()
            ),
            ("resource_id", "patch_type", "match_fingerprint"),
        )
        self.assertTrue(
            patch_snapshot_indexes[
                "uq_query_resource_learning_patch_snapshot_active_match"
            ].unique
        )
        active_unique_where = patch_snapshot_indexes[
            "uq_query_resource_learning_patch_snapshot_active_match"
        ].dialect_options["postgresql"].get("where")
        self.assertIsNotNone(active_unique_where)
        self.assertIn("status", str(active_unique_where))
        self.assertIn("active", str(active_unique_where))

        feedback_metric_indexes = {
            index.name: index for index in QueryResourceLearningFeedbackMetric.__table__.indexes
        }
        self.assertIn(
            "ix_query_resource_learning_feedback_metric_relearning_suggested",
            feedback_metric_indexes,
        )
        self.assertIn(
            "ix_query_resource_learning_feedback_metric_trigger_reason",
            feedback_metric_indexes,
        )
        self.assertEqual(
            tuple(
                feedback_metric_indexes[
                    "ix_query_resource_learning_feedback_metric_relearning_suggested"
                ].columns.keys()
            ),
            ("relearning_suggested",),
        )
        self.assertEqual(
            tuple(
                feedback_metric_indexes[
                    "ix_query_resource_learning_feedback_metric_trigger_reason"
                ].columns.keys()
            ),
            ("trigger_reason",),
        )

        migration_source = find_migration_path(FEEDBACK_LOOP_MIGRATION_REVISION).read_text(
            encoding="utf-8"
        )
        self.assertIn(
            f'revision = "{FEEDBACK_LOOP_MIGRATION_REVISION}"',
            migration_source,
        )
        self.assertIn('down_revision = "069_query_resource_learning"', migration_source)
        self.assertIn('"query_resource_learning_feedback_event"', migration_source)
        self.assertIn('"query_resource_learning_patch_snapshot"', migration_source)
        self.assertIn('"query_resource_learning_patch_apply_log"', migration_source)
        self.assertIn('"query_resource_learning_feedback_metric"', migration_source)
        self.assertIn(
            '"uq_query_resource_learning_patch_snapshot_active_match"',
            migration_source,
        )
        self.assertIn("server_default=sa.text(\"'[]'::jsonb\")", migration_source)

    def test_calculate_learning_grade_returns_a_when_all_signals_are_strong(self):
        from apps.query_resource_learning.service import calculate_learning_grade

        result = calculate_learning_grade(
            field_completion=100,
            semantic_clarity=95,
            sample_coverage=90,
            terminology_coverage=90,
            sql_example_coverage=80,
            query_success_rate=95,
        )

        self.assertEqual(set(result.keys()), {"grade", "score"})
        self.assertEqual(result["grade"], "A")
        self.assertGreaterEqual(result["score"], 90)

    def test_calculate_learning_grade_uses_expected_thresholds(self):
        from apps.query_resource_learning.service import calculate_learning_grade

        for score, expected_grade in ((90, "A"), (75, "B"), (60, "C"), (59, "D")):
            with self.subTest(score=score):
                result = calculate_learning_grade(
                    field_completion=score,
                    semantic_clarity=score,
                    sample_coverage=score,
                    terminology_coverage=score,
                    sql_example_coverage=score,
                    query_success_rate=score,
                )

                self.assertEqual(result["grade"], expected_grade)
                self.assertEqual(result["score"], score)

    def test_should_trigger_relearning_when_schema_changes(self):
        from apps.query_resource_learning.service import should_trigger_relearning

        self.assertTrue(
            should_trigger_relearning(
                failure_rate=0,
                downvote_rate=0,
                schema_changed=True,
            )
        )

    def test_should_trigger_relearning_when_failure_rate_is_high(self):
        from apps.query_resource_learning.service import should_trigger_relearning

        self.assertTrue(
            should_trigger_relearning(
                failure_rate=30,
                downvote_rate=0,
                schema_changed=False,
            )
        )

    def test_should_trigger_relearning_when_downvote_rate_is_high(self):
        from apps.query_resource_learning.service import should_trigger_relearning

        self.assertTrue(
            should_trigger_relearning(
                failure_rate=0,
                downvote_rate=20,
                schema_changed=False,
            )
        )

    def test_should_not_trigger_relearning_when_feedback_is_below_threshold(self):
        from apps.query_resource_learning.service import should_trigger_relearning

        self.assertFalse(
            should_trigger_relearning(
                failure_rate=29,
                downvote_rate=19,
                schema_changed=False,
            )
        )

    def test_build_learning_result_uses_dataset_meta_defaults(self):
        from apps.query_resource_learning.service import QueryResourceLearningService

        service = QueryResourceLearningService()

        result = service.build_learning_result(
            resource_id="resource-1",
            dataset_meta={
                "name": "Sales Dataset",
                "description": "销售主题数据集",
            },
            sample_values=["east", "west"],
            terminology_mappings=[{"term": "GMV", "target": "sales_amount"}],
            sql_examples=[{"question": "最近30天 GMV", "sql": "select 1"}],
            recommended_questions=["最近30天 GMV"],
        )

        self.assertEqual(result["resource_id"], "resource-1")
        self.assertEqual(
            result["semantic_profile"],
            {
                "dataset_name": "Sales Dataset",
                "resource_name": "Sales Dataset",
                "description": "销售主题数据集",
                "fields": [],
                "terminology_mappings": [{"term": "GMV", "target": "sales_amount"}],
                "sql_examples": [{"question": "最近30天 GMV", "sql": "select 1"}],
            },
        )
        self.assertEqual(result["sample_values"], ["east", "west"])
        self.assertEqual(result["recommended_questions"], ["最近30天 GMV"])

    def test_build_learning_result_returns_snapshot_safe_copies(self):
        from apps.query_resource_learning.service import QueryResourceLearningService

        service = QueryResourceLearningService()
        fields = [{"name": "region"}]
        sample_values = [{"value": "east"}]
        terminology_mappings = [{"term": "区域", "target": "region"}]
        sql_examples = [{"question": "按区域看销售额", "sql": "select 1"}]
        recommended_questions = ["按区域看销售额"]

        result = service.build_learning_result(
            resource_id="resource-1",
            dataset_meta={"name": "Sales Dataset", "fields": fields},
            sample_values=sample_values,
            terminology_mappings=terminology_mappings,
            sql_examples=sql_examples,
            recommended_questions=recommended_questions,
        )

        fields[0]["name"] = "mutated"
        sample_values[0]["value"] = "west"
        fields.append({"name": "extra"})
        sample_values.append({"value": "north"})
        terminology_mappings[0]["target"] = "mutated"
        sql_examples[0]["sql"] = "select 2"
        recommended_questions.append("新增问题")

        self.assertEqual(
            result["semantic_profile"],
            {
                "dataset_name": "Sales Dataset",
                "resource_name": "Sales Dataset",
                "description": "",
                "fields": [{"name": "region"}],
                "terminology_mappings": [{"term": "区域", "target": "region"}],
                "sql_examples": [{"question": "按区域看销售额", "sql": "select 1"}],
            },
        )
        self.assertEqual(result["sample_values"], [{"value": "east"}])
        self.assertEqual(result["recommended_questions"], ["按区域看销售额"])

    def test_build_quality_summary_uses_score_and_signals(self):
        from apps.query_resource_learning.service import build_quality_summary

        summary = build_quality_summary(
            resource_id="resource-1",
            score=91,
            grade="A",
            signals=["字段完整度高"],
            suggestions=["补充更多 SQL 示例"],
        )

        self.assertEqual(summary["resource_id"], "resource-1")
        self.assertEqual(summary["score"], 91)
        self.assertEqual(summary["grade"], "A")
        self.assertEqual(summary["risks"], [])
        self.assertEqual(summary["signals"], ["字段完整度高"])
        self.assertEqual(summary["suggestions"], ["补充更多 SQL 示例"])

    def test_build_feedback_summary_marks_relearning_when_failures_are_high(self):
        from apps.query_resource_learning.service import build_feedback_summary

        summary = build_feedback_summary(
            resource_id="resource-2",
            downvote_count=3,
            failure_count=5,
            total_feedback_count=10,
            recent_issues=["值匹配错误", "资源召回错误"],
            schema_changed=False,
        )

        self.assertEqual(summary["resource_id"], "resource-2")
        self.assertEqual(summary["total_feedback_count"], 10)
        self.assertEqual(summary["downvote_count"], 3)
        self.assertEqual(summary["downvote_rate"], 30)
        self.assertEqual(summary["failure_count"], 5)
        self.assertEqual(summary["failure_rate"], 50)
        self.assertEqual(summary["recent_issues"], ["值匹配错误", "资源召回错误"])
        self.assertTrue(summary["relearning_suggested"])
        self.assertEqual(summary["trigger_reason"], "failure_rate_high")
        self.assertEqual(
            summary["relearning_advice"],
            "近期失败率偏高，建议重新学习并复核字段语义与样本值。",
        )

    def test_build_feedback_summary_marks_relearning_for_schema_changes(self):
        from apps.query_resource_learning.service import build_feedback_summary

        summary = build_feedback_summary(
            resource_id="resource-9",
            downvote_count=0,
            failure_count=0,
            total_feedback_count=0,
            recent_issues=[],
            schema_changed=True,
        )

        self.assertEqual(summary["resource_id"], "resource-9")
        self.assertEqual(summary["total_feedback_count"], 0)
        self.assertEqual(summary["downvote_rate"], 0)
        self.assertEqual(summary["failure_rate"], 0)
        self.assertTrue(summary["relearning_suggested"])
        self.assertEqual(summary["trigger_reason"], "schema_changed")
        self.assertEqual(
            summary["relearning_advice"],
            "检测到数据结构已变更，建议立即重新学习以刷新问数资产。",
        )

    def test_manual_fix_submit_creates_event_and_patch_and_metric(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningFeedbackEvent,
            QueryResourceLearningFeedbackMetric,
            QueryResourceLearningPatchSnapshot,
        )
        from apps.query_resource_learning.service import submit_feedback_event

        session = FakeServiceSession()

        response = submit_feedback_event(
            session,
            resource_id="resource-1",
            actor_account="tester",
            payload={
                "event_type": "manual_fix_submit",
                "question_text": "最近30天GMV",
                "matched_sql": "select sum(gmv) from sales",
                "before_snapshot": {"sql": "select gmv from sales"},
                "after_snapshot": {"sql": "select sum(gmv) from sales"},
                "patch_types": ["sql_override", "field_mapping_fix"],
            },
        )

        events = session.items(QueryResourceLearningFeedbackEvent)
        patches = session.items(QueryResourceLearningPatchSnapshot)
        metrics = session.items(QueryResourceLearningFeedbackMetric)

        self.assertTrue(response["accepted"])
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].event_type, "manual_fix_submit")
        self.assertEqual(events[0].resource_id, "resource-1")
        self.assertEqual(len(patches), 2)
        self.assertEqual(response["active_patch_count"], 2)
        self.assertEqual({patch.status for patch in patches}, {"active"})
        self.assertEqual(len({patch.match_fingerprint for patch in patches}), 1)
        self.assertEqual({patch.source_event_id for patch in patches}, {events[0].id})
        self.assertEqual(len(metrics), 1)
        self.assertEqual(metrics[0].lifetime_total_feedback_count, 1)
        self.assertEqual(metrics[0].lifetime_correction_count, 1)
        self.assertEqual(metrics[0].window_7d_correction_rate, 100)
        self.assertEqual(response["metric"]["window_7d_correction_rate"], 100)

    def test_active_sql_override_patch_matches_same_resource_and_question(self):
        from apps.query_resource_learning.service import (
            find_active_sql_override_patch,
            submit_feedback_event,
        )

        session = FakeServiceSession()
        submit_feedback_event(
            session,
            resource_id="datasource:9001",
            actor_account="tester",
            payload={
                "event_type": "manual_fix_submit",
                "question_text": "统计应付金额总和",
                "matched_sql": "select sum(payable_amount) from cloud_bill",
                "before_snapshot": {"sql": "select payable_amount from cloud_bill"},
                "after_snapshot": {"sql": "SELECT 12345 AS total_payable"},
                "patch_types": ["sql_override"],
            },
        )

        matched_patch = find_active_sql_override_patch(
            session,
            resource_id="datasource:9001",
            question_text=" 统计应付金额总和 ",
        )
        wrong_question_patch = find_active_sql_override_patch(
            session,
            resource_id="datasource:9001",
            question_text="统计实付金额总和",
        )
        wrong_resource_patch = find_active_sql_override_patch(
            session,
            resource_id="datasource:9002",
            question_text="统计应付金额总和",
        )

        self.assertIsNotNone(matched_patch)
        self.assertEqual(
            matched_patch.patch_payload["after_snapshot"]["sql"],
            "SELECT 12345 AS total_payable",
        )
        self.assertIsNone(wrong_question_patch)
        self.assertIsNone(wrong_resource_patch)

    def test_record_patch_apply_log_persists_patch_hit_context(self):
        from apps.query_resource_learning.models import QueryResourceLearningPatchApplyLog
        from apps.query_resource_learning.service import record_patch_apply_log

        session = FakeServiceSession()

        log = record_patch_apply_log(
            session,
            resource_id="datasource:9001",
            chat_record_id=339,
            trace_id="trace-001",
            question_text="统计应付金额总和",
            pre_sql=None,
            post_sql="SELECT 12345 AS total_payable",
            applied_patch_ids=[1],
            apply_result="applied",
        )

        logs = session.items(QueryResourceLearningPatchApplyLog)
        self.assertIs(log, logs[0])
        self.assertEqual(log.resource_id, "datasource:9001")
        self.assertEqual(log.chat_record_id, 339)
        self.assertEqual(log.trace_id, "trace-001")
        self.assertEqual(log.question_text, "统计应付金额总和")
        self.assertEqual(log.question_hash, "388ac73b52ee1fb941cfb84d9257572dc1652f97b3e41212fb8fdc5d0cad0ecf")
        self.assertEqual(log.pre_sql, None)
        self.assertEqual(log.post_sql, "SELECT 12345 AS total_payable")
        self.assertEqual(log.applied_patch_ids, [1])
        self.assertEqual(log.apply_result, "applied")

    def test_downvote_and_failure_update_metric_rates(self):
        from apps.query_resource_learning.service import (
            get_feedback_metric,
            submit_feedback_event,
        )

        session = FakeServiceSession()
        submit_feedback_event(
            session,
            resource_id="resource-2",
            actor_account="tester",
            payload={"event_type": "downvote"},
        )
        submit_feedback_event(
            session,
            resource_id="resource-2",
            actor_account="tester",
            payload={
                "event_type": "execution_failure",
                "error_code": "SQL_EXEC_ERROR",
                "error_message": "syntax error",
            },
        )

        metric = get_feedback_metric(session, resource_id="resource-2")

        self.assertEqual(metric["lifetime_total_feedback_count"], 2)
        self.assertEqual(metric["lifetime_downvote_count"], 1)
        self.assertEqual(metric["lifetime_failure_count"], 1)
        self.assertEqual(metric["lifetime_correction_count"], 0)
        self.assertEqual(metric["window_7d_total_feedback_count"], 2)
        self.assertEqual(metric["window_7d_downvote_rate"], 50)
        self.assertEqual(metric["window_7d_failure_rate"], 50)
        self.assertEqual(metric["window_7d_correction_rate"], 0)
        self.assertTrue(metric["relearning_suggested"])
        self.assertEqual(metric["trigger_reason"], "failure_rate_high")

    def test_disable_patch_sets_inactive_and_emits_disable_event(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningFeedbackEvent,
            QueryResourceLearningPatchSnapshot,
        )
        from apps.query_resource_learning.service import (
            disable_patch,
            list_patches,
            submit_feedback_event,
        )

        session = FakeServiceSession()
        submit_feedback_event(
            session,
            resource_id="resource-3",
            actor_account="tester",
            payload={
                "event_type": "manual_fix_submit",
                "question_text": "按区域看GMV",
                "matched_sql": "select region, sum(gmv) from sales group by region",
                "before_snapshot": {"sql": "select region, gmv from sales"},
                "after_snapshot": {"sql": "select region, sum(gmv) from sales group by region"},
                "patch_types": ["sql_override"],
            },
        )
        patch_id = session.items(QueryResourceLearningPatchSnapshot)[0].id

        disable_result = disable_patch(
            session,
            resource_id="resource-3",
            patch_id=patch_id,
            actor_account="reviewer",
            reason="manual rollback",
        )

        patches = session.items(QueryResourceLearningPatchSnapshot)
        events = session.items(QueryResourceLearningFeedbackEvent)

        self.assertTrue(disable_result["disabled"])
        self.assertEqual(len(events), 2)
        self.assertEqual(events[-1].event_type, "manual_fix_disable")
        self.assertEqual(events[-1].patch_types, ["sql_override"])
        self.assertEqual(patches[0].status, "inactive")
        self.assertEqual(patches[0].disabled_by, "reviewer")
        self.assertEqual(patches[0].disable_reason, "manual rollback")
        self.assertIsNotNone(patches[0].deactivated_at)

        active_patches = list_patches(session, resource_id="resource-3", status="active")
        inactive_patches = list_patches(session, resource_id="resource-3", status="inactive")
        self.assertEqual(active_patches, [])
        self.assertEqual(len(inactive_patches), 1)
        self.assertEqual(inactive_patches[0]["id"], patch_id)

    def test_manual_fix_submit_requires_snapshots_and_patch_types(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningFeedbackEvent,
        )
        from apps.query_resource_learning.service import submit_feedback_event

        session = FakeServiceSession()
        with self.assertRaises(ValueError):
            submit_feedback_event(
                session,
                resource_id="resource-4",
                actor_account="tester",
                payload={
                    "event_type": "manual_fix_submit",
                    "before_snapshot": {},
                    "after_snapshot": {"sql": "select 1"},
                    "patch_types": ["sql_override"],
                },
            )
        with self.assertRaises(ValueError):
            submit_feedback_event(
                session,
                resource_id="resource-4",
                actor_account="tester",
                payload={
                    "event_type": "manual_fix_submit",
                    "before_snapshot": {"sql": "select 1"},
                    "after_snapshot": {"sql": "select 2"},
                    "patch_types": [],
                },
            )
        self.assertEqual(session.items(QueryResourceLearningFeedbackEvent), [])

    def test_manual_fix_submit_requires_matching_context(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningFeedbackEvent,
        )
        from apps.query_resource_learning.service import submit_feedback_event

        session = FakeServiceSession()
        with self.assertRaises(ValueError):
            submit_feedback_event(
                session,
                resource_id="resource-5",
                actor_account="tester",
                payload={
                    "event_type": "manual_fix_submit",
                    "before_snapshot": {"sql": "select 1"},
                    "after_snapshot": {"sql": "select 2"},
                    "patch_types": ["sql_override"],
                },
            )
        self.assertEqual(session.items(QueryResourceLearningFeedbackEvent), [])

    def test_manual_fix_submit_rejects_unsafe_sql_override(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningFeedbackEvent,
        )
        from apps.query_resource_learning.service import submit_feedback_event

        session = FakeServiceSession()
        with self.assertRaisesRegex(
            ValueError,
            "sql_override only supports single SELECT/WITH statements",
        ):
            submit_feedback_event(
                session,
                resource_id="resource-unsafe",
                actor_account="tester",
                payload={
                    "event_type": "manual_fix_submit",
                    "question_text": "修正 SQL",
                    "before_snapshot": {"sql": "select region, gmv from sales"},
                    "after_snapshot": {"sql": "delete from sales"},
                    "patch_types": ["sql_override"],
                },
            )
        self.assertEqual(session.items(QueryResourceLearningFeedbackEvent), [])

    def test_list_feedback_events_filters_and_validates_time_window(self):
        from apps.query_resource_learning.models import (
            QueryResourceLearningFeedbackEvent,
        )
        from apps.query_resource_learning.service import (
            list_feedback_events,
            submit_feedback_event,
        )

        session = FakeServiceSession()
        submit_feedback_event(
            session,
            resource_id="resource-filter",
            actor_account="tester",
            payload={
                "event_type": "downvote",
                "source_chat_record_id": 101,
                "question_text": "问题A",
            },
        )
        submit_feedback_event(
            session,
            resource_id="resource-filter",
            actor_account="tester",
            payload={
                "event_type": "execution_failure",
                "source_chat_record_id": 102,
                "question_text": "问题B",
            },
        )

        events = session.items(QueryResourceLearningFeedbackEvent)
        events[0].created_at = datetime(2026, 4, 25, 10, 0, 0)
        events[1].created_at = datetime(2026, 4, 26, 10, 0, 0)

        filtered = list_feedback_events(
            session,
            resource_id="resource-filter",
            event_type="execution_failure",
            source_chat_record_id=102,
            created_from=datetime(2026, 4, 26, 0, 0, 0),
            created_to=datetime(2026, 4, 26, 23, 59, 59),
        )
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0]["event_type"], "execution_failure")
        self.assertEqual(filtered[0]["source_chat_record_id"], 102)

        with self.assertRaisesRegex(
            ValueError,
            "created_from must be less than or equal to created_to",
        ):
            list_feedback_events(
                session,
                resource_id="resource-filter",
                created_from=datetime(2026, 4, 27, 0, 0, 0),
                created_to=datetime(2026, 4, 26, 0, 0, 0),
            )

    def test_disable_patch_should_not_dilute_feedback_rates(self):
        from apps.query_resource_learning.service import (
            disable_patch,
            get_feedback_metric,
            list_patches,
            submit_feedback_event,
        )

        session = FakeServiceSession()
        submit_feedback_event(
            session,
            resource_id="resource-6",
            actor_account="tester",
            payload={"event_type": "downvote"},
        )
        submit_feedback_event(
            session,
            resource_id="resource-6",
            actor_account="tester",
            payload={"event_type": "execution_failure", "error_message": "runtime error"},
        )
        submit_feedback_event(
            session,
            resource_id="resource-6",
            actor_account="tester",
            payload={
                "event_type": "manual_fix_submit",
                "question_text": "最近7天 GMV",
                "matched_sql": "select sum(gmv) from sales",
                "before_snapshot": {"sql": "select gmv from sales"},
                "after_snapshot": {"sql": "select sum(gmv) from sales"},
                "patch_types": ["sql_override"],
            },
        )
        metric_before = get_feedback_metric(session, resource_id="resource-6")
        patch_id = list_patches(session, resource_id="resource-6", status="active")[0]["id"]

        disable_patch(
            session,
            resource_id="resource-6",
            patch_id=patch_id,
            actor_account="reviewer",
            reason="manual disable",
        )
        metric_after = get_feedback_metric(session, resource_id="resource-6")

        self.assertEqual(metric_before["lifetime_total_feedback_count"], 3)
        self.assertEqual(metric_after["lifetime_total_feedback_count"], 3)
        self.assertEqual(metric_before["window_7d_total_feedback_count"], 3)
        self.assertEqual(metric_after["window_7d_total_feedback_count"], 3)
        self.assertEqual(metric_after["lifetime_downvote_count"], metric_before["lifetime_downvote_count"])
        self.assertEqual(metric_after["lifetime_failure_count"], metric_before["lifetime_failure_count"])
        self.assertEqual(metric_after["window_7d_downvote_rate"], metric_before["window_7d_downvote_rate"])
        self.assertEqual(metric_after["window_7d_failure_rate"], metric_before["window_7d_failure_rate"])

    def test_execute_learning_for_resource_returns_terminal_task_status(self):
        from apps.query_resource_learning import service as learning_service

        success_result = learning_service.execute_learning_for_resource(
            FakeServiceSession(),
            resource_id="resource-7",
        )
        self.assertEqual(success_result["task"].status, "succeeded")
        self.assertEqual(success_result["task_status"], "succeeded")

        original_builder = learning_service._build_dataset_meta
        try:
            def _raise_error(*_args, **_kwargs):
                raise RuntimeError("mocked failure")

            learning_service._build_dataset_meta = _raise_error
            failed_result = learning_service.execute_learning_for_resource(
                FakeServiceSession(),
                resource_id="resource-7",
            )
        finally:
            learning_service._build_dataset_meta = original_builder

        self.assertEqual(failed_result["task"].status, "failed")
        self.assertEqual(failed_result["task_status"], "failed")

    def test_save_learning_score_uses_session_persistence_contract(self):
        from apps.query_resource_learning.crud import save_learning_score
        from apps.query_resource_learning.models import QueryResourceLearningScore

        class FakeSession:
            def __init__(self):
                self.calls = []

            def add(self, score):
                self.calls.append(("add", score))

            def commit(self):
                self.calls.append(("commit", None))

            def refresh(self, score):
                self.calls.append(("refresh", score))

        session = FakeSession()
        learning_score = QueryResourceLearningScore(resource_id="resource-1")

        saved_score = save_learning_score(session, learning_score)

        self.assertIs(saved_score, learning_score)
        self.assertEqual(
            session.calls,
            [
                ("add", learning_score),
                ("commit", None),
                ("refresh", learning_score),
            ],
        )


if __name__ == "__main__":
    unittest.main()
