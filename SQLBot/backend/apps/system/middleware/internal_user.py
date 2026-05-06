import hmac
import time
from hashlib import sha256
from typing import Optional
from urllib.parse import unquote_plus

from apps.system.schemas.system_schema import UserInfoDTO
from common.core.config import settings


INTERNAL_SIGNATURE_MAX_AGE_SECONDS = 300


def _parse_positive_int(value: Optional[str]) -> Optional[int]:
    try:
        parsed = int(value) if value else 0
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _parse_bool(value: Optional[str]) -> bool:
    return str(value or "").strip().lower() in ("1", "true", "yes", "y", "on")


def _decode_header(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    decoded = unquote_plus(value).replace("\r", " ").replace("\n", " ").strip()
    return decoded or None


def build_internal_user(
    de_user_id: Optional[str],
    de_org_id: Optional[str],
    de_user_account: Optional[str] = None,
    de_user_name: Optional[str] = None,
    de_is_admin: Optional[str] = None,
    de_is_ws_admin: Optional[str] = None,
) -> Optional[UserInfoDTO]:
    user_id = _parse_positive_int(de_user_id)
    org_id = _parse_positive_int(de_org_id)
    if not user_id or not org_id:
        return None
    account = _decode_header(de_user_account) or ("admin" if user_id == 1 else f"dataease-{user_id}")
    name = _decode_header(de_user_name) or account
    is_admin = _parse_bool(de_is_admin) or user_id == 1
    is_ws_admin = _parse_bool(de_is_ws_admin) or is_admin
    return UserInfoDTO(
        id=user_id,
        name=name,
        account=account,
        oid=org_id,
        email=f"{account}@dataease",
        language="zh-CN",
        weight=1 if is_ws_admin else 0,
        isAdmin=is_admin,
    )


def verify_internal_signature(
    de_user_id: Optional[str],
    de_org_id: Optional[str],
    de_user_account: Optional[str],
    de_user_name: Optional[str],
    de_is_admin: Optional[str],
    de_is_ws_admin: Optional[str],
    timestamp: Optional[str],
    signature: Optional[str],
) -> bool:
    user_id = _parse_positive_int(de_user_id)
    org_id = _parse_positive_int(de_org_id)
    if not user_id or not org_id or not timestamp or not signature:
        return False
    try:
        signed_at = int(timestamp)
    except (TypeError, ValueError):
        return False
    if abs(int(time.time()) - signed_at) > INTERNAL_SIGNATURE_MAX_AGE_SECONDS:
        return False
    secret = (getattr(settings, "STARBI_SQLBOT_ASSISTANT_SECRET", "") or "").strip()
    if not secret:
        return False
    expected_payloads = [
        "\n".join(
            [
                str(user_id),
                str(org_id),
                de_user_account or "",
                de_user_name or "",
                de_is_admin or "",
                de_is_ws_admin or "",
                str(signed_at),
            ]
        )
    ]
    if not any((de_user_account, de_user_name, de_is_admin, de_is_ws_admin)):
        expected_payloads.append(f"{user_id}:{org_id}:{signed_at}")
    return any(
        hmac.compare_digest(
            hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), sha256).hexdigest(),
            signature,
        )
        for payload in expected_payloads
    )
