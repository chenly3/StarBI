# SQLBot New Database Persisted History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `sqlbot-new` enhanced history semantics from browser cache into SQLBot database using snapshot + event persistence, so new sessions restore from the backend as the single source of truth.

**Architecture:** Keep legacy `chat` and `chat_record` semantics untouched. Add two SQLBot-side persistence tables for `sqlbot-new`: one append-only event table for context changes and one upserted snapshot table for fast restore and current active context. Refactor the DataEase frontend to read and write these SQLBot-backed APIs instead of `localStorage`.

**Tech Stack:** SQLModel, Alembic, FastAPI, PostgreSQL JSONB, Vue 3 Composition API, TypeScript, existing SQLBot chat APIs, existing DataEase `sqlbot-new` view modules.

---

## File Structure

**Modify**
- `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/models/chat_model.py`
  Purpose: add `sqlbot-new` snapshot/event SQLModel tables plus request/response models.
- `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/curd/chat.py`
  Purpose: add CRUD for snapshot upsert, event append, history list, and context restore.
- `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/api/chat.py`
  Purpose: expose `sqlbot-new` history/context/snapshot/context-switch APIs.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
  Purpose: add frontend API bindings to new SQLBot endpoints.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
  Purpose: stop using browser cache as history truth, call backend snapshot/event APIs, and restore from backend.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`
  Purpose: load history strictly from backend and pass restore metadata into selection restore.
- `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`
  Purpose: accept restored file/dataset metadata from backend and rebuild active selection state.

**Create**
- `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/alembic/versions/<timestamp>_add_sqlbot_new_history_tables.py`
  Purpose: create `chat_session_snapshot` and `chat_session_event`.

**Verification**
- Backend migration + targeted API tests + frontend ESLint + browser verification.
- No Git operations. Do not run `git add`, `git commit`, or any other git write command.

---

### Task 1: Add SQLBot-side persistence tables

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/models/chat_model.py`
- Create: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/alembic/versions/<timestamp>_add_sqlbot_new_history_tables.py`

- [ ] **Step 1: Add the new SQLModel table definitions**

```python
class ChatSessionSnapshot(SQLModel, table=True):
    __tablename__ = "chat_session_snapshot"

    chat_id: int = Field(sa_column=Column(BigInteger, ForeignKey("chat.id"), primary_key=True))
    client_type: str = Field(sa_column=Column(String(32), nullable=False, default="sqlbot_new"))
    active_source_kind: str = Field(sa_column=Column(String(16), nullable=False))
    active_source_id: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    active_datasource_id: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    active_model_id: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    active_theme_id: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    active_theme_name: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    selection_title: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    selection_meta: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    datasource_pending: bool = Field(sa_column=Column(Boolean, nullable=False, default=False))
    latest_record_id: Optional[int] = Field(sa_column=Column(BigInteger, nullable=True))
    latest_question: Optional[str] = Field(sa_column=Column(Text, nullable=True))
    snapshot_version: int = Field(sa_column=Column(Integer, nullable=False, default=1))
    create_by: int = Field(sa_column=Column(BigInteger, nullable=False))
    create_time: datetime = Field(sa_column=Column(DateTime(timezone=False), nullable=False))
    update_time: datetime = Field(sa_column=Column(DateTime(timezone=False), nullable=False))


class ChatSessionEvent(SQLModel, table=True):
    __tablename__ = "chat_session_event"

    id: Optional[int] = Field(sa_column=Column(BigInteger, Identity(always=True), primary_key=True))
    chat_id: int = Field(sa_column=Column(BigInteger, ForeignKey("chat.id"), nullable=False))
    client_type: str = Field(sa_column=Column(String(32), nullable=False, default="sqlbot_new"))
    event_type: str = Field(sa_column=Column(String(32), nullable=False))
    record_id: Optional[int] = Field(sa_column=Column(BigInteger, nullable=True))
    source_kind: Optional[str] = Field(sa_column=Column(String(16), nullable=True))
    source_id: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    datasource_id: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    model_id: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    theme_id: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    theme_name: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    selection_title: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    selection_meta: Optional[str] = Field(sa_column=Column(String(255), nullable=True))
    datasource_pending: bool = Field(sa_column=Column(Boolean, nullable=False, default=False))
    event_payload: Optional[dict] = Field(sa_column=Column(JSONB, nullable=True))
    create_by: int = Field(sa_column=Column(BigInteger, nullable=False))
    create_time: datetime = Field(sa_column=Column(DateTime(timezone=False), nullable=False))
