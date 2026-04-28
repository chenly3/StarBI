<template>
  <div
    v-loading="divLoading"
    class="sqlbot--embedded-page"
    :class="{ 'is-starbi-embedded': isStarBI }"
  >
    <Model v-if="!loading && isWsAdmin && currentPage === 'model'" />
    <Professional v-else-if="!loading && isWsAdmin && currentPage === 'professional'" />
    <Training v-else-if="!loading && isWsAdmin && currentPage === 'training'" />
    <page-401 v-else-if="!loading" :title="t('login.permission_invalid')" />
  </div>
</template>
<script setup lang="ts">
import Model from '@/views/system/model/Model.vue'
import Professional from '@/views/system/professional/index.vue'
import Training from '@/views/system/training/index.vue'
import Page401 from '@/views/error/index.vue'
import { computed, nextTick, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAssistantStore } from '@/stores/assistant'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import {
  applyEmbeddedStyleTokens,
  isStarBIPageMode,
  resolveParentOrigin,
  setTitle,
  STARBI_BRAND_NAME,
} from '@/utils/utils'
const { t } = useI18n()
const userStore = useUserStore()
const assistantStore = useAssistantStore()
assistantStore.setPageEmbedded(true)
const route = useRoute()

const loading = ref(true)
const divLoading = ref(true)
const eventName = 'sqlbot_embedded_event'
const busiFlag = ref(route.query.page?.toString() || '')
const isStarBI = computed(() => isStarBIPageMode(route.query.pageMode))
const currentPage = computed(() => busiFlag.value || route.query.page?.toString() || '')
const parentOrigin = computed(() => resolveParentOrigin(assistantStore.getHostOrigin))
const currentMessageId = computed(() => String(route.query.id || ''))

const isWsAdmin = computed(() => {
  return userStore.isAdmin || userStore.isSpaceAdmin
})

const applyStarBIConfig = (payload: Record<string, any> = {}) => {
  const styleTokens = applyEmbeddedStyleTokens(payload.styleTokens || {})
  const title = payload.appName || styleTokens.brandName || STARBI_BRAND_NAME
  setTitle(title)
}

const communicationCb = async (event: any) => {
  if (parentOrigin.value && event.origin !== parentOrigin.value) {
    return
  }
  if (event.data?.eventName === eventName) {
    if (String(event.data?.messageId || '') !== currentMessageId.value) {
      return
    }
    if (event.data?.hostOrigin) {
      assistantStore.setHostOrigin(event.data?.hostOrigin)
    }
    if (event.data?.busiFlag) {
      busiFlag.value = String(event.data.busiFlag)
    }
    if (event.data?.busi == 'certificate') {
      const type = Number.parseInt(String(event.data['type'] || 4), 10) || 4
      const certificate = event.data['certificate']
      assistantStore.setType(type)
      assistantStore.setToken(certificate)
      assistantStore.setAssistant(true)
      await userStore.info()
      loading.value = false
      return
    }
    if (event.data?.busi == 'starbiConfig' && isStarBI.value) {
      applyStarBIConfig(event.data)
    }
  }
}

watch(
  () => loading.value,
  (val) => {
    nextTick(() => {
      setTimeout(() => {
        divLoading.value = val
      }, 1000)
    })
  }
)

const registerReady = (assistantId: any) => {
  window.addEventListener('message', communicationCb)
  const readyData = {
    eventName: 'sqlbot_embedded_event',
    busi: 'ready',
    ready: true,
    messageId: String(assistantId),
  }
  window.parent.postMessage(readyData, parentOrigin.value || '*')
}

onBeforeMount(async () => {
  const assistantId = route.query.id
  if (!assistantId) {
    ElMessage.error('Miss embedded id, please check embedded url')
    return
  }
  assistantStore.setType(4)
  const now = Date.now()
  assistantStore.setFlag(now)
  assistantStore.setId(assistantId?.toString() || '')
  assistantStore.setAssistant(true)
  if (isStarBI.value) {
    applyStarBIConfig()
  }
  registerReady(assistantId)
  return
})

onBeforeUnmount(() => {
  window.removeEventListener('message', communicationCb)
})
</script>

