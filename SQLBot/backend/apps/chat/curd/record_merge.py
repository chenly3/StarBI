from __future__ import annotations

from typing import Any, Iterable


def merge_child_records_into_parents(records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized_records = [dict(record) for record in records]
    records_by_id = {
        int(record["id"]): record
        for record in normalized_records
        if record.get("id") is not None
    }
    merged_child_ids: set[int] = set()

    for record in normalized_records:
        record_id = record.get("id")
        analysis_parent_id = record.get("analysis_record_id")
        if analysis_parent_id:
            parent = records_by_id.get(int(analysis_parent_id))
            if parent:
                if record.get("analysis"):
                    parent["analysis"] = record["analysis"]
                if record.get("analysis_thinking"):
                    parent["analysis_thinking"] = record["analysis_thinking"]
                if record_id is not None:
                    parent["analysis_record_id"] = int(record_id)
                    merged_child_ids.add(int(record_id))
                continue

        predict_parent_id = record.get("predict_record_id")
        if predict_parent_id:
            parent = records_by_id.get(int(predict_parent_id))
            if parent:
                if record.get("predict"):
                    parent["predict"] = record["predict"]
                if record.get("predict_content"):
                    parent["predict_content"] = record["predict_content"]
                if record.get("predict_data") is not None:
                    parent["predict_data"] = record["predict_data"]
                if record_id is not None:
                    parent["predict_record_id"] = int(record_id)
                    merged_child_ids.add(int(record_id))

    return [
        record
        for record in normalized_records
        if record.get("id") is None or int(record["id"]) not in merged_child_ids
    ]
