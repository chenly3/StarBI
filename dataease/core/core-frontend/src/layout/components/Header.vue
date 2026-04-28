<script lang="ts" setup>
import msgNotice from '@/assets/svg/icon_notification_outlined.svg'
import dvAi from '@/assets/svg/dv-ai.svg'
import dvPreviewDownload from '@/assets/svg/icon_download_outlined.svg'
import { computed, onMounted, ref } from 'vue'
import { usePermissionStore } from '@/store/modules/permission'
import { isExternal } from '@/utils/validate'
import { formatRoute } from '@/router/establish'
import HeaderMenuItem from './HeaderMenuItem.vue'
import { useEmitt } from '@/hooks/web/useEmitt'
import { Icon } from '@/components/icon-custom'
import SystemCfg from './SystemCfg.vue'
import ToolboxCfg from './ToolboxCfg.vue'
import HeaderBrand from './HeaderBrand.vue'
import { useRouter, useRoute } from 'vue-router_2'
import TopDoc from '@/layout/components/TopDoc.vue'
import AccountOperator from '@/layout/components/AccountOperator.vue'
import { isDesktop } from '@/utils/ModelUtil'
import { XpackComponent } from '@/components/plugin'
import { useAppearanceStoreWithOut } from '@/store/modules/appearance'
import AiComponent from '@/layout/components/AiComponent.vue'
import { findBaseParams } from '@/api/aiComponent'
import AiTips from '@/layout/components/AiTips.vue'
import DesktopSetting from './DesktopSetting.vue'
import request from '@/config/axios'

const appearanceStore = useAppearanceStoreWithOut()
const { push } = useRouter()
const route = useRoute()
import { useCache } from '@/hooks/web/useCache'
import { useI18n } from '@/hooks/web/useI18n'
import { msgCountApi } from '@/api/msg'
const { wsCache } = useCache('localStorage')
const aiBaseUrl = ref('https://maxkb.fit2cloud.com/ui/chat/2ddd8b594ce09dbb?mode=embed')
const handleIconClick = () => {
  if (route.path === '/workbranch/index') return
  push('/workbranch/index')
}

const handleAiClick = () => {
  useEmitt().emitter.emit('aiComponentChange')
}
const { t } = useI18n()
const sqlbotEnabled = ref(false)
const sqlbotOldEnabled = ref(false)
const desktop = isDesktop()
const showEmbeddedAiAssistant = computed(() => {
  return Boolean(aiBaseUrl.value) && appearanceStore.getShowAi
})
const activeIndex = computed(() => {
  if (route.path.includes('system')) {
    return '/system/user'
  }
  return route.path
})

const permissionStore = usePermissionStore()
const downloadClick = params => {
  useEmitt().emitter.emit('data-export-center', params)
}

const isQueryThemeHeaderMenu = menu => {
  const values = [menu?.name, menu?.path, menu?.component, menu?.redirect, menu?.meta?.title]
  return values.some(value => {
    const text = `${value || ''}`.toLowerCase()
    return (
      text === 'query-theme' ||
      text.includes('/query-theme') ||
      text.includes('visualized/data/query-theme') ||
      ['分析主题', '分析主題', 'analysis theme', 'analysis themes'].includes(text)
    )
  })
}

const filterHeaderMenus = (menus: any[] = [], parentPath = ''): any[] => {
  const isDataPrepareChildren = parentPath === '/data'
  return menus
    .filter(menu => !(isDataPrepareChildren && isQueryThemeHeaderMenu(menu)))
    .map(menu => {
      if (!Array.isArray(menu?.children) || !menu.children.length) {
        return menu
      }
      return {
        ...menu,
        children: filterHeaderMenus(menu.children, menu.path)
      }
    })
}

