#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
STATE_FILE="${STATE_FILE:-$ROOT_DIR/tmp/agent-browser-state.json}"
DE_BASE="${DE_BASE:-http://127.0.0.1:8080/api}"

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
        if raw:
            print(json.loads(json.loads(raw)["v"]))
            break
PY
}

ADMIN_TOKEN="${DE_ADMIN_TOKEN:-$(read_admin_token)}"
if [[ -z "$ADMIN_TOKEN" ]]; then
  echo "Unable to resolve admin token." >&2
  exit 1
fi

curl_json() {
  local method="$1"
  local url="$2"
  local body="${3-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$url" \
      -H "X-DE-TOKEN: $ADMIN_TOKEN" \
      -H 'Content-Type: application/json' \
      --data "$body"
  else
    curl -sS -X "$method" "$url" \
      -H "X-DE-TOKEN: $ADMIN_TOKEN"
  fi
}

echo "Listing Codex themes..."
THEMES_JSON="$(curl_json GET "$DE_BASE/ai/query/themes")"
THEME_IDS="$(python3 - "$THEMES_JSON" <<'PY'
import json, sys
payload = json.loads(sys.argv[1])
items = payload.get("data", payload)
for item in items:
    if str(item.get("name", "")).startswith("Codex "):
        print(item["id"])
PY
)"

echo "Listing Codex datasets..."
DATASETS_JSON="$(curl_json POST "$DE_BASE/datasetTree/tree" '{"busiFlag":"dataset"}')"
DATASET_IDS="$(python3 - "$DATASETS_JSON" <<'PY'
import json, sys
payload = json.loads(sys.argv[1]).get("data", [])
def walk(nodes):
    for node in nodes:
        name = str(node.get("name") or "")
        if name.startswith("Codex "):
            print(node["id"])
        walk(node.get("children") or [])
walk(payload)
PY
)"

echo "Deleting Codex themes..."
while IFS= read -r theme_id; do
  [[ -z "$theme_id" ]] && continue
  echo "  DELETE theme $theme_id"
  curl_json DELETE "$DE_BASE/ai/query/themes/$theme_id" >/dev/null || true
done <<<"$THEME_IDS"

echo "Deleting Codex datasets..."
while IFS= read -r dataset_id; do
  [[ -z "$dataset_id" ]] && continue
  echo "  DELETE dataset $dataset_id"
  curl_json POST "$DE_BASE/datasetTree/delete/$dataset_id" '{}' >/dev/null || true
done <<<"$DATASET_IDS"

echo "Cleanup complete."
