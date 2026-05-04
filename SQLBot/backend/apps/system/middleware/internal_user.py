from typing import Optional

from apps.system.schemas.system_schema import UserInfoDTO


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
