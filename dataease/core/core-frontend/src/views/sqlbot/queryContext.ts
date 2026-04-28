import { Base64 } from 'js-base64'
import { useCache } from '@/hooks/web/useCache'

const { wsCache } = useCache('localStorage')

export const STARBI_QUERY_ROUTE = '/sqlbot/index'

export const normalizeSqlBotDomain = (domain?: string) => {
  if (!domain) {
    return ''
  }
  return domain.endsWith('/') ? domain.slice(0, -1) : domain
}

export const resolveSqlBotOrigin = (domain?: string) => {
  const normalizedDomain = normalizeSqlBotDomain(domain)
  if (!normalizedDomain) {
    return ''
  }
  try {
    return new URL(normalizedDomain).origin
  } catch (error) {
    console.error('resolve SQLBot origin failed', error)
    return ''
  }
}

export const encodeStarBIContext = (payload: Record<string, any> | Array<any>) => {
  return encodeURIComponent(Base64.encode(JSON.stringify(payload || {})))
}

export const decodeStarBIContext = <T = any>(value: unknown, fallback: T): T => {
  if (!value) {
    return fallback
  }
  const rawValue = Array.isArray(value) ? value[0] : value
  try {
    return JSON.parse(Base64.decode(decodeURIComponent(String(rawValue)))) as T
  } catch (error) {
    console.error('decode StarBI context failed', error)
    return fallback
  }
}

const walkDashboardComponents = (components: any[] = [], collector: any[] = []) => {
  components.forEach(component => {
    if (component?.innerType === 'VQuery') {
      collector.push({
        id: component.id ? String(component.id) : '',
        name: component.label || component.title || component.options?.name || component.component,
        component: component.component,
        innerType: component.innerType,
        value: component.options?.value ?? component.propValue ?? null
      })
    }
    if (component?.component === 'DeTabs' && Array.isArray(component?.propValue)) {
      component.propValue.forEach(tabItem => {
        walkDashboardComponents(tabItem?.componentData || [], collector)
      })
    }
  })
  return collector
}

export const buildDashboardFilterSnapshot = (componentData: any[] = []) => {
  return walkDashboardComponents(componentData, [])
}

export const buildDashboardQueryRoute = (options: {
  dashboardId?: string | number
  dashboardName?: string
  componentData?: any[]
  sourceWidget?: string
  themeId?: string
}) => {
  const filterSnapshot = buildDashboardFilterSnapshot(options.componentData || [])
  return {
    path: STARBI_QUERY_ROUTE,
    query: {
      entryScene: 'dashboard_query',
      dashboardId: options.dashboardId ? String(options.dashboardId) : undefined,
      dashboardName: options.dashboardName || undefined,
      sourceWidget: options.sourceWidget || 'dashboard',
      themeId: options.themeId || undefined,
      filterSnapshot: filterSnapshot.length ? encodeStarBIContext(filterSnapshot) : undefined
    }
  }
}

export const buildStarBIStyleTokens = (overrides: Record<string, any> = {}) => {
  const rootStyles = getComputedStyle(document.documentElement)
  const fontFamily = rootStyles.getPropertyValue('--de-custom_font').trim()
  return {
    brandName: 'StarBI',
    primaryColor: '#3370ff',
    pageBg: '#f5f6f7',
    surfaceBg: '#ffffff',
    borderColor: 'rgba(31, 35, 41, 0.12)',
    textColor: '#1f2329',
    mutedColor: '#646a73',
    radius: '6px',
    fontFamily: fontFamily
      ? `${fontFamily}, "PingFang SC", "Microsoft YaHei", sans-serif`
      : '"PingFang SC", "Microsoft YaHei", sans-serif',
    ...overrides
  }
}

export const buildSqlBotCertificate = (options: {
  datasetIds: string[]
  datasourceId?: string
  entryScene: string
  themeId?: string
  themeName?: string
  dashboardId?: string
  dashboardName?: string
  filterSnapshot?: string
  sourceWidget?: string
}) => {
  const userToken = wsCache.get('user.token')
  const certificateItems: Array<Record<string, string>> = []
  const normalizedDatasourceId = String(options.datasourceId ?? '').trim()

  if (userToken) {
    certificateItems.push({
      target: 'header',
      key: 'X-DE-TOKEN',
      value: userToken
    })
  }

  if (options.datasetIds?.length) {
    certificateItems.push({
      target: 'param',
      key: 'datasetIds',
      value: options.datasetIds.join(',')
    })
  }

  if (
    normalizedDatasourceId &&
    normalizedDatasourceId !== 'null' &&
    normalizedDatasourceId !== 'undefined'
  ) {
    certificateItems.push({
      target: 'param',
      key: 'dsId',
      value: normalizedDatasourceId
    })
  }

  ;[
    ['entryScene', options.entryScene],
    ['themeId', options.themeId],
    ['themeName', options.themeName],
    ['dashboardId', options.dashboardId],
    ['dashboardName', options.dashboardName],
    ['filterSnapshot', options.filterSnapshot],
    ['sourceWidget', options.sourceWidget]
  ].forEach(([key, value]) => {
    if (value) {
      certificateItems.push({
        target: 'param',
        key,
        value: String(value)
      })
    }
  })

  return JSON.stringify(certificateItems)
}
