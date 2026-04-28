import { xpackModelApi } from '@/api/plugin'

export const XPACK_MODEL_DISTRIBUTED_CACHE_KEY = 'xpack-model-distributed'

export const parseDistributedFlag = (value: unknown): boolean | null => {
  if (value === null || value === undefined || value === 'null' || value === 'undefined') {
    return null
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (!normalized || normalized === 'null' || normalized === 'undefined') {
      return null
    }
    if (normalized === 'true') {
      return true
    }
    if (normalized === 'false') {
      return false
    }
  }
  return Boolean(value)
}

export const loadDistributedFlag = async (wsCache: any): Promise<boolean | null> => {
  const cached = wsCache.get(XPACK_MODEL_DISTRIBUTED_CACHE_KEY)
  if (cached !== null) {
    return parseDistributedFlag(cached)
  }
  try {
    const res = await xpackModelApi()
    const distributed = parseDistributedFlag(res.data)
    wsCache.set(
      XPACK_MODEL_DISTRIBUTED_CACHE_KEY,
      distributed === null ? 'null' : String(distributed)
    )
    return distributed
  } catch {
    return null
  }
}
