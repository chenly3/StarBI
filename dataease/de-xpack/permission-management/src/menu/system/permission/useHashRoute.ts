import { reactive } from 'vue'

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
  const query = parseQuery(rawSearch)
  const params = extractParams(path)
  return { path, query, params }
}

const routeState = reactive<RouteState>(parseHashRoute())

const syncRouteState = () => {
  const next = parseHashRoute()
  routeState.path = next.path
  routeState.query = next.query
  routeState.params = next.params
}

let listening = false

const ensureListener = () => {
  if (listening || typeof window === 'undefined') {
    return
  }
  window.addEventListener('hashchange', syncRouteState)
  listening = true
}

const appendQuery = (search: URLSearchParams, query: Record<string, unknown>) => {
  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === '') {
      return
    }
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (item != null && item !== '') {
          search.append(key, String(item))
        }
      })
      return
    }
    search.set(key, String(value))
  })
}

const buildHashTarget = (target: NavigationTarget): string => {
  if (typeof target === 'string') {
    if (target.startsWith('#')) {
      return target
    }
    return `#${target.startsWith('/') ? target : `/${target}`}`
  }
  const path = target.path ? (target.path.startsWith('/') ? target.path : `/${target.path}`) : routeState.path
  const search = new URLSearchParams()
  appendQuery(search, target.query || {})
  const queryString = search.toString()
  return `#${path}${queryString ? `?${queryString}` : ''}`
}

const navigate = (target: NavigationTarget, replace = false) => {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }
  const hashTarget = buildHashTarget(target)
  if (replace) {
    const url = new URL(window.location.href)
    url.hash = hashTarget.slice(1)
    window.history.replaceState(window.history.state, '', url.toString())
    syncRouteState()
    return Promise.resolve()
  }
  window.location.hash = hashTarget
  syncRouteState()
  return Promise.resolve()
}

export const useRoute = () => {
  ensureListener()
  return routeState
}

export const useRouter = () => {
  ensureListener()
  return {
    push: (target: NavigationTarget) => navigate(target, false),
    replace: (target: NavigationTarget) => navigate(target, true)
  }
}
