<script lang="ts" setup>
import iconSetting from '@/assets/svg/icon_organization_outlined.svg'
import { useRouter } from 'vue-router_2'
import { useAppearanceStoreWithOut } from '@/store/modules/appearance'
import { computed } from 'vue'

const appearanceStore = useAppearanceStoreWithOut()
const navigateBg = computed(() => appearanceStore.getNavigateBg)
const showDoc = computed(() => appearanceStore.getShowDoc)
const { push, resolve } = useRouter()
const redirectUser = () => {
  const sysMenu = resolve('/system')
  const kidPath = sysMenu.matched[0].children[0].path
  push(`${sysMenu.path}/${kidPath}`)
}
</script>

<template>
  <el-tooltip class="box-item" effect="dark" :content="$t('toolbox.org_center')" placement="top">
    <div
      class="sys-setting header-ops-icon"
      :class="{
        'is-light-setting': navigateBg && navigateBg === 'light',
        'in-iframe-setting': !showDoc
      }"
    >
      <el-icon @click="redirectUser">
        <Icon class="icon-setting" name="icon-setting"
          ><iconSetting class="svg-icon icon-setting"
        /></Icon>
      </el-icon>
    </div>
  </el-tooltip>
</template>

<style lang="less" scoped>
.header-ops-icon {
  width: 36px;
  height: 36px;
  margin: 0;
  padding: 0;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.96);
  transition: background-color 0.16s ease, transform 0.16s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px);
  }
}

.sys-setting {
  .svg-icon {
    color: currentColor;
    fill: currentColor;
  }
}

.in-iframe-setting {
  margin-left: 0 !important;
}
.is-light-setting {
  &:hover {
    background-color: rgba(255, 255, 255, 0.14) !important;
  }
}
</style>
