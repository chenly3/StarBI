<template>
  <div
    v-loading="divLoading"
    :class="dynamicType === 4 ? 'sqlbot--embedded-page' : 'sqlbot-embedded-assistant-page'"
  >
    <chat-component
      v-if="!loading"
      ref="chatRef"
      :welcome="customSet.welcome"
      :welcome-desc="customSet.welcome_desc"
      :logo-assistant="logo"
      :page-embedded="true"
      :app-name="customSet.name"
    />
  </div>
</template>
<script setup lang="ts">
import ChatComponent from '@/views/chat/index.vue'
import { computed, nextTick, onBeforeMount, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { assistantApi } from '@/api/assistant'
import { useAssistantStore } from '@/stores/assistant'
import { useAppearanceStoreWithOut } from '@/stores/appearance'
import { request } from '@/utils/request'
import {
  applyEmbeddedStyleTokens,
  isStarBIPageMode,
  resolveParentOrigin,
  setCurrentColor,
  setTitle,
  STARBI_BRAND_NAME,
} from '@/utils/utils'
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()
const chatRef = ref()
const appearanceStore = useAppearanceStoreWithOut()
const assistantStore = useAssistantStore()
assistantStore.setPageEmbedded(true)
const route = useRoute()
const assistantName = ref('')
const dynamicType = ref(0)
const isStarBI = computed(() => isStarBIPageMode(route.query.pageMode))
const customSet = reactive({
  name: STARBI_BRAND_NAME,
  welcome: 'Hello, I am your StarBI AI analyst',
  welcome_desc: 'I can help you query data, generate charts, and continue analysis in context.',
  theme: '#3370ff',
  header_font_color: '#1F2329',
}) as { [key: string]: any }
const logo = ref()
const basePath = import.meta.env.VITE_API_BASE_URL
const baseUrl = basePath + '/system/assistant/picture/'
const validator = ref({
  id: '',
  valid: false,
  id_match: false,
  token: '',
})
const loading = ref(true)
const divLoading = ref(true)
const eventName = 'sqlbot_embedded_event'
const parentOrigin = computed(() => resolveParentOrigin(assistantStore.getHostOrigin))
const currentMessageId = computed(() => String(route.query.id || ''))
const pendingQuickAsk = ref('')
const pendingCreateConversation = ref(false)

const flushPendingActions = async () => {
  if (loading.value || !chatRef.value) {
    return
  }
  if (pendingCreateConversation.value) {
    pendingCreateConversation.value = false
    await createChat()
  }
  if (pendingQuickAsk.value) {
    const question = pendingQuickAsk.value
    pendingQuickAsk.value = ''
    await quickAsk(question)
  }
}

const applyStarBIConfig = (payload: Record<string, any> = {}) => {
  const styleTokens = applyEmbeddedStyleTokens(payload.styleTokens || {})
  customSet.name = payload.appName || styleTokens.brandName || STARBI_BRAND_NAME
  customSet.welcome = payload.welcome || customSet.welcome
  customSet.welcome_desc = payload.welcomeDesc || payload.welcome_desc || customSet.welcome_desc
  customSet.theme = styleTokens.primaryColor || customSet.theme
  customSet.header_font_color = styleTokens.textColor || customSet.header_font_color
  appearanceStore.name = customSet.name
  setTitle(customSet.name)
  nextTick(() => {
    setPageCustomColor(customSet.theme)
  })
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
    if (event.data?.busi == 'certificate') {
      const type =
        Number.parseInt(
          String(event.data['type'] || assistantStore.getType || dynamicType.value || 1),
          10
        ) ||
        dynamicType.value ||
        1
      const certificate = event.data['certificate']
      assistantStore.setType(type)
      if (type === 4) {
        assistantStore.setToken(certificate)
        assistantStore.setAssistant(true)
        await userStore.info()
        loading.value = false
        return
      }
      assistantStore.setCertificate(certificate)
      assistantStore.resolveCertificate(certificate)
    }
    if (event.data?.busi == 'starbiConfig' && isStarBI.value) {
      applyStarBIConfig(event.data)
    }
    if (event.data?.busi == 'setOnline') {
      setFormatOnline(event.data.online)
    }
    if (event.data?.busi == 'setHistory') {
      assistantStore.setHistory(event.data.show ?? true)
    }
    if (event.data?.busi == 'setExternalComposer') {
      assistantStore.setExternalComposer(event.data.show ?? false)
    }
    if (event.data?.busi == 'setModel') {
      assistantStore.setSelectedModel(
        String(event.data?.modelId || ''),
        String(event.data?.modelName || '')
      )
    }
    if (event.data?.busi == 'createConversation') {
      if (loading.value || !chatRef.value) {
        pendingCreateConversation.value = true
      } else {
        await createChat()
      }
    }
    if (event.data?.busi == 'quickAsk') {
      const question = event.data?.question
      if (question) {
        if (loading.value || !chatRef.value) {
          pendingQuickAsk.value = question
        } else {
          await quickAsk(question)
        }
      }
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
      if (!val) {
        void flushPendingActions()
      }
    })
  }
)
const createChat = async () => {
  await chatRef.value?.createNewChat?.()
}