```

- [ ] **Step 2: Add Pydantic models for the new APIs**

```python
class SqlbotNewSnapshotUpsert(BaseModel):
    active_source_kind: str
    active_source_id: str = ""
    active_datasource_id: str = ""
    active_model_id: str = ""
    active_theme_id: str = ""
    active_theme_name: str = ""
    selection_title: str = ""
    selection_meta: str = ""
    datasource_pending: bool = False
    latest_record_id: Optional[int] = None
    latest_question: str = ""


class SqlbotNewContextSwitchCreate(BaseModel):
    event_type: str = "context_switch"
    record_id: Optional[int] = None
    source_kind: str
    source_id: str = ""
    datasource_id: str = ""
    model_id: str = ""
    theme_id: str = ""
    theme_name: str = ""
    selection_title: str = ""
    selection_meta: str = ""
    datasource_pending: bool = False
    event_payload: Optional[dict] = None


class SqlbotNewHistoryEntry(BaseModel):
    chat_id: int
    title: str
    subtitle: str
    updated_at: datetime
    query_mode: str
    source_id: str = ""
    datasource_id: str = ""
    model_id: str = ""
    selection_title: str = ""
    selection_meta: str = ""
    datasource_pending: bool = False


class SqlbotNewContextPayload(BaseModel):
    snapshot: Optional[ChatSessionSnapshot] = None
    events: list[ChatSessionEvent] = []