const routers = computed(() => {
  const routeList = filterHeaderMenus(
    formatRoute(permissionStore.getRoutersNotHidden as AppCustomRouteRecordRaw[]) as any[]
  )

  const nextRoutes = [...routeList]

  const smartQueryRoute = {
    path: '/sqlbotnew',
    name: 'smart-query',
    meta: {
      title: t('starbi.smart_query_title')
    }
  }

  const smartQueryOldRoute = {
    path: '/sqlbot/old',
    name: 'smart-query-old',
    meta: {
      title: t('starbi.smart_query_old_title')
    }
  }

  const insertIndex = routeList.findIndex(route =>
    ['/workbranch', '/workbranch/index'].includes(route.path)
  )

  const hasSmartQuery = nextRoutes.some(route => route.path === '/sqlbotnew')
  const hasSmartQueryOld = nextRoutes.some(route => route.path === '/sqlbot/old')

  const pendingAdds: any[] = []
  if (sqlbotEnabled.value && !hasSmartQuery) {
    pendingAdds.push(smartQueryRoute)
  }
  if (sqlbotOldEnabled.value && !hasSmartQueryOld) {
    pendingAdds.push(smartQueryOldRoute)
  }

  if (!pendingAdds.length) {
    return routeList
  }

  if (insertIndex < 0) {
    return [...routeList, ...pendingAdds]
  }

  nextRoutes.splice(insertIndex + 1, 0, ...pendingAdds)
  return nextRoutes
})
const showSystem = ref(false)
const showMsg = ref(false)
const showToolbox = ref(false)
const showOverlay = ref(false)
const handleSelect = (index: string) => {
  // 自定义事件
  if (isExternal(index)) {
    const openType = wsCache.get('open-backend') === '1' ? '_self' : '_blank'
    window.open(index, openType)
  } else {
    push(index)
  }
}
const initShowSystem = () => {
  showSystem.value = permissionStore.getRouters.some(route => route.path === '/system')
}
const initShowMsg = () => {
  showMsg.value = permissionStore.getRouters.some(route => route.path === '/msg')
}
const initShowToolbox = () => {
  showToolbox.value = permissionStore.getRouters.some(route => route.path === '/toolbox')
}
const navigateBg = computed(() => appearanceStore.getNavigateBg)
const navigate = computed(() => appearanceStore.getNavigate)

const initAiBase = async () => {
  // const aiTipsCheck = wsCache.get('DE-AI-TIPS-CHECK')
  // if (aiTipsCheck === 'CHECKED') {
  //   showOverlay.value = false
  // } else {
  //   showOverlay.value = true
  // }
  await findBaseParams().then(rsp => {
    const params = rsp.data
    if (params && params['ai.baseUrl']) {
      aiBaseUrl.value = params['ai.baseUrl']
    } else {
      aiBaseUrl.value = null
    }
  })
}

const aiTipsConfirm = () => {
  wsCache.set('DE-AI-TIPS-CHECK', 'CHECKED')
  showOverlay.value = false
}

const msgNoticePush = () => {
  push('/msg/msg-fill')
}

const badgeCount = ref('0')
const loadSqlbotInfo = () => {
  const url = '/sysParameter/sqlbot'
  request.get({ url }).then(res => {
    if (res && res.data) {
      const { domain, id, enabled, valid } = res.data
      sqlbotEnabled.value = domain && id && enabled && valid
    }
  })
}

onMounted(() => {
  loadSqlbotInfo()
  initShowSystem()
  initShowToolbox()
  initShowMsg()
  initAiBase()

  msgCountApi().then(res => {
    badgeCount.value = (res?.data > 99 ? '99+' : res?.data) || '0'
  })
})
</script>