<style lang="less" scoped>
.sqlbot--embedded-page {
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  position: relative;
  background: var(--starbi-page-bg, #f5f6f7);
  box-sizing: border-box;
  overflow: auto;

  :deep(.model-config),
  :deep(.professional),
  :deep(.training) {
    min-height: 100vh;
    background: var(--starbi-surface-bg, #fff);
    color: var(--starbi-text-color, #1f2329);
  }

  :deep(.model-config .model-methods),
  :deep(.professional .tool-left),
  :deep(.training .tool-left) {
    justify-content: flex-end;
  }

  :deep(.model-config .model-methods .title),
  :deep(.professional .tool-left .page-title),
  :deep(.training .tool-left .page-title) {
    display: none;
  }

  &.is-starbi-embedded {
    height: 100vh;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 10px;
    background: #ffffff;
    overflow: hidden;

    :deep(.model-config),
    :deep(.professional),
    :deep(.training) {
      flex: 1;
      height: auto !important;
      min-height: auto;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #ffffff;
      padding: 0 !important;
    }

    :deep(.model-config .model-methods),
    :deep(.professional .tool-left),
    :deep(.training .tool-left) {
      flex-shrink: 0;
      min-height: 48px;
      margin-bottom: 10px;
      padding: 7px 10px !important;
      gap: 10px;
      align-items: center;
      border: 1px solid #dbe7f7;
      border-radius: 10px;
      background: linear-gradient(180deg, #fbfdff 0%, #f6f9fe 100%);
      box-sizing: border-box;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
    }

    :deep(.model-config .button-input),
    :deep(.professional .tool-row),
    :deep(.training .tool-row) {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      width: 100%;
    }

    :deep(.model-config .button-input .ed-button),
    :deep(.professional .tool-row .ed-button),
    :deep(.training .tool-row .ed-button) {
      height: 34px;
      min-height: 34px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }

    :deep(.model-config .button-input .ed-input),
    :deep(.professional .tool-row .ed-input),
    :deep(.training .tool-row .ed-input) {
      margin-right: 0 !important;
    }

    :deep(.model-config .button-input .ed-input) {
      width: clamp(240px, 22vw, 320px) !important;
    }

    :deep(.professional .tool-row .ed-input),
    :deep(.training .tool-row .ed-input) {
      width: clamp(260px, 24vw, 340px) !important;
    }

    :deep(.model-config .button-input .ed-input__wrapper),
    :deep(.professional .tool-row .ed-input__wrapper),
    :deep(.training .tool-row .ed-input__wrapper) {
      min-height: 34px;
      border-radius: 8px;
      background: #ffffff;
      box-shadow: 0 0 0 1px #d6dfec inset;
      font-size: 14px;
    }

    :deep(.model-config .card-content),
    :deep(.professional .table-content),
    :deep(.training .table-content) {
      flex: 1;
      min-height: 0;
      background: #ffffff;
      border: 1px solid #dbe7f7;
      border-radius: 12px;
      box-shadow: none;
      scrollbar-gutter: stable;
    }

    :deep(.model-config .card-content) {
      max-height: none;
      overflow: auto;
      padding: 14px 0 14px 14px;
      background:
        radial-gradient(circle at 18px 18px, rgba(31, 94, 255, 0.05) 0, rgba(31, 94, 255, 0.05) 1px, transparent 1px),
        linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
      background-size: 18px 18px, 100% 100%;
    }

    :deep(.professional .table-content),
    :deep(.training .table-content) {
      max-height: none;
      overflow: hidden;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    :deep(.professional .table-content.show-pagination_height),
    :deep(.training .table-content.show-pagination_height) {
      max-height: none;
    }

    :deep(.professional .preview-or-schema),
    :deep(.training .preview-or-schema) {
      flex: 1;
      min-height: 100%;
      border-radius: 12px;
      overflow: hidden;
      border: none;
      background: #ffffff;
    }

    :deep(.professional .preview-or-schema .ed-table),
    :deep(.training .preview-or-schema .ed-table) {
      height: 100%;
      font-size: 14px;
      color: #27364f;
    }

    :deep(.professional .preview-or-schema .ed-table__header-wrapper th),
    :deep(.training .preview-or-schema .ed-table__header-wrapper th) {
      height: 44px;
      background: #f7f9fc;
      color: #59687d;
      font-size: 14px;
      font-weight: 700;
    }

    :deep(.professional .preview-or-schema .ed-table__body-wrapper td),
    :deep(.training .preview-or-schema .ed-table__body-wrapper td) {
      padding: 11px 0;
      color: #27364f;
      font-size: 14px;
      border-bottom-color: #edf1f7;
    }

    :deep(.professional .preview-or-schema .ed-table__row:hover > td),
    :deep(.training .preview-or-schema .ed-table__row:hover > td) {
      background: #f8fbff;
    }

    :deep(.model-config .card-content .w-full) {
      width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
    }

    :deep(.model-config .card-content .mb-16) {
      flex: 0 0 33.333333% !important;
      max-width: 33.333333% !important;
      padding-left: 0 !important;
      padding-right: 14px !important;
      margin-bottom: 14px !important;
    }

    :deep(.model-config .card) {
      position: relative;
      min-height: 202px;
      height: auto;
      padding: 18px;
      overflow: hidden;
      border: 1px solid #d9e5f4;
      border-radius: 14px;
      background:
        linear-gradient(135deg, rgba(31, 94, 255, 0.045) 0%, rgba(255, 255, 255, 0) 42%),
        #ffffff;
      box-shadow: 0 8px 20px rgba(36, 76, 130, 0.07);
      transition:
        border-color 0.18s ease,
        box-shadow 0.18s ease,
        transform 0.18s ease;
    }

    :deep(.model-config .card::after) {
      content: '';
      position: absolute;
      right: -44px;
      top: -54px;
      width: 128px;
      height: 128px;
      border-radius: 999px;
      background: rgba(47, 107, 255, 0.08);
      pointer-events: none;
    }

    :deep(.model-config .card:hover) {
      transform: translateY(-1px);
      border-color: rgba(31, 94, 255, 0.32);
      box-shadow: 0 14px 32px rgba(36, 76, 130, 0.12);
    }

    :deep(.model-config .card .name-icon) {
      position: relative;
      z-index: 1;
      margin-bottom: 16px;
    }

    :deep(.model-config .card .name-icon img) {
      width: 38px;
      height: 38px;
      padding: 5px;
      border-radius: 11px;
      background: #eff5ff;
      box-sizing: border-box;
    }

    :deep(.model-config .card .name-icon .name) {
      font-size: 17px;
      line-height: 24px;
      font-weight: 700;
      color: #15233d;
    }

    :deep(.model-config .card .name-icon .default) {
      height: 24px;
      padding: 0 8px;
      border-radius: 999px;
      background: #e8f0ff;
      color: #1f5eff;
      font-weight: 700;
      line-height: 24px;
    }

    :deep(.model-config .card .type-value) {
      position: relative;
      z-index: 1;
      margin-top: 10px;
      font-size: 14px;
      line-height: 22px;
    }

    :deep(.model-config .card .type-value .type) {
      min-width: 70px;
      color: #6b778c;
    }

    :deep(.model-config .card .type-value .value) {
      margin-left: 18px;
      color: #27364f;
      font-weight: 600;
    }

    :deep(.model-config .card .methods) {
      position: relative;
      z-index: 1;
      display: flex !important;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(4px);
      transition:
        opacity 0.16s ease,
        transform 0.16s ease,
        visibility 0.16s ease;
    }

    :deep(.model-config .card:hover .methods) {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    :deep(.model-config .card .methods .ed-button) {
      height: 30px;
      min-height: 30px;
      padding: 0 10px;
      border-radius: 8px;
      background: #ffffff;
      border-color: #d6dfec;
      color: #45536a;
      font-weight: 600;
    }

    :deep(.model-config .card .methods .ed-button:hover) {
      border-color: #9bb8ff;
      color: #1f5eff;
      background: #f4f8ff;
    }

    :deep(.professional .pagination-container),
    :deep(.training .pagination-container),
    :deep(.model-config .datasource-yet) {
      flex-shrink: 0;
    }

    :deep(.professional .pagination-container),
    :deep(.training .pagination-container) {
      margin-top: 10px;
      padding: 0 2px;
    }

    :deep(.professional .bottom-select),
    :deep(.training .bottom-select) {
      position: sticky;
      left: 0;
      bottom: 0;
      width: 100%;
      height: auto;
      min-height: 64px;
      margin-top: 12px;
      padding: 12px 20px;
      border-radius: 12px;
      border: 1px solid var(--starbi-border-color, rgba(31, 35, 41, 0.12));
      border-top: 1px solid var(--starbi-border-color, rgba(31, 35, 41, 0.12));
      box-shadow: 0 8px 24px rgba(31, 35, 41, 0.04);
      background: var(--starbi-surface-bg, #fff);
      z-index: 2;
    }

    :deep(.model-config .datasource-yet),
    :deep(.training .datasource-yet) {
      min-height: 300px;
      height: auto;
      padding-top: 48px;
      border-radius: 12px;
      border: 1px dashed #cfd9e8;
      background: #fbfdff;
    }

    :deep(.professional .ed-empty),
    :deep(.training .ed-empty),
    :deep(.model-config .ed-empty) {
      min-height: 280px;
      margin: 0;
    }

    :deep(.page-401) {
      min-height: calc(100vh - 44px);
      border-radius: 12px;
      border: 1px solid var(--starbi-border-color, rgba(31, 35, 41, 0.12));
      background: var(--starbi-surface-bg, #fff);
      box-shadow: 0 8px 24px rgba(31, 35, 41, 0.04);
    }
  }
}

@media screen and (max-width: 960px) {
  .sqlbot--embedded-page.is-starbi-embedded {
    padding: 10px;

    :deep(.model-config .button-input),
    :deep(.professional .tool-row),
    :deep(.training .tool-row) {
      justify-content: flex-start;
    }

    :deep(.model-config .card-content .mb-16) {
      flex-basis: 100% !important;
      max-width: 100% !important;
    }
  }
}

@media screen and (min-width: 961px) and (max-width: 1500px) {
  .sqlbot--embedded-page.is-starbi-embedded {
    :deep(.model-config .card-content .mb-16) {
      flex-basis: 50% !important;
      max-width: 50% !important;
    }
  }
}
</style>
