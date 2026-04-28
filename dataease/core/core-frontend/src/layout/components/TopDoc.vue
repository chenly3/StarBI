<script lang="ts" setup>
import topEnterpriseTrial from '@/assets/svg/top-enterprise-trial.svg'
import topHelpDoc from '@/assets/svg/top-help-doc.svg'
import topProductBbs from '@/assets/svg/top-product-bbs.svg'
import topTechnology from '@/assets/svg/top-technology.svg'
import { useI18n } from '@/hooks/web/useI18n'
import docs from '@/assets/svg/icon-maybe_outlined.svg'
import { computed } from 'vue'
import { Icon } from '@/components/icon-custom'
import TopDocCard from '@/layout/components/TopDocCard.vue'
import { useAppearanceStoreWithOut } from '@/store/modules/appearance'
const appearanceStore = useAppearanceStoreWithOut()
const navigateBg = computed(() => appearanceStore.getNavigateBg)
const help = computed(() => appearanceStore.getHelp)
const { t } = useI18n()

const cardInfoList = [
  {
    name: t('api_pagination.help_documentation'),
    url: help.value || 'https://dataease.io/docs/v2/',
    icon: topHelpDoc
  },
  {
    name: t('api_pagination.product_forum'),
    url: 'https://bbs.fit2cloud.com/c/de/6',
    icon: topProductBbs
  },
  {
    name: t('api_pagination.technical_blog'),
    url: 'https://blog.fit2cloud.com/categories/dataease',
    icon: topTechnology
  },
  {
    name: t('api_pagination.enterprise_edition_trial'),
    url: 'https://jinshuju.net/f/TK5TTd',
    icon: topEnterpriseTrial
  }
]
</script>

<template>
  <el-popover
    :show-arrow="false"
    popper-class="top-popover"
    placement="bottom-end"
    width="210"
    trigger="hover"
  >
    <top-doc-card
      :span="12"
      v-for="(item, index) in cardInfoList"
      :key="index"
      :card-info="item"
    ></top-doc-card>
    <template #reference>
      <div
        class="sys-setting header-ops-icon"
        :class="{ 'is-light-setting': navigateBg && navigateBg === 'light' }"
      >
        <el-icon>
          <Icon name="docs"><docs class="svg-icon" /></Icon>
        </el-icon>
      </div>
    </template>
  </el-popover>
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

.is-light-setting {
  &:hover {
    background-color: rgba(255, 255, 255, 0.14) !important;
  }
}
</style>

<style lang="less">
.top-popover {
  display: flex;
  padding: 10px !important;
  flex-wrap: wrap;
  border-radius: 16px !important;
  border: 1px solid rgba(186, 215, 255, 0.9) !important;
  box-shadow: 0 18px 38px rgba(27, 92, 198, 0.16) !important;
  background: linear-gradient(180deg, rgba(238, 246, 255, 0.92), #ffffff 100%);
  .doc-card {
    margin: auto;
  }
}
</style>
