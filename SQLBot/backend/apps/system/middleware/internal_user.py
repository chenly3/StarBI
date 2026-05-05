import hmac
import time
from hashlib import sha256
from typing import Optional

from apps.system.schemas.system_schema import UserInfoDTO
from common.core.config import settings


INTERNAL_SIGNATURE_MAX_AGE_SECONDS = 300


def _parse_positive_int(value: Optional[str]) -> Optional[int]:
    try:
        parsed = int(value) if value else 0
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def build_internal_user(de_user_id: Optional[str], de_org_id: Optional[str]) -> Optional[UserInfoDTO]:
    user_id = _parse_positive_int(de_user_id)
    org_id = _parse_positive_int(de_org_id)
    if not user_id or not org_id:
        return None
    return UserInfoDTO(
        id=user_id,
        name=f"internal-{user_id}",
        account=f"internal-{user_id}",
        oid=org_id,
        email=f"internal-{user_id}@dataease",
        language="zh-CN",
        weight=0,
        isAdmin=False,
    )


def verify_internal_signature(
    de_user_id: Optional[str],
    de_org_id: Optional[str],
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
    expected = hmac.new(
        secret.encode("utf-8"),
        f"{user_id}:{org_id}:{signed_at}".encode("utf-8"),
        sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
