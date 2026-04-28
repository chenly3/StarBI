#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="${STATE_FILE:-$ROOT_DIR/tmp/agent-browser-state.json}"
DE_BASE="${DE_BASE:-http://127.0.0.1:8080/api}"
SQLBOT_BASE="${SQLBOT_BASE:-http://127.0.0.1:8000/api/v1}"
ASSISTANT_ID="${ASSISTANT_ID:-1}"
WORKSPACE_OID="${WORKSPACE_OID:-1}"
SUMMARY_JSON="${SUMMARY_JSON:-$ROOT_DIR/tmp/sqlbot_multi_flow_regression_summary.json}"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "Missing browser state file: $STATE_FILE" >&2
  exit 1
fi

read_admin_token() {
  python3 - "$STATE_FILE" <<'PY'
import json, sys
state = json.load(open(sys.argv[1]))
for origin in state.get("origins", []):
    if origin.get("origin") == "http://127.0.0.1:8080":
        store = {item["name"]: item["value"] for item in origin.get("localStorage", [])}
        raw = store.get("user.token")
        if not raw:
            continue
        print(json.loads(json.loads(raw)["v"]))
        break
PY
}

DE_ADMIN_TOKEN="${DE_ADMIN_TOKEN:-$(read_admin_token)}"
if [[ -z "$DE_ADMIN_TOKEN" ]]; then
  echo "Unable to resolve admin token from browser state." >&2
  exit 1
fi

curl_json() {
  local method="$1"
  local url="$2"
  local body="${3-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" \
      -H "X-DE-TOKEN: $DE_ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      --data "$body"
  else
    curl -sS -X "$method" "$url" \
      -H "X-DE-TOKEN: $DE_ADMIN_TOKEN"
  fi
}

ASSISTANT_TOKEN="$(curl -sS "$SQLBOT_BASE/system/assistant/validator?id=$ASSISTANT_ID&external_user_id=1&workspace_oid=$WORKSPACE_OID" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["token"])')"

if [[ -z "$ASSISTANT_TOKEN" ]]; then
  echo "Unable to resolve SQLBot assistant token." >&2
  exit 1
fi

run_flow() {
  local name="$1"
  local dataset_id="$2"
  local datasource_id="$3"
  local entry_scene="$4"
  local question="$5"

  local cert
  cert="$(python3 - "$DE_ADMIN_TOKEN" "$dataset_id" "$datasource_id" "$entry_scene" <<'PY'
import base64
import json
import sys
import urllib.parse

de_token, dataset_id, datasource_id, entry_scene = sys.argv[1:5]
payload = [
    {"target": "header", "key": "X-DE-TOKEN", "value": de_token},
    {"target": "param", "key": "datasetIds", "value": dataset_id},
    {"target": "param", "key": "dsId", "value": datasource_id},
    {"target": "param", "key": "entryScene", "value": entry_scene},
]
print(base64.b64encode(urllib.parse.quote(json.dumps(payload, ensure_ascii=False)).encode()).decode())
PY
)"

  local start_json chat_id stream_file
  start_json="$(curl -sS -X POST "$SQLBOT_BASE/chat/assistant/start" \
    -H "X-SQLBOT-ASSISTANT-TOKEN: Assistant $ASSISTANT_TOKEN" \
    -H "X-SQLBOT-ASSISTANT-CERTIFICATE: $cert" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    --data '{}')"
  chat_id="$(printf '%s' "$start_json" | python3 -c 'import sys,json; payload=json.load(sys.stdin); print(payload["data"]["id"] if "data" in payload else payload["id"])')"

  stream_file="$(mktemp)"
  curl -sS -N -X POST "$SQLBOT_BASE/chat/question" \
    -H "X-SQLBOT-ASSISTANT-TOKEN: Assistant $ASSISTANT_TOKEN" \
    -H "X-SQLBOT-ASSISTANT-CERTIFICATE: $cert" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    --data "$(python3 - "$question" "$chat_id" "$datasource_id" <<'PY'
import json
import sys

question, chat_id, datasource_id = sys.argv[1:4]
print(json.dumps({
    "question": question,
    "chat_id": int(chat_id),
    "datasource_id": datasource_id,
    "ai_modal_id": "7449064884387450880"
}, ensure_ascii=False))
PY
)" >"$stream_file"

  python3 - "$name" "$dataset_id" "$stream_file" <<'PY'
import json, sys
name, dataset_id, stream_path = sys.argv[1:4]
raw = open(stream_path).read()
events = []
for block in raw.split("\n\n"):
    block = block.strip()
    if not block:
        continue
    line = next((item for item in block.splitlines() if item.startswith("data:")), "")
    if not line:
        continue
    try:
        events.append(json.loads(line.replace("data:", "", 1).strip()))
    except Exception:
        pass

event_types = [event.get("type") for event in events]
summary = {
    "name": name,
    "datasetId": dataset_id,
    "success": "finish" in event_types and any(event.get("type") == "chart" for event in events),
    "chatId": next((event.get("id") for event in events if event.get("type") == "id"), None),
    "hasFinish": "finish" in event_types,
    "hasChart": any(event.get("type") == "chart" for event in events),
    "sql": next((event.get("content") for event in events if event.get("type") == "sql"), ""),
    "chart": next((event.get("content") for event in events if event.get("type") == "chart"), ""),
    "error": next((event for event in reversed(events) if event.get("type") == "error"), None),
}
print(json.dumps(summary, ensure_ascii=False))
PY

  rm -f "$stream_file"
}

THEME_JSON="$(curl_json GET "$DE_BASE/ai/query/themes")"

python3 - "$THEME_JSON" <<'PY' >/dev/null
import json, sys
payload = json.loads(sys.argv[1])
items = payload.get("data", payload)
required = {
    "Codex 单数据集主题_20260426_013923": ["985189053949415424"],
    "Codex 公有云主题_20260426_013923": ["9001"],
    "Codex 组合数据集主题_20260426_013923": ["1245591864501997568"],
}
for name, expected_ids in required.items():
    match = next((item for item in items if item.get("name") == name), None)
    if not match:
        raise SystemExit(f"Missing theme: {name}")
    dataset_ids = [str(item) for item in match.get("datasetIds", [])]
    for expected in expected_ids:
        if expected not in dataset_ids:
            raise SystemExit(f"Theme {name} missing datasetId {expected}")
PY

single_json="$(run_flow "single-dataset" "985189053949415424" "985188400292302848" "dataset_query" "按店铺统计销售额")"
public_json="$(run_flow "public-cloud-theme" "9001" "9001" "dataset_query" "按账号统计应付金额")"
combo_json="$(run_flow "combo-dataset" "1245591864501997568" "985188400292302848" "dataset_combination_query" "按门店统计销售额")"

python3 - "$SUMMARY_JSON" "$single_json" "$public_json" "$combo_json" <<'PY'
import json, sys
summary_path = sys.argv[1]
flows = [json.loads(arg) for arg in sys.argv[2:]]
result = {
    "themeCheck": "passed",
    "flows": flows,
    "allPassed": all(flow.get("success") for flow in flows),
}
with open(summary_path, "w") as fh:
    json.dump(result, fh, ensure_ascii=False, indent=2)
print(json.dumps(result, ensure_ascii=False, indent=2))
if not result["allPassed"]:
    raise SystemExit(1)
PY
