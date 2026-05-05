import os
from typing import Optional

from sqlmodel import Session

from apps.system.models.system_model import AssistantModel
from common.utils.time import get_timestamp

DEFAULT_STARBI_ASSISTANT_ID = 1


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name) or default).strip()


def _env_present(name: str) -> bool:
    return bool((os.getenv(name) or "").strip())


def build_default_starbi_assistant() -> AssistantModel:
    return AssistantModel(
        id=int(_env("STARBI_SQLBOT_ASSISTANT_ID", str(DEFAULT_STARBI_ASSISTANT_ID))),
        name=_env("STARBI_SQLBOT_ASSISTANT_NAME", "StarBI"),
        type=4,
        domain=_env("STARBI_PUBLIC_URL", "http://localhost:9080"),
        configuration='{"oid":1}',
        description="StarBI default assistant",
        create_time=get_timestamp(),
        app_id=_env("STARBI_SQLBOT_ASSISTANT_APP_ID", "starbi"),
        app_secret=_env("STARBI_SQLBOT_ASSISTANT_SECRET"),
        oid=1,
    )


def ensure_default_starbi_assistant(session: Optional[Session] = None) -> AssistantModel:
    assistant = build_default_starbi_assistant()

    def _ensure(current_session: Session) -> AssistantModel:
        existing = current_session.get(AssistantModel, assistant.id)
        if existing:
            changed = False
            if _env_present("STARBI_SQLBOT_ASSISTANT_SECRET") and existing.app_secret != assistant.app_secret:
                existing.app_secret = assistant.app_secret
                changed = True
            elif not existing.app_secret:
                existing.app_secret = assistant.app_secret
                changed = True
            if not existing.app_id:
                existing.app_id = assistant.app_id
                changed = True
            if existing.type != assistant.type:
                existing.type = assistant.type
                changed = True
            if _env_present("STARBI_PUBLIC_URL") and existing.domain != assistant.domain:
                existing.domain = assistant.domain
                changed = True
            elif not existing.domain:
                existing.domain = assistant.domain
                changed = True
            if existing.oid is None:
                existing.oid = assistant.oid
                changed = True
            if changed:
                current_session.add(existing)
            return existing
        current_session.add(assistant)
        return assistant

    if session is not None:
        return _ensure(session)

    from common.core.db import engine
    from common.utils.utils import SQLBotLogUtil

    with Session(engine) as current_session:
        ensured = _ensure(current_session)
        current_session.commit()
        current_session.refresh(ensured)
        SQLBotLogUtil.info("StarBI default SQLBot assistant ready: id=%s", ensured.id)
        return ensured
