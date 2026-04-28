import unittest

from apps.chat.curd.record_merge import merge_child_records_into_parents


class MergeChildRecordsIntoParentsTests(unittest.TestCase):
    def test_merges_analysis_and_predict_children_back_into_base_record(self):
        base_record = {
            "id": 101,
            "question": "按店铺统计销售金额前5名",
            "analysis": "",
            "analysis_record_id": None,
            "predict": "",
            "predict_content": "",
            "predict_record_id": None,
        }
        analysis_record = {
            "id": 202,
            "question": "按店铺统计销售金额前5名",
            "analysis": "果元店销售额最高，建议持续补货。",
            "analysis_thinking": "先比较门店销售额，再输出建议。",
            "analysis_record_id": 101,
        }
        predict_record = {
            "id": 303,
            "question": "按店铺统计销售金额前5名",
            "predict": "预计下周果元店仍保持第一。",
            "predict_content": "建议关注周末促销带来的额外增量。",
            "predict_data": {"trend": "up"},
            "predict_record_id": 101,
        }

        merged_records = merge_child_records_into_parents(
            [base_record, analysis_record, predict_record]
        )

        self.assertEqual(len(merged_records), 1)
        self.assertEqual(merged_records[0]["id"], 101)
        self.assertEqual(merged_records[0]["analysis"], analysis_record["analysis"])
        self.assertEqual(
            merged_records[0]["analysis_thinking"], analysis_record["analysis_thinking"]
        )
        self.assertEqual(merged_records[0]["analysis_record_id"], 202)
        self.assertEqual(merged_records[0]["predict"], predict_record["predict"])
        self.assertEqual(merged_records[0]["predict_content"], predict_record["predict_content"])
        self.assertEqual(merged_records[0]["predict_data"], predict_record["predict_data"])
        self.assertEqual(merged_records[0]["predict_record_id"], 303)


if __name__ == "__main__":
    unittest.main()
