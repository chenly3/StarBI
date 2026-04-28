<script lang="ts" setup>
import icon_left_outlined from '@/assets/svg/icon_left_outlined.svg'
import { computed } from 'vue'
import { useRouter } from 'vue-router_2'
import HeaderBrand from './HeaderBrand.vue'
import AccountOperator from '@/layout/components/AccountOperator.vue'
import { useAppearanceStoreWithOut } from '@/store/modules/appearance'
import { useI18n } from '@/hooks/web/useI18n'
import { isDesktop } from '@/utils/ModelUtil'
const appearanceStore = useAppearanceStoreWithOut()
const { push } = useRouter()
const { t } = useI18n()
const desktop = isDesktop()
const props = withDefaults(
  defineProps<{
    title?: string
  }>(),
  {
    title: ''
  }
)
const backToMain = () => {
  push('/workbranch/index')
}
const navigateBg = computed(() => appearanceStore.getNavigateBg)
const navigate = computed(() => appearanceStore.getNavigate)
const headerTitle = computed(() => props.title?.trim() || '')
const backToWorkbenchLabel = computed(() => {
  const translated = t('work_branch.back_to_work_branch')
  return translated === 'work_branch.back_to_work_branch' ? '返回工作台' : translated
})
</script>

<template>
  <el-header class="header-flex system-header" :class="{ 'header-light': navigateBg === 'light' }">
    <HeaderBrand :navigate="navigate" @click="backToMain" />

    <div class="header-menu-spacer">
      <span v-if="headerTitle" class="header-system-title">{{ headerTitle }}</span>
    </div>

    <div class="operate-setting">
      <button type="button" class="work-bar flex-align-center" @click="backToMain">
        <el-icon>
          <Icon name="icon_left_outlined"><icon_left_outlined class="svg-icon" /></Icon>
        </el-icon>
        <span class="work">{{ backToWorkbenchLabel }}</span>
      </button>

      <AccountOperator v-if="!desktop" />
    </div>
  </el-header>
</template>

<style lang="less" scoped>
.system-header {
  font-family: 'Avenir Next', 'Segoe UI', var(--de-custom_font, 'PingFang'), sans-serif;

  .header-menu-spacer {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    min-width: 0;
    overflow: hidden;
  }

  .header-system-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.96);
    font-size: 16px;
    font-style: normal;
    font-weight: 600;
    line-height: 24px;
  }

  .work-bar {
    color: rgba(255, 255, 255, 0.92);
    font-size: 14px;
    font-style: normal;
    font-weight: 600;
    line-height: 20px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 10px 0 8px;
    border-radius: 999px;
    border: none;
    background: transparent;
    transition: background-color 0.16s ease, color 0.16s ease, transform 0.16s ease;
    flex-shrink: 0;

    &:hover {
      background-color: rgba(255, 255, 255, 0.14);
    }

    .ed-icon {
      margin-right: 6px;
      font-size: 16px;
    }
  }

  .avatar {
    margin: 0 -7px 0 20px !important;
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
  padding: 0 24px;
  .operate-setting {
    justify-self: end;
    display: flex;
    align-items: center;
    gap: 10px;
    width: auto;
    min-width: max-content;
    overflow: visible;
    justify-content: flex-end;
    &:focus {
      outline: none;
    }
  }
}
</style>

<style lang="less">
.system-header {
  .operate-setting {
    .ed-icon {
      cursor: pointer;
      color: rgba(255, 255, 255, 0.96) !important;
      font-size: 20px;
    }
  }

  :deep(.top-info-container) {
    height: 36px;
    padding: 0 12px 0 4px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  :deep(.top-info-container:hover) {
    background: rgba(255, 255, 255, 0.24) !important;
  }

  :deep(.top-info-container .main-color) {
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.24);
  }

  :deep(.top-info-container .uname-span),
  :deep(.top-info-container .ed-icon),
  :deep(.work-bar .svg-icon) {
    color: #ffffff !important;
  }

  :deep(.top-info-container .uname-span) {
    max-width: 136px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 600;
  }
}
</style>