<template>
  <el-header
    class="header-flex starbi-header-shell"
    :class="{ 'header-light': navigateBg === 'light' }"
  >
    <HeaderBrand :navigate="navigate" @click="handleIconClick" />
    <div class="header-menu-center">
      <el-menu
        class="header-nav-menu"
        :default-active="activeIndex"
        mode="horizontal"
        :ellipsis="false"
        @select="handleSelect"
        :effect="navigateBg === 'light' ? 'light' : 'dark'"
      >
        <HeaderMenuItem v-for="menu in routers" :key="menu.path" :menu="menu"></HeaderMenuItem>
      </el-menu>
    </div>
    <div class="operate-setting" v-if="!desktop">
      <XpackComponent jsname="c3dpdGNoZXI=" />
      <el-tooltip effect="dark" :content="t('commons.assistant')" placement="bottom">
        <el-icon class="header-action-icon ai-icon" v-if="showEmbeddedAiAssistant && !showOverlay">
          <Icon name="dv-ai"><dvAi @click="handleAiClick" class="svg-icon" /></Icon>
        </el-icon>
      </el-tooltip>
      <el-tooltip effect="dark" :content="t('data_export.export_center')" placement="bottom">
        <el-icon class="header-action-icon" :class="navigateBg === 'light' && 'is-light-setting'">
          <Icon name="dv-preview-download"
            ><dvPreviewDownload @click="downloadClick" class="svg-icon"
          /></Icon>
        </el-icon>
      </el-tooltip>

      <ai-tips
        @confirm="aiTipsConfirm"
        v-if="showOverlay && showEmbeddedAiAssistant"
        class="ai-icon-tips"
      />
      <ToolboxCfg v-if="showToolbox" />
      <TopDoc v-if="appearanceStore.getShowDoc" />
      <el-tooltip
        v-if="showMsg"
        effect="dark"
        :content="$t('v_query.msg_center')"
        placement="bottom"
      >
        <el-badge
          class="ed-badge_custom header-badge"
          :hidden="[0, '0'].includes(badgeCount)"
          :value="badgeCount"
        >
          <el-icon class="header-action-icon" :class="navigateBg === 'light' && 'is-light-setting'">
            <Icon><msgNotice @click="msgNoticePush" class="svg-icon" /></Icon>
          </el-icon>
        </el-badge>
      </el-tooltip>

      <SystemCfg v-if="showSystem" />
      <AccountOperator />
      <ai-component v-if="showEmbeddedAiAssistant" :base-url="aiBaseUrl"></ai-component>
      <div v-if="showOverlay && showEmbeddedAiAssistant" class="overlay"></div>
    </div>
    <div v-else class="operate-setting">
      <desktop-setting />
    </div>
  </el-header>
</template>

<style lang="less" scoped>
:deep(.ed-badge_custom) {
  --ed-badge-size: 14px;
  height: 28px;
  .ed-badge__content {
    right: 0;
    min-width: 16px;
    padding: 3px 4px;
    border: none;
    font-size: 10px;
    font-weight: 600;
    transform: translateX(18%) translateY(-28%);
  }
}
.header-action-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
  overflow: hidden;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.96;
  transition: background-color 0.16s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
  }
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5); /* 半透明黑色 */
  z-index: 10000;
}

.header-flex {
  margin-bottom: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  height: 64px;
  position: relative;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
    linear-gradient(90deg, #0f58b8 0%, #1667cc 52%, #1075d5 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 10px 26px rgba(10, 71, 168, 0.16);
  padding: 0 28px;

  .header-menu-center {
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
  }

  .operate-setting {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 248px;
    min-width: max-content;
    overflow: visible;
    justify-content: flex-end;
    &:focus {
      outline: none;
    }
  }

  .ed-menu.ed-menu--horizontal {
    border-bottom: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.94);
  }
}

