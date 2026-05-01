import { i18n } from '@/plugins/vue-i18n'
import { getCurrentInstance } from 'vue'

type I18nGlobalTranslation = {
  (key: string): string
  (key: string, locale: string): string
  (key: string, locale: string, list: unknown[]): string
  (key: string, locale: string, named: Record<string, unknown>): string
  (key: string, list: unknown[]): string
  (key: string, named: Record<string, unknown>): string
}

type I18nTranslationRestParameters = [string, any]

const getKey = (namespace: string | undefined, key: string) => {
  if (!namespace) {
    return key
  }
  if (key.startsWith(namespace)) {
    return key
  }
  return `${namespace}.${key}`
}

export const useI18n = (
  namespace?: string
): {
  t: I18nGlobalTranslation
} => {
  const instance = getCurrentInstance()
  const componentT = instance?.appContext.config.globalProperties?.$t

  const tFn: I18nGlobalTranslation = (key: string, ...arg: any[]) => {
    if (!key) return ''
    if (!key.includes('.') && !namespace) return key
    const i18nKey = getKey(namespace, key)
    const globalI18n = i18n?.global
    const translate = componentT || globalI18n?.t
    if (!translate) return i18nKey
    return (translate as any)(i18nKey, ...(arg as I18nTranslationRestParameters))
  }
  return {
    ...(i18n?.global || {}),
    t: tFn
  }
}

export const t: I18nGlobalTranslation = (key: string, ...arg: any[]) => {
  if (!key) return ''
  const globalI18n = i18n?.global
  if (!globalI18n?.t) return key
  return (globalI18n.t as any)(key, ...(arg as I18nTranslationRestParameters))
}
