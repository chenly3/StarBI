import ast
import unittest
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_ROOT = BACKEND_ROOT.parents[1]
CHAT_MODEL_PATH = BACKEND_ROOT / "apps" / "chat" / "models" / "chat_model.py"
CHAT_CRUD_PATH = BACKEND_ROOT / "apps" / "chat" / "curd" / "chat.py"
SQLBOT_NEW_CONVERSATION_PATH = (
    WORKSPACE_ROOT
    / "dataease"
    / "core"
    / "core-frontend"
    / "src"
    / "views"
    / "sqlbot-new"
    / "useSqlbotNewConversation.ts"
)


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


def normalized_source(node_or_text: ast.AST | str) -> str:
    source = ast.unparse(node_or_text) if isinstance(node_or_text, ast.AST) else node_or_text
    return "".join(source.split())


class SqlbotNewEmptyRecordContractTest(unittest.TestCase):
    def test_create_chat_accepts_skip_first_chat_record_flag(self):
        create_chat_model = find_class(parse_source(CHAT_MODEL_PATH), "CreateChat")
        annotations = {
            node.target.id: ast.unparse(node.annotation)
            for node in create_chat_model.body
            if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
        }

        self.assertEqual(annotations.get("skip_first_chat_record"), "bool")

    def test_create_chat_skips_first_empty_record_when_requested(self):
        create_chat = find_function(parse_source(CHAT_CRUD_PATH), "create_chat")
        source = normalized_source(create_chat)

        self.assertIn("ifrequire_datasourceanddsand(", source)
        self.assertIn("notcreate_chat_obj.skip_first_chat_record", source)

    def test_sqlbot_new_requests_no_first_empty_record(self):
        source = normalized_source(SQLBOT_NEW_CONVERSATION_PATH.read_text(encoding="utf-8"))

        self.assertIn("skip_first_chat_record:true", source)


if __name__ == "__main__":
    unittest.main()