.header-light {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0)),
    linear-gradient(90deg, #0f58b8 0%, #1667cc 52%, #1075d5 100%) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 10px 26px rgba(10, 71, 168, 0.16) !important;
  :deep(.starbi-logo) {
    --starbi-logo-fg: #ffffff;
    --starbi-logo-mark-bg: rgba(255, 255, 255, 0.14);
    --starbi-logo-mark-border: rgba(255, 255, 255, 0.2);
    --starbi-logo-mark-accent: linear-gradient(180deg, #ffffff, #dbeafe);
  }
}
</style>

<style lang="less">
.header-flex {
  font-family: 'Avenir Next', 'Segoe UI', var(--de-custom_font, 'PingFang'), sans-serif;

  .header-menu-center {
    min-width: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    .header-nav-menu.ed-menu--horizontal {
      width: auto;
      min-width: 0;
      gap: 4px;
      height: auto;
      padding: 0;
      border-radius: 0;
      background: transparent;
      border: none;
      box-shadow: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      --ed-menu-active-color: #ffffff;
      --ed-menu-hover-text-color: #ffffff;
      --ed-menu-hover-bg-color: transparent;
    }

    .header-nav-menu.ed-menu--horizontal > .ed-menu-item,
    .header-nav-menu.ed-menu--horizontal > .ed-sub-menu > .ed-sub-menu__title {
      height: 40px;
      width: 112px;
      min-width: 112px;
      box-sizing: border-box;
      line-height: 20px;
      font-size: 15px;
      font-weight: 600;
      color: #ffffff !important;
      padding: 0 12px;
      margin: 0;
      border-radius: 999px;
      border-bottom: none !important;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      letter-spacing: 0.01em;
      background: transparent !important;
      box-shadow: none !important;
      transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
      text-align: center;
      white-space: nowrap;
    }

    .header-nav-menu.ed-menu--horizontal > .ed-menu-item > span,
    .header-nav-menu.ed-menu--horizontal > .ed-sub-menu > .ed-sub-menu__title > span {
      position: relative;
      z-index: 1;
      flex: 0 0 auto;
    }

    .header-nav-menu.ed-menu--horizontal > .ed-sub-menu > .ed-sub-menu__title {
      gap: 6px;
    }

    .header-nav-menu.ed-menu--horizontal
      > .ed-sub-menu
      > .ed-sub-menu__title
      .ed-sub-menu__icon-arrow {
      position: static !important;
      left: auto !important;
      right: auto !important;
      z-index: 1;
      flex: 0 0 auto;
      width: 12px !important;
      height: 12px !important;
      margin-left: 0 !important;
      transform: none !important;
    }

    .header-nav-menu.ed-menu--horizontal
      > .ed-sub-menu
      > .ed-sub-menu__title
      .ed-sub-menu__icon-arrow
      svg {
      width: 12px;
      height: 12px;
    }

    .header-nav-menu.ed-menu--horizontal > .ed-menu-item.is-active,
    .header-nav-menu.ed-menu--horizontal > .ed-sub-menu.is-active > .ed-sub-menu__title {
      color: #1757c9 !important;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.96) !important;
      border: 1px solid transparent !important;
      box-shadow: 0 10px 22px rgba(7, 37, 102, 0.22) !important;
    }

    .header-nav-menu.ed-menu--horizontal > .ed-menu-item:not(.is-active):hover,
    .header-nav-menu.ed-menu--horizontal > .ed-sub-menu > .ed-sub-menu__title:hover {
      color: #ffffff !important;
      background: rgba(255, 255, 255, 0.14) !important;
    }

    .header-nav-menu.ed-menu--horizontal > .ed-sub-menu.is-active .ed-sub-menu__icon-arrow,
    .header-nav-menu.ed-menu--horizontal > .ed-sub-menu .ed-sub-menu__icon-arrow {
      color: currentColor;
    }
  }

  .operate-setting {
    .ed-icon {
      cursor: pointer;
      color: #ffffff !important;
      font-size: 20px;
    }
  }

  :deep(.sys-setting) {
    margin: 0 !important;
    width: 36px !important;
    height: 36px !important;
    padding: 0 !important;
    border-radius: 10px !important;
    background: transparent;
    transition: background-color 0.16s ease;
  }

  :deep(.sys-setting:hover) {
    background: rgba(255, 255, 255, 0.14) !important;
  }

  :deep(.preview-download_icon) {
    margin: 0 !important;
    width: 36px !important;
    height: 36px !important;
    padding: 0 !important;
    border-radius: 10px !important;
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }

  :deep(.preview-download_icon:hover) {
    background: rgba(255, 255, 255, 0.14) !important;
  }

  :deep(.top-info-container) {
    height: 36px;
    border-radius: 999px;
    padding: 0 12px 0 4px;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: none;
  }

  :deep(.top-info-container:hover) {
    background: rgba(255, 255, 255, 0.24) !important;
    transform: none !important;
  }

  :deep(.top-info-container .uname-span) {
    color: #ffffff !important;
    font-size: 14px;
    font-weight: 600;
  }

  :deep(.top-info-container .main-color) {
    background: rgba(255, 255, 255, 0.24);
    width: 28px;
    height: 28px;
  }

  :deep(.top-info-container .ed-icon) {
    color: #ffffff !important;
  }

  :deep(.header-action-icon .svg-icon),
  :deep(.ai-icon .svg-icon),
  :deep(.operate-setting .svg-icon) {
    color: #ffffff;
    fill: currentColor;
    opacity: 0.96;
  }

  :deep(.top-info-container .uname-span) {
    max-width: 136px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.header-light {
  .operate-setting {
    .ed-icon {
      color: rgba(255, 255, 255, 0.96) !important;
    }
  }
}

.ai-icon {
  font-size: 20px !important;
}

.ai-icon-tips,
.copilot-icon-tips {
  font-size: 24px !important;
  z-index: 10001;
}
</style>
