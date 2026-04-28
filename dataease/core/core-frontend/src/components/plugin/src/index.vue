<script lang="ts" setup>
import noLic from './nolic.vue'
import { ref, useAttrs, onMounted } from 'vue'
import { execute, randomKey, formatArray } from './convert'
import { load, loadDistributed } from '@/api/plugin'
import configGlobal from '@/components/config-global/src/ConfigGlobal.vue'
import { useCache } from '@/hooks/web/useCache'
import { i18n } from '@/plugins/vue-i18n'
import * as Vue from 'vue'
import * as Pinia from 'pinia'
import * as echarts from 'echarts'
import router from '@/router'
import tinymce from 'tinymce/tinymce'
import { useEmitt } from '@/hooks/web/useEmitt'
import { isNull } from '@/utils/utils'
import { loadDistributedFlag } from './distributed'
import { service } from '@/config/axios/service'

const { wsCache } = useCache()

const plugin = ref()

const loading = ref(false)

const attrs = useAttrs()

const showNolic = () => {
  plugin.value = noLic
  loading.value = false
}
const generateRamStr = (len: number) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let randomStr = ''
  for (var i = 0; i < len; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return randomStr
}

const importProxy = (bytesArray: any[]) => {
  const promise = import(
    `../../../../../../${formatArray(bytesArray[6])}/${formatArray(bytesArray[7])}/${formatArray(
      bytesArray[8]
    )}/${formatArray(bytesArray[9])}/${formatArray(bytesArray[10])}.vue`
  )
  promise
    .then((res: any) => {
      plugin.value = res.default
    })
    .catch(e => {
      console.error(e)
      showNolic()
    })
}

const loadXpack = async () => {
  if (window['DEXPack']) {
    const xpack = await window['DEXPack'].mapping[attrs.jsname]
    if (xpack?.default) {
      plugin.value = xpack.default
    }
  }
}

useEmitt({
  name: 'load-xpack',
  callback: loadXpack
})

const loadComponent = () => {
  loading.value = true
  const byteArray = wsCache.get(`de-plugin-proxy`)
  if (byteArray) {
    importProxy(JSON.parse(byteArray))
    loading.value = false
    return
  }
  const key = generateRamStr(randomKey())
  load(key)
    .then(response => {
      let code = response.data
      const byteArray = execute(code, key)
      storeCacheProxy(byteArray)
      importProxy(byteArray)
    })
    .catch(() => {
      emits('loadFail')
      showNolic()
    })
    .finally(() => {
      loading.value = false
    })
}
const storeCacheProxy = byteArray => {
  const result = []
  byteArray.forEach(item => {
    result.push([...item])
  })
  wsCache.set(`de-plugin-proxy`, JSON.stringify(result))
}
const pluginProxy = ref(null)
const invokeMethod = param => {
  if (pluginProxy.value && pluginProxy.value['invokeMethod']) {
    pluginProxy.value['invokeMethod'](param)
    return true
  } else if (param.methodName && pluginProxy.value[param.methodName]) {
    pluginProxy.value[param.methodName](param.args)
    return true
  }
  return false
}
const emits = defineEmits(['loadFail'])
defineExpose({
  invokeMethod
})

const prepareDistributedRuntime = () => {
  window['Vue'] = Vue
  window['VueDe'] = Vue
  window['AxiosDe'] = service
  window['PiniaDe'] = Pinia
  window['vueRouterDe'] = router
  window['MittAllDe'] = useEmitt().emitter.all
  window['I18nDe'] = i18n
  window['EchartsDE'] = echarts
  if (!window.tinymce) {
    window.tinymce = tinymce
  }
}

const resolveDistributedPlugin = async () => {
  const existingPlugin = window['DEXPack']?.mapping?.[attrs.jsname]
  if (existingPlugin?.default) {
    plugin.value = existingPlugin.default
    return true
  }

  if (!window['de_xpack_load_promise']) {
    window['de_xpack_load_promise'] = loadDistributed()
      .then(res => {
        new Function(res.data)()
        useEmitt().emitter.emit('load-xpack')
      })
      .catch((error: unknown) => {
        window['de_xpack_load_promise'] = null
        throw error
      })
  }

  await window['de_xpack_load_promise']
  const loadedPlugin = window['DEXPack']?.mapping?.[attrs.jsname]
  if (loadedPlugin?.default) {
    plugin.value = loadedPlugin.default
    return true
  }
  return false
}

onMounted(async () => {
  loading.value = true
  const distributed = await loadDistributedFlag(wsCache)

  try {
    if (distributed === true || (distributed === null && import.meta.env.DEV)) {
      prepareDistributedRuntime()
      const loaded = await resolveDistributedPlugin()
      if (!loaded) {
        emits('loadFail')
      }
      return
    }

    if (isNull(distributed)) {
      setTimeout(() => {
        emits('loadFail')
        loading.value = false
      }, 1000)
      return
    }

    if (distributed) {
      const xpack = await window['DEXPack']?.mapping?.[attrs.jsname]
      if (xpack?.default) {
        plugin.value = xpack.default
        return
      }
      emits('loadFail')
      return
    }

    loadComponent()
  } catch (error) {
    emits('loadFail')
    console.error(error)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <configGlobal>
    <component
      :key="attrs.jsname"
      ref="pluginProxy"
      :is="plugin"
      v-loading="loading"
      v-bind="attrs"
    ></component>
  </configGlobal>
</template>
