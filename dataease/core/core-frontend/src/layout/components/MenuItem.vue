<script lang="ts">
import { h } from 'vue'
import { ElMenuItem, ElSubMenu, ElIcon } from 'element-plus-secondary'
import auth from '@/assets/svg/auth.svg'
import association from '@/assets/svg/association.svg'
import threshold from '@/assets/svg/threshold.svg'
import org from '@/assets/svg/org.svg'
import peoples from '@/assets/svg/peoples.svg'
import report from '@/assets/svg/report.svg'
import sync from '@/assets/svg/sync.svg'
import appearance from '@/assets/svg/appearance.svg'
import authentication from '@/assets/svg/authentication.svg'
import embedded from '@/assets/svg/embedded.svg'
import platform from '@/assets/svg/platform.svg'
import plugin from '@/assets/svg/plugin.svg'
import sysParameter from '@/assets/svg/sys-parameter.svg'
import variable from '@/assets/svg/variable.svg'
import watermark from '@/assets/svg/watermark.svg'
import icon_font from '@/assets/svg/icon_font.svg'
import icon_msg_fill from '@/assets/svg/icon_msg_fill.svg'
import icon_free from '@/assets/svg/icon_free.svg'
import icon_security from '@/assets/svg/icon_security.svg'
import icon_webhook from '@/assets/svg/icon_webhook.svg'
import icon_template from '@/assets/svg/icon_template.svg'
import log from '@/assets/svg/log.svg'

const SYSTEM_SETTING_MENU_TEXT_SIZE = '15px'
const SYSTEM_SETTING_ICON_SIZE = '17px'

const titleFallbackMap = {
  parameter: '通用配置',
  font: '字体管理',
  user: '用户管理',
  org: '组织管理',
  'query-config': '问数配置',
  permission: '权限配置',
  'row-column-permission': '行列权限配置'
}

const iconFallbackMap = {
  parameter: 'sys-parameter',
  user: 'peoples',
  org: 'org',
  permission: 'icon_security',
  font: 'icon_font',
  'query-config': 'icon_msg_fill',
  'row-column-permission': 'icon_security'
}

const menuIconStyle = {
  fontSize: SYSTEM_SETTING_ICON_SIZE
}

const menuTextStyle = {
  fontSize: SYSTEM_SETTING_MENU_TEXT_SIZE
}

const iconMap = {
  appearance: appearance,
  authentication: authentication,
  embedded: embedded,
  platform: platform,
  plugin: plugin,
  'sys-parameter': sysParameter,
  variable: variable,
  watermark: watermark,
  icon_font: icon_font,
  icon_msg_fill: icon_msg_fill,
  icon_free: icon_free,
  icon_security,
  icon_webhook,
  auth: auth,
  association: association,
  threshold: threshold,
  org: org,
  peoples: peoples,
  report: report,
  sync: sync,
  icon_template,
  log
}

const resolveMenuIcon = menu => {
  const metaIcon = menu?.meta?.icon
  if (metaIcon && iconMap[metaIcon]) {
    return metaIcon
  }
  return iconFallbackMap[menu?.path]
}

const resolveMenuTitle = menu => {
  return menu?.meta?.title || titleFallbackMap[menu?.path]
}

const titleWithIcon = props => {
  const icon = resolveMenuIcon(props.menu)
  const title = resolveMenuTitle(props.menu)
  return icon
    ? [
        h(
          ElIcon,
          { style: menuIconStyle },
          {
            default: () => h(iconMap[icon], { className: 'svg-icon logo' })
          }
        ),
        h('span', { style: menuTextStyle }, title)
      ]
    : [h('span', { style: menuTextStyle }, title)]
}

const MenuItem = props => {
  const { children, hidden, path } = props.menu
  const menuIndex = path
  if (hidden) {
    return null
  }
  if (children?.length) {
    return h(
      ElSubMenu,
      { index: menuIndex },
      {
        title: () => titleWithIcon(props),
        default: () => children.map(ele => h(MenuItem, { menu: ele }))
      }
    )
  }
  const icon = resolveMenuIcon(props.menu)
  const title = resolveMenuTitle(props.menu)
  return h(
    ElMenuItem,
    { index: menuIndex },
    {
      title: () => h('span', { style: menuTextStyle }, title),
      default: () =>
        icon
          ? h(
              ElIcon,
              { style: menuIconStyle },
              {
                default: () => h(iconMap[icon], { className: 'svg-icon logo' })
              }
            )
          : null
    }
  )
}
export default MenuItem
</script>
