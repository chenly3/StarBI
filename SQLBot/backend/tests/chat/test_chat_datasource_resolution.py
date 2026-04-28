import importlib
import sys
import types
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def load_chat_crud(monkeypatch):
    datasource_crud = types.ModuleType("apps.datasource.crud.datasource")
    datasource_crud.get_ds = lambda session, ds_id: None
    monkeypatch.setitem(sys.modules, "apps.datasource.crud.datasource", datasource_crud)

    recommended_problem = types.ModuleType("apps.datasource.crud.recommended_problem")
    recommended_problem.get_datasource_recommended_chart = lambda *args, **kwargs: []
    monkeypatch.setitem(sys.modules, "apps.datasource.crud.recommended_problem", recommended_problem)

    datasource_model = types.ModuleType("apps.datasource.models.datasource")

    class CoreDatasource:
        pass

    datasource_model.CoreDatasource = CoreDatasource
    monkeypatch.setitem(sys.modules, "apps.datasource.models.datasource", datasource_model)

    db_module = types.ModuleType("apps.db.db")
    db_module.exec_sql = lambda *args, **kwargs: {}
    monkeypatch.setitem(sys.modules, "apps.db.db", db_module)

    assistant_crud = types.ModuleType("apps.system.crud.assistant")

    class AssistantOutDs:
        pass

    class AssistantOutDsFactory:
        @staticmethod
        def get_instance(current_assistant):
            return None

    assistant_crud.AssistantOutDs = AssistantOutDs
    assistant_crud.AssistantOutDsFactory = AssistantOutDsFactory
    monkeypatch.setitem(sys.modules, "apps.system.crud.assistant", assistant_crud)

    sys.modules.pop("apps.chat.curd.chat", None)
    return importlib.import_module("apps.chat.curd.chat")


def test_resolve_chat_datasource_tolerates_missing_dynamic_datasource(monkeypatch):
    chat_crud = load_chat_crud(monkeypatch)

    class MissingDatasourceResolver:
        def get_ds(self, datasource_id, trans=None):
            raise Exception(f"Datasource id {datasource_id} is not found")

    monkeypatch.setattr(chat_crud, "dynamic_ds_types", [99])
    monkeypatch.setattr(
        chat_crud.AssistantOutDsFactory,
        "get_instance",
        lambda current_assistant: MissingDatasourceResolver(),
    )

    datasource = chat_crud.resolve_chat_datasource(
        session=types.SimpleNamespace(),
        chat=types.SimpleNamespace(datasource=9001),
        current_assistant=types.SimpleNamespace(type=99),
    )

    assert datasource is None


def test_resolve_chat_datasource_tolerates_missing_local_datasource(monkeypatch):
    chat_crud = load_chat_crud(monkeypatch)

    class MissingDatasourceSession:
        def get(self, model, datasource_id):
            raise Exception(f"Datasource id {datasource_id} is not found")

    datasource = chat_crud.resolve_chat_datasource(
        session=MissingDatasourceSession(),
        chat=types.SimpleNamespace(datasource=9001),
        current_assistant=types.SimpleNamespace(type=0),
    )

    assert datasource is None
