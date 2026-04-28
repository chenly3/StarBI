<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import Header from './components/Header.vue'
import HeaderSystem from './components/HeaderSystem.vue'
import Sidebar from './components/Sidebar.vue'
import Menu from './components/Menu.vue'
import Main from './components/Main.vue'
import CollapseBar from './components/CollapseBar.vue'
import { useSystemSettingAdaptive } from './composables/useSystemSettingAdaptive'
import { ElContainer } from 'element-plus-secondary'
import { useRoute } from 'vue-router_2'
import { XpackComponent } from '@/components/plugin'
import { useI18n } from '@/hooks/web/useI18n'
const route = useRoute()
const systemMenu = computed(() => route.path.includes('system'))
const settingMenu = computed(
  () =>
    route.path.includes('sys-setting') ||
    route.path === '/starbi/query-config' ||
    route.path.startsWith('/starbi/query-config/')
)
const marketMenu = computed(() => route.path.includes('template-market'))
const toolboxMenu = computed(() => route.path.includes('toolbox'))
const msgFillMenu = computed(() => route.path.includes('msg-fill'))
const isCollapse = ref(false)
const adaptiveShell = useSystemSettingAdaptive()
const isSystemSettingFloating = computed(
  () => settingMenu.value && adaptiveShell.menuMode.value === 'floating'
)
const isFloatingMenuExpanded = ref(false)
const sidebarCollapsed = computed(() => {
  if (isSystemSettingFloating.value) {
    return !isFloatingMenuExpanded.value
  }
  return isCollapse.value
})
watch(isSystemSettingFloating, floating => {
  if (!floating) {
    isFloatingMenuExpanded.value = false
  }
})
const setCollapse = () => {
  if (isSystemSettingFloating.value) {
    isFloatingMenuExpanded.value = !isFloatingMenuExpanded.value
    return
  }
  isCollapse.value = !isCollapse.value
}
const adaptiveSidebarStyle = computed(() =>
  settingMenu.value
    ? { width: `${sidebarCollapsed.value ? 64 : adaptiveShell.sidebarWidth.value}px` }
    : {}
)
const collapseBarWidth = computed(() => {
  if (settingMenu.value) {
    return sidebarCollapsed.value ? 64 : adaptiveShell.sidebarWidth.value
  }
  return 280
})
const adaptiveMainClass = computed(() => [
  { 'with-sider': systemMenu.value || settingMenu.value || toolboxMenu.value || msgFillMenu.value },
  settingMenu.value ? adaptiveShell.contentPaddingClass.value : ''
])
const { t } = useI18n()
</script>

<template>
  <div class="common-layout" :class="{ 'system-setting-shell': settingMenu }">
    <HeaderSystem
      v-if="settingMenu || marketMenu || toolboxMenu || msgFillMenu"
      :title="
        toolboxMenu
          ? t('toolbox.name')
          : marketMenu
          ? t('toolbox.template_center')
          : msgFillMenu
          ? t('v_query.msg_center')
          : ''
      "
    />
    <Header v-else></Header>
    <el-container class="layout-container">
      <template v-if="systemMenu || settingMenu || toolboxMenu || msgFillMenu">
        <Sidebar
          v-if="!sidebarCollapsed"
          class="layout-sidebar"
          :class="{ 'layout-sidebar-floating': isSystemSettingFloating }"
          :style="adaptiveSidebarStyle"
        >
          <div
            @click="setCollapse"
            v-if="(systemMenu || msgFillMenu) && !sidebarCollapsed"
            class="org-config-center"
          >
            {{ msgFillMenu ? t('v_query.msg_center') : t('toolbox.org_center') }}
          </div>
          <Menu
            :style="{ height: systemMenu || msgFillMenu ? 'calc(100% - 48px)' : '100%' }"
          ></Menu>
        </Sidebar>
        <el-aside class="layout-sidebar layout-sidebar-collapse" v-else>
          <Menu
            :collapse="sidebarCollapsed"
            :style="{ height: systemMenu ? 'calc(100% - 48px)' : '100%' }"
          ></Menu>
        </el-aside>
        <CollapseBar
          @setCollapse="setCollapse"
          :isCollapse="sidebarCollapsed"
          :width-value="collapseBarWidth"
        ></CollapseBar>
      </template>

      <Main class="layout-main" :class="adaptiveMainClass"></Main>
    </el-container>
  </div>
  <XpackComponent jsname="L2NvbXBvbmVudC9sb2dpbi9Qd2RJbnZhbGlkVGlwcw==" />
</template>

<style lang="less" scoped>
.common-layout {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  color: #1f2329;
  min-width: 1000px;
  overflow-x: auto;

  &.system-setting-shell {
    min-width: 1280px;
  }

  .layout-container {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;

    .layout-sidebar {
      height: calc(100vh - 106px);
      background: #ffffff;
      border-right: 1px solid #e6ebf2;
      box-shadow: 8px 0 24px rgba(15, 23, 42, 0.04);
    }

    .layout-sidebar-floating {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 20;
    }

    .layout-sidebar-collapse {
      width: 64px;
      border-right: 1px solid #e6ebf2;
    }

    .org-config-center {
      height: 48px;
      padding-left: 24px;
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 500;
      line-height: 22px;
      color: #8f959e;
      border-bottom: 1px solid #1f232926;
      position: sticky;
      top: 0;
      left: 0;
      background: #fff;
      z-index: 10;
    }

    .layout-main {
      flex: 1;
      background-color: var(--MainBG, #f5f6f7);
      padding: 0;
      min-width: 0;
      min-height: 0;
      overflow: auto;

      &.with-sider {
        padding: 16px 24px 24px 24px;
      }

      &.with-sider:has(.appearance-foot) {
        padding: 16px 24px 0 24px !important;
      }

      &.system-setting-compact {
        background-color: #f5f7fb;
        padding: 12px 14px 14px;
      }

      &.system-setting-compact:has(.appearance-foot) {
        padding: 12px 14px 0 14px !important;
      }

      &.system-setting-standard {
        background-color: #f5f7fb;
        padding: 14px 16px 16px;
      }

      &.system-setting-standard:has(.appearance-foot) {
        padding: 12px 16px 0px 16px !important;
      }

      &.system-setting-wide {
        background-color: #f5f7fb;
        padding: 16px 20px 18px;
      }

      &.system-setting-wide:has(.appearance-foot) {
        padding: 16px 20px 0px 20px !important;
      }
    }
  }
}
</style>
