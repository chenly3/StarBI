<template>
  <chat-component
    ref="chatRef"
    :start-chat-ds-id="startChatDsId"
    :page-embedded="embedMode"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeMount, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import ChatComponent from '@/views/chat/index.vue'
import { assistantApi } from '@/api/assistant'
import { useAssistantStore } from '@/stores/assistant'
import {
  applyEmbeddedStyleTokens,
  isStarBIPageMode,
  resolveParentOrigin,
  setCurrentColor,
  setTitle,
  STARBI_BRAND_NAME,
} from '@/utils/utils'

const route = useRoute()
const assistantStore = useAssistantStore()
const chatRef = ref<any>(null)

const assistantId = computed(() => String(route.query.id || ''))
const embedMode = computed(() => {
  const raw = String(route.query.embed || '').toLowerCase()
  return raw === '1' || raw === 'true'
})
const isStarBI = computed(() => isStarBIPageMode(route.query.pageMode))
const startChatDsId = computed(() => {
  const raw = route.query.start_chat
  if (raw === undefined || raw === null || raw === '') {
    return undefined
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
})

const parentOrigin = computed(() => resolveParentOrigin(assistantStore.getHostOrigin))
const currentMessageId = computed(() => assistantId.value)

const pendingQuickAsk = ref('')
const pendingCreateConversation = ref(false)

const flushPendingActions = async () => {
  if (!chatRef.value) {
    return
  }
  if (pendingCreateConversation.value) {
    pendingCreateConversation.value = false
    await chatRef.value?.createNewChat?.()
  }
  if (pendingQuickAsk.value) {
    const q = pendingQuickAsk.value
    pendingQuickAsk.value = ''
    await chatRef.value?.quickAsk?.(q)
  }
}

const applyStarBIConfig = (payload: Record<string, any> = {}) => {
  const styleTokens = applyEmbeddedStyleTokens(payload.styleTokens || {})
  const primaryColor = styleTokens.primaryColor || '#3370ff'
  const appName = payload.appName || styleTokens.brandName || STARBI_BRAND_NAME
  setTitle(appName)
  nextTick(() => {
    const ele = document.querySelector('body') as HTMLElement
    setCurrentColor(primaryColor, ele)
  })
}

const communicationCb = async (event: MessageEvent) => {
  if (parentOrigin.value && event.origin !== parentOrigin.value) {
    return
  }
  if (event.data?.eventName !== 'sqlbot_embedded_event') {
    return
  }
  if (String(event.data?.messageId || '') !== currentMessageId.value) {
    return
  }

  if (event.data?.hostOrigin) {
    assistantStore.setHostOrigin(String(event.data.hostOrigin))
  }

  if (event.data?.busi === 'certificate') {
    const certificate = String(event.data?.certificate || '')
    // Always keep certificate in sync; SQLBot backend uses it to fetch StarBI datasources.
    assistantStore.setCertificate(certificate)
    assistantStore.resolveCertificate(certificate)
    await flushPendingActions()
    return
  }

  if (event.data?.busi === 'starbiConfig' && isStarBI.value) {
    applyStarBIConfig(event.data || {})
    return
  }

  if (event.data?.busi === 'createConversation') {
    if (!assistantStore.getCertificate) {
      pendingCreateConversation.value = true
      return
    }
    await chatRef.value?.createNewChat?.()
    return
  }

  if (event.data?.busi === 'quickAsk') {
    const question = String(event.data?.question || '').trim()
    if (!question) {
      return
    }
    if (!assistantStore.getCertificate) {
      pendingQuickAsk.value = question
      return
    }
    await chatRef.value?.quickAsk?.(question)
  }
}

const registerReady = () => {
  window.addEventListener('message', communicationCb)
  const readyData = {
    eventName: 'sqlbot_embedded_event',
    busi: 'ready',
    ready: true,
    messageId: currentMessageId.value,
  }
  window.parent.postMessage(readyData, parentOrigin.value || '*')
}

const initEmbeddedAssistant = async () => {
  if (!embedMode.value) {
    return
  }
  if (!assistantId.value) {
    return
  }

  // Make /chat/index act like an embedded page, driven by parent postMessage.
  assistantStore.setPageEmbedded(true)
  assistantStore.setType(1) // odd => frontend will attach certificate header
  assistantStore.setHistory(route.query.history !== 'false')
  assistantStore.setFlag(Date.now())
  assistantStore.setId(assistantId.value)

  if (isStarBI.value) {
    applyStarBIConfig()
  }

  const validator = await assistantApi.validate({
    id: assistantId.value,
    virtual: assistantStore.getFlag,
    online: route.query.online,
  })
  assistantStore.setToken(validator?.token || '')
  assistantStore.setAssistant(true)

  registerReady()
}

onBeforeMount(() => {
  void initEmbeddedAssistant()
})

onBeforeUnmount(() => {
  window.removeEventListener('message', communicationCb)
})
</script>

