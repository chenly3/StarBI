import { reactive, watch } from 'vue'

type LocationQueryValue = string | null
type LocationQuery = Record<string, LocationQueryValue | LocationQueryValue[]>

type RouteState = {
  path: string
  query: LocationQuery
  params: Record<string, string | string[]>
}

type NavigationTarget =
  | string
  | {
      path?: string
      query?: Record<string, unknown>
    }

type HostRouter = {
  currentRoute?: {
    value?: {
      path?: string
      query?: LocationQuery
      params?: Record<string, string | string[]>
    }
  }
  push?: (target: NavigationTarget) => Promise<unknown> | unknown
  replace?: (target: NavigationTarget) => Promise<unknown> | unknown
}

const globalWindow = window as Window & {
  vueRouterDe?: HostRouter
}

const parseQuery = (search: string): LocationQuery => {
  const params = new URLSearchParams(search)
  const query: LocationQuery = {}
  for (const [key, value] of params.entries()) {
    const current = query[key]
    if (current === undefined) {
      query[key] = value
      continue
    }
    if (Array.isArray(current)) {
      current.push(value)
      continue
    }
    query[key] = [current, value]
  }
  return query
}

const extractParams = (path: string): Record<string, string | string[]> => {
  const segments = path.split('/').filter(Boolean)
  const params: Record<string, string | string[]> = {}
  const datasetIndex = segments.indexOf('dataset')
  if (datasetIndex >= 0 && segments[datasetIndex + 1]) {
    params.datasetId = decodeURIComponent(segments[datasetIndex + 1])
    return params
  }
  const resourcesIndex = segments.indexOf('resources')
  if (resourcesIndex >= 0 && segments[resourcesIndex + 1]) {
    params.datasetId = decodeURIComponent(segments[resourcesIndex + 1])
  }
  return params
}

const parseHashRoute = (): RouteState => {
  if (typeof window === 'undefined') {
    return { path: '/', query: {}, params: {} }
  }
  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const normalized = rawHash || '/'
  const [rawPath, rawSearch = ''] = normalized.split('?')
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  return {
    path,
    query: parseQuery(rawSearch),
    params: extractParams(path)
  }
}

const routeState = reactive<RouteState>(parseHashRoute())

const syncRouteState = () => {
  const hostRoute = globalWindow.vueRouterDe?.currentRoute?.value
  if (hostRoute?.path) {
    routeState.path = hostRoute.path
    routeState.query = hostRoute.query || {}
    routeState.params = {
      ...(hostRoute.params || {}),
      ...extractParams(hostRoute.path)
    }
    return
  }

  const next = parseHashRoute()
  routeState.path = next.path
  routeState.query = next.query
  routeState.params = next.params
}

const watchHostRoute = () => {
  watch(
    () => globalWindow.vueRouterDe?.currentRoute?.value,
    () => syncRouteState(),
    { immediate: true }
  )
}

let listening = false

const ensureListener = () => {
  if (listening || typeof window === 'undefined') {
    return
  }
  window.addEventListener('hashchange', syncRouteState)
  listening = true
}

const normalizeTarget = (target: NavigationTarget): NavigationTarget => {
  if (typeof target === 'string') {
    return target
  }
  return {
    path: target.path || routeState.path,
    query: target.query || {}
  }
}

const navigate = async (target: NavigationTarget, replace = false) => {
  ensureListener()
  const hostRouter = globalWindow.vueRouterDe
  const normalized = normalizeTarget(target)
  if (hostRouter?.replace && hostRouter?.push) {
    if (replace) {
      await hostRouter.replace(normalized)
    } else {
      await hostRouter.push(normalized)
    }
    syncRouteState()
    return
  }

  syncRouteState()
}

export const useRoute = () => {
  ensureListener()
  watchHostRoute()
  syncRouteState()
  return routeState
}

export const useRouter = () => {
  ensureListener()
  return {
    push: (target: NavigationTarget) => navigate(target, false),
    replace: (target: NavigationTarget) => navigate(target, true)
  }
}
