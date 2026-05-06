package io.dataease.ai.gateway;

import io.dataease.api.permissions.role.dto.RoleRequest;
import io.dataease.api.permissions.role.vo.RoleDetailVO;
import io.dataease.api.permissions.role.vo.RoleVO;
import io.dataease.api.permissions.user.vo.UserFormVO;
import io.dataease.defeign.permissions.role.RoleFeignService;
import io.dataease.defeign.permissions.user.UserFeignService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(0)
@ConditionalOnBean({UserFeignService.class, RoleFeignService.class})
public class FeignUserContextClaimsProvider implements UserContextClaimsProvider {

    private static final int SYSTEM_ADMIN_ROLE_TYPE = 1;
    private static final int ORG_ADMIN_ROLE_TYPE = 2;

    @Autowired
    private UserFeignService userFeignService;

    @Autowired
    private RoleFeignService roleFeignService;

    @Override
    public UserContextClaims claimsFor(Long userId) {
        if (userId == null) {
            return UserContextClaims.empty();
        }
        UserFormVO user = userFeignService.queryById(userId);
        if (user == null) {
            return UserContextClaims.empty();
        }
        RoleFlags flags = roleFlags(userId);
        return new UserContextClaims(user.getAccount(), user.getName(), flags.systemAdmin(), flags.workspaceAdmin());
    }

    private RoleFlags roleFlags(Long userId) {
        RoleRequest request = new RoleRequest();
        request.setUid(userId);
        List<RoleVO> roles = roleFeignService.selectedForUser(request);
        if (roles == null || roles.isEmpty()) {
            return new RoleFlags(false, false);
        }
        boolean systemAdmin = false;
        boolean workspaceAdmin = false;
        for (RoleVO role : roles) {
            if (role == null || role.getId() == null) {
                continue;
            }
            RoleDetailVO detail = roleFeignService.detail(role.getId());
            if (detail == null || detail.getTypeCode() == null) {
                continue;
            }
            if (SYSTEM_ADMIN_ROLE_TYPE == detail.getTypeCode()) {
                systemAdmin = true;
            }
            if (ORG_ADMIN_ROLE_TYPE == detail.getTypeCode()) {
                workspaceAdmin = true;
            }
        }
        return new RoleFlags(systemAdmin, workspaceAdmin);
    }

    private record RoleFlags(boolean systemAdmin, boolean workspaceAdmin) {
    }
}
