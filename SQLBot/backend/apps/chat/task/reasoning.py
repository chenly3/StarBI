import json
import re
from typing import Any

import orjson


REASONING_KEYS = {'time_range', 'metrics', 'dimensions', 'filters', 'datasource'}


def _extract_json_values(text: str) -> list[Any]:
    decoder = json.JSONDecoder()
    values: list[Any] = []
    index = 0
    while index < len(text):
        next_positions = [pos for pos in (text.find('{', index), text.find('[', index)) if pos != -1]
        if not next_positions:
            break
        index = min(next_positions)
        try:
            value, end_index = decoder.raw_decode(text[index:])
        except json.JSONDecodeError:
            index += 1
            continue
        values.append(value)
        index += end_index
    return values


def _looks_like_reasoning(data: dict) -> bool:
    return bool(REASONING_KEYS.intersection(data.keys()))


def parse_reasoning_from_response(response_text: str) -> dict | None:
    json_values = _extract_json_values(response_text)

    for data in reversed(json_values):
        if isinstance(data, dict) and isinstance(data.get('reasoning'), dict):
            return data['reasoning']

    fenced_json_blocks = re.findall(r'```(?:json)?\s*([\s\S]*?)```', response_text, flags=re.IGNORECASE)
    for block in fenced_json_blocks:
        try:
            data = json.loads(block.strip())
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and _looks_like_reasoning(data):
            return data

    return None


def build_reasoning_stream_event(response_text: str) -> str | None:
    reasoning = parse_reasoning_from_response(response_text)
    if not reasoning:
        return None

    return 'data:' + orjson.dumps({'type': 'reasoning', 'content': reasoning}).decode() + '\n\n'
