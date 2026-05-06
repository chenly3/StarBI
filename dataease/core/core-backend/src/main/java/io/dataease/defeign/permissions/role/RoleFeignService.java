package io.dataease.defeign.permissions.role;

import io.dataease.api.permissions.role.api.RoleApi;
import io.dataease.feign.DeFeign;

@DeFeign(value = "xpack-permissions", path = "/role")
public interface RoleFeignService extends RoleApi {
}
