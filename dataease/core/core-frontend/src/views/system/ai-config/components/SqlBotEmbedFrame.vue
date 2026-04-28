<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from '@/hooks/web/useI18n'
import { getSQLBotAdminEmbedConfig } from '@/api/aiQueryTheme'
import {
  buildStarBIStyleTokens,
  normalizeSqlBotDomain,
  resolveSqlBotOrigin
} from '@/views/sqlbot/queryContext'

const props = defineProps({
  pageKey: {
    type: String,
    required: true
  },
  pageTitle: {
    type: String,
    default: ''
  }
})

const { t } = useI18n()
const iframeRef = ref<HTMLIFrameElement | null>(null)
const loading = ref(true)
const status = ref<'loading' | 'ready' | 'timeout' | 'unavailable'>('loading')
const frameVersion = ref(0)
const lastReadyAt = ref('')
let loadTimer = 0

const state = reactive({
  domain: '',
  id: '',
  token: '',
  valid: false,
  enabled: false,
  error: ''
})

const pageLabel = computed(() => {
  if (props.pageTitle) {
    return props.pageTitle
  }
  const pageKeyMap: Record<string, string> = {
    model: 'starbi.ai_model_config',
    professional: 'starbi.term_config',
    training: 'starbi.sql_example_config'
  }
  return t(pageKeyMap[props.pageKey] || 'starbi.ai_config_group')
})

const frameSrc = computed(() => {
  if (!state.domain || !state.id) {
    return ''
  }
  const baseDomain = normalizeSqlBotDomain(state.domain)
  return `${baseDomain}/#/embeddedCommon?id=${state.id}&page=${props.pageKey}&pageMode=starbi&_v=${frameVersion.value}`
})

const targetOrigin = computed(() => resolveSqlBotOrigin(state.domain))
const currentMessageId = computed(() => String(state.id || ''))

const statusText = computed(() => {
  const statusMap = {
    loading: t('starbi.ai_embed_connecting'),
    ready: t('starbi.ai_embed_ready'),
    timeout: t('starbi.ai_embed_timeout'),
    unavailable: t('starbi.ai_embed_unavailable')
  }
  return statusMap[status.value]
})

const embedHint = computed(() => {
  if (status.value === 'timeout') {
    return t('starbi.ai_embed_timeout_desc')
  }
  if (status.value === 'ready' && lastReadyAt.value) {
    return t('starbi.ai_embed_last_ready', [new Date(lastReadyAt.value).toLocaleString()])
  }
  if (status.value === 'loading') {
    return t('starbi.ai_embed_loading_desc')
  }
  return t('starbi.check_starbi_connection')
})

const clearLoadTimer = () => {
  if (loadTimer) {
    window.clearTimeout(loadTimer)
    loadTimer = 0
  }
}

const beginLoading = () => {
  clearLoadTimer()
  loading.value = true
  status.value = 'loading'
  state.error = ''
  loadTimer = window.setTimeout(() => {
    loading.value = false
    status.value = 'timeout'
    state.error = t('starbi.ai_embed_timeout')
  }, 15000)
}

const sendCertificate = () => {
  const targetWindow = iframeRef.value?.contentWindow
  if (!targetWindow || !state.id || !state.token) {
    return
  }
  const styleTokens = buildStarBIStyleTokens()
  const baseMessage = {
    eventName: 'sqlbot_embedded_event',
    messageId: currentMessageId.value,
    hostOrigin: window.location.origin,
    busiFlag: props.pageKey
  }

  targetWindow.postMessage(
    {
      ...baseMessage,
      busi: 'certificate',
      type: 4,
      certificate: state.token
    },
    targetOrigin.value || '*'
  )

  targetWindow.postMessage(
    {
      ...baseMessage,
      busi: 'starbiConfig',
      styleTokens
    },
    targetOrigin.value || '*'
  )
}

const handleMessage = (event: MessageEvent) => {
  if (event.data?.eventName !== 'sqlbot_embedded_event') {
    return
  }
  if (targetOrigin.value && event.origin !== targetOrigin.value) {
    return
  }
  if (String(event.data?.messageId || '') !== currentMessageId.value) {
    return
  }
  if (event.data?.busi === 'ready') {
    clearLoadTimer()
    sendCertificate()
    status.value = 'ready'
    lastReadyAt.value = new Date().toISOString()
    state.error = ''
    loading.value = false
  }
}

const loadConfig = async () => {
  beginLoading()
  try {
    const config = await getSQLBotAdminEmbedConfig(props.pageKey)
    state.domain = config?.domain || ''
    state.id = String(config?.id || '')
    state.token = config?.token || ''
    state.enabled = config?.enabled !== false
    state.valid = config?.valid !== false
    if (!state.domain || !state.id || !state.token || !state.enabled || !state.valid) {
      clearLoadTimer()
      status.value = 'unavailable'
      state.error = t('starbi.ai_embed_unavailable')
      loading.value = false
      return
    }
    frameVersion.value += 1
  } catch (error) {
    clearLoadTimer()
    console.error(error)
    status.value = 'unavailable'
    state.error = t('starbi.ai_embed_unavailable')
    loading.value = false
  }
}

const reloadEmbed = async () => {
  await loadConfig()
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
  loadConfig()
})

onBeforeUnmount(() => {
  clearLoadTimer()
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="sqlbot-embed-shell">
    <div class="embed-body">
      <div v-if="loading && !state.error" class="embed-loading-mask">
        <div class="embed-status-panel">
          <div class="embed-loading-title">{{ statusText }}</div>
          <div class="embed-loading-desc">{{ embedHint }}</div>
        </div>
      </div>
      <div v-if="state.error" class="embed-state">
        <div class="embed-status-panel">
          <div class="embed-state-title">{{ state.error }}</div>
          <div class="embed-state-desc">{{ embedHint }}</div>
          <div class="embed-state-actions">
            <el-button secondary @click="reloadEmbed">{{ t('starbi.ai_embed_refresh') }}</el-button>
            <el-button type="primary" @click="reloadEmbed">{{
              t('starbi.ai_embed_retry')
            }}</el-button>
          </div>
        </div>
      </div>
      <iframe
        v-else-if="frameSrc"
        ref="iframeRef"
        class="sqlbot-embed-frame"
        :src="frameSrc"
        :title="pageLabel"
        frameborder="0"
      />
    </div>
  </div>
</template>

<style lang="less" scoped>
.sqlbot-embed-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(31, 35, 41, 0.08);
  box-shadow: 0 8px 24px rgba(31, 35, 41, 0.04);

  .embed-body {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #fff;
  }

  .embed-loading-mask {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(2px);
  }

  .embed-state {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px;
    color: #646a73;
  }

  .embed-status-panel {
    width: min(100%, 560px);
    padding: 28px 32px;
    border: 1px solid #e6ebf2;
    border-radius: 18px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
    box-shadow: 0 14px 32px rgba(15, 23, 42, 0.06);
    text-align: center;
  }

  .embed-loading-title,
  .embed-state-title {
    color: #1f2329;
    font-size: 20px;
    line-height: 30px;
    font-weight: 600;
  }

  .embed-loading-desc,
  .embed-state-desc {
    margin-top: 10px;
    color: #646a73;
    font-size: 14px;
    line-height: 24px;
  }

  .embed-state-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 24px;
  }

  .sqlbot-embed-frame {
    width: 100%;
    height: 100%;
    border: none;
    display: block;
    background: #fff;
  }
}

@media screen and (max-width: 1200px) {
  .sqlbot-embed-shell {
    .embed-state-actions {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
}
</style>