const quickAsk = async (question: string) => {
  await chatRef.value?.quickAsk?.(question)
}
const setFormatOnline = (text?: any) => {
  if (text === null || typeof text === 'undefined') {
    assistantStore.setOnline(false)
    return
  }
  if (typeof text === 'boolean') {
    assistantStore.setOnline(text)
    return
  }
  if (typeof text === 'string') {
    assistantStore.setOnline(text.toLowerCase() === 'true')
    return
  }
  assistantStore.setOnline(false)
}

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

const setPageCustomColor = (val: any) => {
  const ele = document.querySelector('body') as HTMLElement
  setCurrentColor(val, ele)
}

onBeforeMount(async () => {
  const assistantId = route.query.id
  if (!assistantId) {
    ElMessage.error('Miss embedded id, please check embedded url')
    return
  }
  if (isStarBI.value) {
    applyStarBIConfig()
  }
  const typeParam = route.query.type
  let assistantType = 2
  if (typeParam) {
    assistantType = parseInt(typeParam.toString())
    assistantStore.setType(assistantType)
  }
  dynamicType.value = assistantType
  const online = route.query.online
  setFormatOnline(online)

  const history: boolean = route.query.history !== 'false'
  assistantStore.setHistory(history)

  let name = route.query.name
  if (name) {
    assistantName.value = decodeURIComponent(name.toString())
  }
  let userFlag = route.query.userFlag
  if (userFlag && userFlag === '1') {
    userFlag = '100001'
  }
  const now = Date.now()
  assistantStore.setFlag(now)
  assistantStore.setId(assistantId?.toString() || '')
  if (assistantType === 4) {
    assistantStore.setAssistant(true)
    registerReady(assistantId)
    return
  }
  const param = {
    id: assistantId,
    virtual: userFlag || assistantStore.getFlag,
    online,
  }
  validator.value = await assistantApi.validate(param)
  assistantStore.setToken(validator.value.token)
  assistantStore.setAssistant(true)
  loading.value = false

  registerReady(assistantId)

  request.get(`/system/assistant/${assistantId}`).then((res) => {
    if (res?.configuration) {
      const rawData = JSON.parse(res?.configuration)
      assistantStore.setAutoDs(rawData?.auto_ds)
      if (!isStarBI.value && rawData.logo) {
        logo.value = baseUrl + rawData.logo
      }

      for (const key in customSet) {
        if (isStarBI.value && ['name', 'welcome', 'welcome_desc'].includes(key)) {
          continue
        }
        if (
          Object.prototype.hasOwnProperty.call(customSet, key) &&
          ![null, undefined].includes(rawData[key])
        ) {
          customSet[key] = rawData[key]
        }
      }

      if (!rawData.theme) {
        const { customColor, themeColor } = appearanceStore
        const currentColor =
          themeColor === 'custom' && customColor
            ? customColor
            : themeColor === 'blue'
              ? '#3370ff'
              : '#1CBA90'
        customSet.theme = currentColor || customSet.theme
      }

      nextTick(() => {
        setPageCustomColor(customSet.theme)
        setTitle(customSet.name || STARBI_BRAND_NAME)
      })
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('message', communicationCb)
})
</script>

<style lang="less" scoped>
.sqlbot--embedded-page {
  width: 100%;
  height: 100vh;
  position: relative;
  background: var(--starbi-surface-bg, #fff);
}
.sqlbot-embedded-assistant-page {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background: var(--starbi-page-bg, #f5f6f7);
  box-sizing: border-box;
  overflow: auto;

  :deep(.chat-container) {
    background: transparent;
  }

  :deep(.chat-record-list) {
    background: var(--starbi-surface-bg, #fff);
  }
}
</style>