```

- [ ] **Step 3: Write the Alembic migration**

```python
def upgrade() -> None:
    op.create_table(
        "chat_session_snapshot",
        sa.Column("chat_id", sa.BigInteger(), sa.ForeignKey("chat.id"), primary_key=True),
        sa.Column("client_type", sa.String(length=32), nullable=False, server_default="sqlbot_new"),
        sa.Column("active_source_kind", sa.String(length=16), nullable=False),
        sa.Column("active_source_id", sa.String(length=255), nullable=True),
        sa.Column("active_datasource_id", sa.String(length=255), nullable=True),
        sa.Column("active_model_id", sa.String(length=255), nullable=True),
        sa.Column("active_theme_id", sa.String(length=255), nullable=True),
        sa.Column("active_theme_name", sa.String(length=255), nullable=True),
        sa.Column("selection_title", sa.String(length=255), nullable=True),
        sa.Column("selection_meta", sa.String(length=255), nullable=True),
        sa.Column("datasource_pending", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("latest_record_id", sa.BigInteger(), nullable=True),
        sa.Column("latest_question", sa.Text(), nullable=True),
        sa.Column("snapshot_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("create_by", sa.BigInteger(), nullable=False),
        sa.Column("create_time", sa.DateTime(timezone=False), nullable=False),
        sa.Column("update_time", sa.DateTime(timezone=False), nullable=False),
    )
    op.create_table(
        "chat_session_event",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column("chat_id", sa.BigInteger(), sa.ForeignKey("chat.id"), nullable=False),
        sa.Column("client_type", sa.String(length=32), nullable=False, server_default="sqlbot_new"),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("record_id", sa.BigInteger(), nullable=True),
        sa.Column("source_kind", sa.String(length=16), nullable=True),
        sa.Column("source_id", sa.String(length=255), nullable=True),
        sa.Column("datasource_id", sa.String(length=255), nullable=True),
        sa.Column("model_id", sa.String(length=255), nullable=True),
        sa.Column("theme_id", sa.String(length=255), nullable=True),
        sa.Column("theme_name", sa.String(length=255), nullable=True),
        sa.Column("selection_title", sa.String(length=255), nullable=True),
        sa.Column("selection_meta", sa.String(length=255), nullable=True),
        sa.Column("datasource_pending", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("event_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("create_by", sa.BigInteger(), nullable=False),
        sa.Column("create_time", sa.DateTime(timezone=False), nullable=False),
    )
    op.create_index("ix_chat_session_event_chat_id_create_time", "chat_session_event", ["chat_id", "create_time"])


def downgrade() -> None:
    op.drop_index("ix_chat_session_event_chat_id_create_time", table_name="chat_session_event")
    op.drop_table("chat_session_event")
    op.drop_table("chat_session_snapshot")
```

- [ ] **Step 4: Run migration to verify schema creation**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/alembic upgrade head
```

Expected:

```text
INFO  [alembic.runtime.migration] Running upgrade ...
```

- [ ] **Step 5: No Git step**

Do not run any git write command. User explicitly requested no git operations.

---

### Task 2: Add backend CRUD for snapshot/event persistence

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/curd/chat.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/models/chat_model.py`

- [ ] **Step 1: Add a snapshot upsert helper**

```python
def upsert_sqlbot_new_snapshot(
    session: SessionDep,
    current_user: CurrentUser,
    chat_id: int,
    payload: SqlbotNewSnapshotUpsert,
) -> ChatSessionSnapshot:
    snapshot = session.get(ChatSessionSnapshot, chat_id)
    now = datetime.datetime.now()

    if snapshot is None:
        snapshot = ChatSessionSnapshot(
            chat_id=chat_id,
            client_type="sqlbot_new",
            create_by=current_user.id,
            create_time=now,
            update_time=now,
            **payload.model_dump(),
        )
        session.add(snapshot)
    else:
        for key, value in payload.model_dump().items():
            setattr(snapshot, key, value)
        snapshot.update_time = now

    session.flush()
    session.refresh(snapshot)
    session.commit()
    return snapshot
```

- [ ] **Step 2: Add an event append helper**

```python
def create_sqlbot_new_event(
    session: SessionDep,
    current_user: CurrentUser,
    chat_id: int,
    payload: SqlbotNewContextSwitchCreate,
) -> ChatSessionEvent:
    event = ChatSessionEvent(
        chat_id=chat_id,
        client_type="sqlbot_new",
        create_by=current_user.id,
        create_time=datetime.datetime.now(),
        **payload.model_dump(),
    )
    session.add(event)
    session.flush()
    session.refresh(event)
    session.commit()
    return event
```

- [ ] **Step 3: Add history-list query helper**

```python
def list_sqlbot_new_histories(session: SessionDep, current_user: CurrentUser) -> list[SqlbotNewHistoryEntry]:
    stmt = (
        select(ChatSessionSnapshot, Chat)
        .join(Chat, Chat.id == ChatSessionSnapshot.chat_id)
        .where(
            and_(
                ChatSessionSnapshot.client_type == "sqlbot_new",
                Chat.create_by == current_user.id,
                Chat.oid == (current_user.oid if current_user.oid is not None else 1),
            )
        )
        .order_by(ChatSessionSnapshot.update_time.desc())
    )
    rows = session.exec(stmt).all()
    return [
        SqlbotNewHistoryEntry(
            chat_id=chat.id,
            title=snapshot.selection_title or chat.brief or f"历史问数 {chat.id}",
            subtitle=snapshot.selection_meta or snapshot.selection_title or "",
            updated_at=snapshot.update_time,
            query_mode=snapshot.active_source_kind,
            source_id=snapshot.active_source_id or "",
            datasource_id=snapshot.active_datasource_id or "",
            model_id=snapshot.active_model_id or "",
            selection_title=snapshot.selection_title or "",
            selection_meta=snapshot.selection_meta or "",
            datasource_pending=snapshot.datasource_pending,
        )
        for snapshot, chat in rows
    ]
```

- [ ] **Step 4: Add context restore query helper**

```python
def get_sqlbot_new_context(
    session: SessionDep,
    current_user: CurrentUser,
    chat_id: int,
) -> SqlbotNewContextPayload:
    chat = session.get(Chat, chat_id)
    if not chat or chat.create_by != current_user.id:
        raise Exception(f"Chat with id {chat_id} not found")

    snapshot = session.get(ChatSessionSnapshot, chat_id)
    stmt = (
        select(ChatSessionEvent)
        .where(
            and_(
                ChatSessionEvent.chat_id == chat_id,
                ChatSessionEvent.client_type == "sqlbot_new",
            )
        )
        .order_by(ChatSessionEvent.create_time)
    )
    events = list(session.exec(stmt).all())
    return SqlbotNewContextPayload(snapshot=snapshot, events=events)
```

- [ ] **Step 5: Run a focused backend import check**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/python -m compileall apps/chat
```

Expected:

```text
Listing 'apps/chat'...
```

- [ ] **Step 6: No Git step**

Do not run any git write command.

---

### Task 3: Expose SQLBot-side APIs for `sqlbot-new`

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/api/chat.py`
- Modify: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend/apps/chat/curd/chat.py`

- [ ] **Step 1: Import the new CRUD helpers and request/response types**

```python
from apps.chat.curd.chat import (
    list_sqlbot_new_histories,
    get_sqlbot_new_context,
    upsert_sqlbot_new_snapshot,
    create_sqlbot_new_event,
)
from apps.chat.models.chat_model import (
    SqlbotNewSnapshotUpsert,
    SqlbotNewContextSwitchCreate,
    SqlbotNewHistoryEntry,
    SqlbotNewContextPayload,
)
```

- [ ] **Step 2: Add the history list endpoint**

```python
@router.get("/sqlbot-new/history", response_model=list[SqlbotNewHistoryEntry])
async def sqlbot_new_history(session: SessionDep, current_user: CurrentUser):
    return list_sqlbot_new_histories(session, current_user)
```

- [ ] **Step 3: Add the context restore endpoint**

```python
@router.get("/{chat_id}/sqlbot-new/context", response_model=SqlbotNewContextPayload)
async def sqlbot_new_context(session: SessionDep, current_user: CurrentUser, chat_id: int):
    return get_sqlbot_new_context(session, current_user, chat_id)
```

- [ ] **Step 4: Add the context switch endpoint**

```python
@router.post("/{chat_id}/sqlbot-new/context-switch", response_model=ChatSessionEvent)
async def sqlbot_new_context_switch(
    session: SessionDep,
    current_user: CurrentUser,
    chat_id: int,
    payload: SqlbotNewContextSwitchCreate,
):
    event = create_sqlbot_new_event(session, current_user, chat_id, payload)
    upsert_sqlbot_new_snapshot(
        session,
        current_user,
        chat_id,
        SqlbotNewSnapshotUpsert(
            active_source_kind=payload.source_kind,
            active_source_id=payload.source_id,
            active_datasource_id=payload.datasource_id,
            active_model_id=payload.model_id,
            active_theme_id=payload.theme_id,
            active_theme_name=payload.theme_name,
            selection_title=payload.selection_title,
            selection_meta=payload.selection_meta,
            datasource_pending=payload.datasource_pending,
        ),
    )
    return event
```

- [ ] **Step 5: Add the snapshot upsert endpoint**

```python
@router.post("/{chat_id}/sqlbot-new/snapshot", response_model=ChatSessionSnapshot)
async def sqlbot_new_snapshot(
    session: SessionDep,
    current_user: CurrentUser,
    chat_id: int,
    payload: SqlbotNewSnapshotUpsert,
):
    return upsert_sqlbot_new_snapshot(session, current_user, chat_id, payload)
```

- [ ] **Step 6: Run a backend route import verification**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/python -m compileall apps/chat/api/chat.py apps/chat/curd/chat.py apps/chat/models/chat_model.py
```

Expected:

```text
Compiling 'apps/chat/api/chat.py'...
```

- [ ] **Step 7: No Git step**

Do not run any git write command.

---

### Task 4: Add DataEase frontend API bindings

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot/sqlbotDirect.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/types.ts`

- [ ] **Step 1: Add frontend DTOs for backend history/context**

```ts
export interface SQLBotNewPersistedHistoryEntry {
  chatId: number
  title: string
  subtitle: string
  updatedAt: string
  queryMode: 'dataset' | 'file'
  sourceId: string
  datasourceId: string
  modelId: string
  selectionTitle: string
  selectionMeta: string
  datasourcePending: boolean
}

export interface SQLBotNewPersistedContextEvent {
  id: number
  eventType: 'session_init' | 'context_switch' | 'selection_update'
  recordId?: number
  sourceKind?: 'dataset' | 'file'
  sourceId?: string
  datasourceId?: string
  modelId?: string
  themeId?: string
  themeName?: string
  selectionTitle?: string
  selectionMeta?: string
  datasourcePending?: boolean
  eventPayload?: Record<string, any>
  createTime: string
}

export interface SQLBotNewPersistedContextPayload {
  snapshot?: Record<string, any>
  events: SQLBotNewPersistedContextEvent[]
}
```

- [ ] **Step 2: Add the history list API call**

```ts
export const getSQLBotNewHistory = async (context: SQLBotRequestContext) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/sqlbot-new/history`,
    {
      method: 'GET',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  return unwrapSqlBotResponse<SQLBotNewPersistedHistoryEntry[]>(response)
}
```

- [ ] **Step 3: Add the context restore API call**

```ts
export const getSQLBotNewHistoryContext = async (
  context: SQLBotRequestContext,
  chatId: number
) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/sqlbot-new/context`,
    {
      method: 'GET',
      headers: buildAssistantHeaders(context, 'text/plain')
    }
  )
  return unwrapSqlBotResponse<SQLBotNewPersistedContextPayload>(response)
}
```

- [ ] **Step 4: Add the context switch and snapshot write APIs**

```ts
export const createSQLBotNewContextSwitch = async (
  context: SQLBotRequestContext,
  chatId: number,
  payload: Record<string, any>
) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/sqlbot-new/context-switch`,
    {
      method: 'POST',
      headers: buildAssistantHeaders(context),
      body: JSON.stringify(payload)
    }
  )
  return unwrapSqlBotResponse<Record<string, any>>(response)
}

export const upsertSQLBotNewSnapshot = async (
  context: SQLBotRequestContext,
  chatId: number,
  payload: Record<string, any>
) => {
  const response = await fetchSqlBotWithFallback(
    context.domain,
    base => `${base}/chat/${chatId}/sqlbot-new/snapshot`,
    {
      method: 'POST',
      headers: buildAssistantHeaders(context),
      body: JSON.stringify(payload)
    }
  )
  return unwrapSqlBotResponse<Record<string, any>>(response)
}
```

- [ ] **Step 5: Run ESLint on touched frontend API files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot/sqlbotDirect.ts src/views/sqlbot-new/types.ts
```

Expected:

```text
(no output)
```

- [ ] **Step 6: No Git step**

Do not run any git write command.

---

### Task 5: Refactor `sqlbot-new` history list to database truth

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewHistory.ts`

- [ ] **Step 1: Remove browser-cache history reads from `fetchHistoryEntries`**

Replace the current snapshot-merge shape with:

```ts
const fetchHistoryEntries = async () => {
  await loadEmbedConfig()
  if (!embedAvailable.value) {
    return [] as SqlbotNewHistoryEntry[]
  }
  await ensureRuntimeModelsLoaded()

  const assistantToken = await ensureAssistantToken(
    activeExecutionContext.value || {
      queryMode: 'dataset',
      sourceId: '',
      datasourceId: '',
      modelId: '',
      datasourcePending: false
    }
  )

  const histories = await getSQLBotNewHistory(buildHistoryRequestContext(assistantToken))
  return histories.map(item => ({
    id: String(item.chatId),
    title: item.title,
    subtitle: item.subtitle,
    time: formatHistoryTime(item.updatedAt),
    updatedAt: new Date(item.updatedAt).getTime(),
    backendChatId: item.chatId,
    themeId: '',
    themeName: '',
    queryMode: item.queryMode,
    sourceId: item.sourceId,
    datasourceId: item.datasourceId,
    modelId: item.modelId,
    datasourcePending: item.datasourcePending,
    selectionTitle: item.selectionTitle,
    selectionMeta: item.selectionMeta,
    lastQuestion: ''
  }))
}
```

- [ ] **Step 2: Stop treating `localStorage` as the history source**

Delete or leave unused:

```ts
const HISTORY_SESSION_STORAGE_PREFIX = 'STARBI-AI-QUERY-SESSION-'
const readHistorySessionSnapshot = ...
const writeHistorySessionSnapshot = ...
const listHistorySessionSnapshotIds = ...
```

Target result:

```ts
// Only keep ACTIVE_SESSION_STORAGE_KEY for transient page state if still needed.
const ACTIVE_SESSION_STORAGE_KEY = 'STARBI-AI-QUERY-ACTIVE-SESSION'
```

- [ ] **Step 3: Keep `useSqlbotNewHistory` bound to backend-loaded history only**

In `useSqlbotNewHistory.ts`, make the merged list logic rely on backend entries and optional current in-memory conversation only for the live page, not for persistence:

```ts
const mergedHistoryItems = computed(() => {
  const currentConversationEntry = getCurrentConversationHistoryEntry?.()
  if (!currentConversationEntry) {
    return historyItems.value
  }
  const fallbackItem = normalizeHistoryItems([currentConversationEntry])[0]
  const nextItems = historyItems.value.filter(item => item.id !== fallbackItem.id)
  return [fallbackItem, ...nextItems].sort((left, right) => {
    return Number(right.payload.updatedAt || 0) - Number(left.payload.updatedAt || 0)
  })
})
```

- [ ] **Step 4: Run ESLint on the refactored history files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot-new/useSqlbotNewConversation.ts src/views/sqlbot-new/useSqlbotNewHistory.ts
```

Expected:

```text
(no output)
```

- [ ] **Step 5: No Git step**

Do not run any git write command.

---

### Task 6: Refactor history restore to snapshot + event replay

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewSelection.ts`

- [ ] **Step 1: Load backend context during restore**

In `restoreHistorySession`, replace `readHistorySessionSnapshot` with:

```ts
const assistantToken = await ensureAssistantToken(
  activeExecutionContext.value || {
    queryMode: entry.queryMode,
    sourceId: entry.sourceId,
    datasourceId: entry.datasourceId,
    modelId: entry.modelId,
    datasourcePending: entry.datasourcePending
  }
)
const contextPayload = await getSQLBotNewHistoryContext(
  buildHistoryRequestContext(assistantToken),
  Number(entry.id)
)
```

- [ ] **Step 2: Rebuild context-switch records from backend events**

```ts
const eventRecords = (contextPayload.events || [])
  .filter(event => event.eventType === 'context_switch')
  .map(event =>
    createContextSwitchRecord(
      repairRestoredExecutionContext({
        themeId: event.themeId || '',
        themeName: event.themeName || '',
        queryMode: (event.sourceKind || 'dataset') as SourceKind,
        sourceId: event.sourceId || '',
        datasourceId: event.datasourceId || '',
        modelId: event.modelId || '',
        datasourcePending: Boolean(event.datasourcePending)
      }),
      event.selectionTitle || '',
      event.selectionMeta || ''
    )
  )
```

- [ ] **Step 3: Merge backend events with backend `chat_record` detail**

```ts
const normalizedDetailSession = normalizeConversationSession(detail, resolvedExecutionContext)
conversationSession.value = {
  ...normalizedDetailSession,
  records: mergeConversationRecordsWithSnapshot(
    normalizedDetailSession.records,
    eventRecords,
    resolvedExecutionContext
  )
}
```

Update `mergeConversationRecordsWithSnapshot` so it accepts event records instead of browser snapshot records:

```ts
const normalizedSnapshotRecords = snapshotRecords.map(item =>
  normalizeConversationRecord(item, executionContext)
)
```

Here `snapshotRecords` becomes “event-derived records”, not `localStorage`.

- [ ] **Step 4: Restore file selection metadata with explicit title/meta**

Update `applyRestoredSelection` call sites:

```ts
await applyRestoredSelection(
  {
    queryMode: item.payload.queryMode,
    sourceId: item.payload.sourceId,
    datasourceId: item.payload.datasourceId,
    modelId: item.payload.modelId,
    datasourcePending: item.payload.datasourcePending
  },
  {
    selectionTitle: item.payload.selectionTitle,
    selectionMeta: item.payload.selectionMeta
  }
)
```

- [ ] **Step 5: Make file restore create a fallback file chip when the item list is not ready**

Keep the current fallback shape in `useSqlbotNewSelection.ts`:

```ts
if (!matchedFile) {
  const fallbackFileId = normalizeOptionalId(executionContext.sourceId || executionContext.datasourceId)
  if (fallbackFileId) {
    const fallbackItem: FileCardItem = {
      id: fallbackFileId,
      title: fallbackTitle || '历史文件',
      uploadedAt: '',
      format: fallbackMeta.includes('CSV') ? 'CSV' : 'Excel',
      fields: [],
      datasourceId: normalizeOptionalId(executionContext.datasourceId || fallbackFileId),
      pending: true
    }
    uploadedFileItems.value = [
      fallbackItem,
      ...uploadedFileItems.value.filter(item => item.id !== fallbackFileId)
    ]
    matchedFile = fallbackItem
  }
}
```

- [ ] **Step 6: Run focused ESLint on restore files**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot-new/useSqlbotNewConversation.ts src/views/sqlbot-new/useSqlbotNewSelection.ts src/views/sqlbot-new/useSqlbotNewHistory.ts
```

Expected:

```text
(no output)
```

- [ ] **Step 7: No Git step**

Do not run any git write command.

---

### Task 7: Persist context switches and snapshots on new `sqlbot-new` actions

**Files:**
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/useSqlbotNewConversation.ts`
- Modify: `/Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend/src/views/sqlbot-new/index.vue`

- [ ] **Step 1: Persist session init after `chat/assistant/start`**

Inside `ensureChatSession`:

```ts
if (session.id) {
  await upsertSQLBotNewSnapshot(
    buildHistoryRequestContext(assistantToken),
    session.id,
    {
      active_source_kind: executionContext.queryMode,
      active_source_id: executionContext.sourceId,
      active_datasource_id: executionContext.datasourceId,
      active_model_id: executionContext.modelId,
      active_theme_id: executionContext.themeId || '',
      active_theme_name: executionContext.themeName || '',
      selection_title: restoredHistoryContext.value?.selectionTitle || '',
      selection_meta: restoredHistoryContext.value?.selectionMeta || '',
      datasource_pending: executionContext.datasourcePending,
      latest_question: '',
      latest_record_id: undefined
    }
  )
  await createSQLBotNewContextSwitch(
    buildHistoryRequestContext(assistantToken),
    session.id,
    {
      event_type: 'session_init',
      source_kind: executionContext.queryMode,
      source_id: executionContext.sourceId,
      datasource_id: executionContext.datasourceId,
      model_id: executionContext.modelId,
      theme_id: executionContext.themeId || '',
      theme_name: executionContext.themeName || '',
      selection_title: restoredHistoryContext.value?.selectionTitle || '',
      selection_meta: restoredHistoryContext.value?.selectionMeta || '',
      datasource_pending: executionContext.datasourcePending
    }
  )
}
```

- [ ] **Step 2: Persist true context switches when the user changes source**

Inside `appendContextSwitchRecord`:

```ts
if (conversationSession.value?.id) {
  const assistantToken = await ensureAssistantToken(normalizedExecutionContext)
  await createSQLBotNewContextSwitch(
    buildHistoryRequestContext(assistantToken),
    conversationSession.value.id,
    {
      event_type: 'context_switch',
      source_kind: normalizedExecutionContext.queryMode,
      source_id: normalizedExecutionContext.sourceId,
      datasource_id: normalizedExecutionContext.datasourceId,
      model_id: normalizedExecutionContext.modelId,
      theme_id: normalizedExecutionContext.themeId || '',
      theme_name: normalizedExecutionContext.themeName || '',
      selection_title: selectionTitle,
      selection_meta: selectionMeta,
      datasource_pending: normalizedExecutionContext.datasourcePending
    }
  )
}
```

- [ ] **Step 3: Persist snapshot after question completion**

At `finish` and `error` event handling sites:

```ts
if (conversationSession.value?.id) {
  const assistantToken = await ensureAssistantToken(executionContext)
  await upsertSQLBotNewSnapshot(
    buildHistoryRequestContext(assistantToken),
    conversationSession.value.id,
    {
      active_source_kind: executionContext.queryMode,
      active_source_id: executionContext.sourceId,
      active_datasource_id: executionContext.datasourceId,
      active_model_id: executionContext.modelId,
      active_theme_id: executionContext.themeId || '',
      active_theme_name: executionContext.themeName || '',
      selection_title: restoredHistoryContext.value?.selectionTitle || '',
      selection_meta: restoredHistoryContext.value?.selectionMeta || '',
      datasource_pending: executionContext.datasourcePending,
      latest_record_id: record.id,
      latest_question: record.question || ''
    }
  )
}
```

- [ ] **Step 4: Keep immediate UI updates local, but never use them as persistence**

```ts
conversationSession.value.records.push(
  createContextSwitchRecord(normalizedExecutionContext, selectionTitle, selectionMeta)
)
```

This remains for UX only. Database APIs become the source of truth.

- [ ] **Step 5: Run frontend ESLint**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease/core/core-frontend
./node_modules/.bin/eslint src/views/sqlbot-new/useSqlbotNewConversation.ts src/views/sqlbot-new/index.vue
```

Expected:

```text
(no output)
```

- [ ] **Step 6: No Git step**

Do not run any git write command.

---

### Task 8: Verify end-to-end backend truth

**Files:**
- Modify/Inspect: `/Users/chenliyong/AI/github/StarBI/dataease/dataease-web.sh`
- Inspect: `/Users/chenliyong/AI/github/StarBI/SQLBot/backend`

- [ ] **Step 1: Restart the relevant services**

Run:

```bash
cd /Users/chenliyong/AI/github/StarBI/dataease
./dataease-web.sh

cd /Users/chenliyong/AI/github/StarBI/SQLBot/backend
.venv/bin/alembic upgrade head
```

Expected:

```text
VITE v4.5.14 ready
INFO [alembic.runtime.migration] Running upgrade ...
```

- [ ] **Step 2: Verify dataset flow uses database-backed history**

Run browser verification:

```bash
agent-browser close --all
agent-browser --session sqlbotnew-db-dataset open 'http://127.0.0.1:8080/#/login?redirect=/sqlbotnew'
```

Then verify:

- one dataset question creates one history item
- switching to a second dataset updates the same history item
- history restore replays the context-switch card

- [ ] **Step 3: Verify file flow uses database-backed history**

Then verify:

- `StarBI文件问数演示` produces a `最近问数` item
- returning to homepage and reopening history restores the file context
- continuing to ask still shows `选择数据 StarBI文件问数演示`

- [ ] **Step 4: Verify browser cache is no longer required**

Manual verification steps:

```text
1. Create a new sqlbot-new session.
2. Close the page.
3. Reopen sqlbotnew after login.
4. Verify the history still comes from backend data.
5. Verify clearing browser localStorage does not affect the new session history.
```

- [ ] **Step 5: Record residual risks**

Check for:

- old `sqlbot` page untouched
- no frontend `localStorage` fallback in history truth path
- SQLBot DB snapshot/event rows written for new sessions only

- [ ] **Step 6: No Git step**

Do not run any git write command.

---

## Self-Review

- Spec coverage:
  - database tables: Task 1
  - snapshot/event CRUD: Task 2
  - backend APIs: Task 3
  - frontend API layer: Task 4
  - history list database truth: Task 5
  - history restore from snapshot + events: Task 6
  - write paths for new sessions: Task 7
  - end-to-end verification: Task 8
- Placeholder scan:
  - no `TBD` / `TODO` placeholders left
  - no “add tests later” placeholders left
- Type consistency:
  - backend request/response models use `SqlbotNewSnapshotUpsert`, `SqlbotNewContextSwitchCreate`, `SqlbotNewHistoryEntry`, `SqlbotNewContextPayload`
  - frontend API and restore steps use the same field names: `selectionTitle`, `selectionMeta`, `sourceId`, `datasourceId`, `modelId`
- Scope check:
  - limited to `sqlbot-new` enhanced history semantics only
  - legacy `sqlbot` behavior intentionally excluded

## Notes

- This plan intentionally avoids any Git step because the user explicitly requested no Git operations.
- The current browser-cache-based helpers can be deleted after backend truth is proven in Task 8; until then, keep deletions scoped to the history truth path only.

