package io.dataease.substitute.permissions.user;

import io.dataease.ai.gateway.UserContextClaimsProvider;
import io.dataease.api.permissions.role.vo.RoleDetailVO;
import io.dataease.api.permissions.user.vo.UserFormVO;
import org.apache.commons.lang3.StringUtils;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(1)
@ConditionalOnBean(SubstituteUserManagementStore.class)
public class SubstituteUserContextClaimsProvider implements UserContextClaimsProvider {

    private static final int SYSTEM_ADMIN_ROLE_TYPE = 1;
    private static final int ORG_ADMIN_ROLE_TYPE = 2;

    private final SubstituteUserManagementStore userStore;

    public SubstituteUserContextClaimsProvider(SubstituteUserManagementStore userStore) {
        this.userStore = userStore;
    }

    @Override
    public UserContextClaims claimsFor(Long userId) {
        if (userId == null) {
            return UserContextClaims.empty();
        }
        try {
            UserFormVO user = userStore.permissionUserById(userId);
            if (user == null) {
                return UserContextClaims.empty();
            }
            RoleFlags flags = roleFlags(user.getRoleIds());
            return new UserContextClaims(user.getAccount(), user.getName(), flags.systemAdmin(), flags.workspaceAdmin());
        } catch (Exception ignored) {
            return UserContextClaims.empty();
        }
    }

    private RoleFlags roleFlags(List<String> roleIds) {
        boolean systemAdmin = false;
        boolean workspaceAdmin = false;
        if (roleIds == null) {
            return new RoleFlags(false, false);
        }
        for (String roleId : roleIds) {
            Long parsedRoleId = parseRoleId(roleId);
            if (parsedRoleId == null) {
                continue;
            }
            try {
                RoleDetailVO role = userStore.queryRoleDetail(parsedRoleId);
                if (role == null) {
                    continue;
                }
                if (SYSTEM_ADMIN_ROLE_TYPE == role.getTypeCode()) {
                    systemAdmin = true;
                }
                if (ORG_ADMIN_ROLE_TYPE == role.getTypeCode()) {
                    workspaceAdmin = true;
                }
            } catch (Exception ignored) {
                // Deleted or remote-only roles should not grant SQLBot privileges.
            }
        }
        return new RoleFlags(systemAdmin, workspaceAdmin);
    }

    private Long parseRoleId(String roleId) {
        try {
            return StringUtils.isBlank(roleId) ? null : Long.valueOf(roleId);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private record RoleFlags(boolean systemAdmin, boolean workspaceAdmin) {
    }
}
