import ast
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
CHAT_MODEL_PATH = BACKEND_ROOT / "apps" / "chat" / "models" / "chat_model.py"
CHAT_CRUD_PATH = BACKEND_ROOT / "apps" / "chat" / "curd" / "chat.py"


def parse_source(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"))


def find_class(tree: ast.Module, name: str) -> ast.ClassDef:
    for node in tree.body:
        if isinstance(node, ast.ClassDef) and node.name == name:
            return node
    raise AssertionError(f"{name} not found")


def find_function(tree: ast.Module, name: str) -> ast.FunctionDef:
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    raise AssertionError(f"{name} not found")


def class_annotations(class_node: ast.ClassDef) -> dict[str, str]:
    return {
        node.target.id: ast.unparse(node.annotation)
        for node in class_node.body
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
    }


def normalized_source(node_or_text: ast.AST | str) -> str:
    source = ast.unparse(node_or_text) if isinstance(node_or_text, ast.AST) else node_or_text
    return "".join(source.split())


class SqlbotNewDerivedMessageContractTest(unittest.TestCase):
    def test_context_switch_create_keeps_event_type_unrestricted(self):
        create_model = find_class(parse_source(CHAT_MODEL_PATH), "SqlbotNewContextSwitchCreate")
        annotations = class_annotations(create_model)

        self.assertEqual(annotations.get("event_type"), "str")

    def test_context_switch_create_keeps_event_payload_generic_dict(self):
        create_model = find_class(parse_source(CHAT_MODEL_PATH), "SqlbotNewContextSwitchCreate")
        annotations = class_annotations(create_model)

        self.assertEqual(annotations.get("event_payload"), "Optional[dict]")

    def test_chat_session_event_keeps_event_payload_generic_dict(self):
        event_model = find_class(parse_source(CHAT_MODEL_PATH), "ChatSessionEvent")
        annotations = class_annotations(event_model)

        self.assertEqual(annotations.get("event_payload"), "Optional[dict]")

    def test_create_sqlbot_new_event_persists_payload_without_event_type_whitelist(self):
        create_event = find_function(parse_source(CHAT_CRUD_PATH), "create_sqlbot_new_event")
        source = normalized_source(create_event)

        self.assertIn("**payload.model_dump()", source)
        self.assertNotIn("derived_question", source)
        self.assertNotIn("derived_answer", source)
        self.assertNotIn("event_typein", source)
        self.assertNotIn("event_typenotin", source)

    def test_sqlbot_new_derived_events_are_not_special_cased_by_backend(self):
        create_event = find_function(parse_source(CHAT_CRUD_PATH), "create_sqlbot_new_event")
        source = normalized_source(create_event)

        self.assertIn("**payload.model_dump()", source)
        self.assertNotIn("ifpayload.event_type", source)
        self.assertNotIn("elifpayload.event_type", source)
        self.assertNotIn("derived_question", source)
        self.assertNotIn("derived_answer", source)


if __name__ == "__main__":
    unittest.main()
