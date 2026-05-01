import ast
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
CHAT_API_PATH = BACKEND_ROOT / "apps" / "chat" / "api" / "chat.py"
LLM_PATH = BACKEND_ROOT / "apps" / "chat" / "task" / "llm.py"


def parse_source(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"))


def find_function(tree: ast.Module, name: str) -> ast.FunctionDef | ast.AsyncFunctionDef:
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    raise AssertionError(f"{name} not found in {tree}")


def find_nested_function(parent: ast.FunctionDef, name: str) -> ast.FunctionDef:
    for node in parent.body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    raise AssertionError(f"{name} not found in {parent.name}")


def find_class_method(tree: ast.Module, class_name: str, method_name: str) -> ast.FunctionDef:
    for node in tree.body:
        if not isinstance(node, ast.ClassDef) or node.name != class_name:
            continue
        for child in node.body:
            if isinstance(child, ast.FunctionDef) and child.name == method_name:
                return child
    raise AssertionError(f"{class_name}.{method_name} not found")


def attribute_names(node: ast.AST) -> set[str]:
    names: set[str] = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Attribute) and isinstance(child.value, ast.Name):
            names.add(f"{child.value.id}.{child.attr}")
    return names


def normalized_source(node: ast.AST) -> str:
    return "".join(ast.unparse(node).split())


class LearningOverrideStreamTest(unittest.TestCase):
    def test_chat_api_learning_override_stream_materializes_patch_id_before_streaming(self):
        function = find_function(parse_source(CHAT_API_PATH), "_try_learning_sql_override_stream")
        stream_function = find_nested_function(function, "_stream")

        stream_attributes = attribute_names(stream_function)
        self.assertNotIn("matched_patch.id", stream_attributes)
        self.assertNotIn("chat.datasource", stream_attributes)

        source = normalized_source(function)
        self.assertIn("chat_datasource=chat.datasource", source)
        self.assertIn("matched_patch_id=matched_patch.id", source)
        self.assertIn("applied_patch_ids=[matched_patch_id]", source)

    def test_llm_learning_override_materializes_patch_id_before_committing_sql_answer(self):
        method = find_class_method(
            parse_source(LLM_PATH),
            "LLMService",
            "try_apply_learning_sql_override",
        )
        source = normalized_source(method)

        patch_id_index = source.find("patch_id=patch.id")
        save_sql_answer_index = source.find("save_sql_answer(")

        self.assertNotEqual(-1, patch_id_index)
        self.assertNotEqual(-1, save_sql_answer_index)
        self.assertLess(patch_id_index, save_sql_answer_index)
        self.assertIn("applied_patch_ids=[patch_id]", source)
        self.assertNotIn("applied_patch_ids=[patch.id]", source)

    def test_recommend_questions_falls_back_to_empty_when_default_model_missing(self):
        function = find_function(parse_source(CHAT_API_PATH), "ask_recommend_questions")
        source = normalized_source(function)

        self.assertIn("Thesystemdefaultmodelhasnotbeenset", source)
        self.assertIn("returnStreamingResponse(_return_empty(),media_type='text/event-stream')", source)


if __name__ == "__main__":
    unittest.main()
