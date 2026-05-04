import { computed, onMounted, ref, watch, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'
import { useCache } from '@/hooks/web/useCache'
import type { HistoryItem, PageMode, SqlbotNewExecutionContext } from './types'
import type { SqlbotNewHistoryEntry } from './useSqlbotNewConversation'

interface UseSqlbotNewHistoryOptions {
  pageMode: Ref<PageMode>
  fetchHistoryEntries: () => Promise<SqlbotNewHistoryEntry[]>
  getCurrentConversationHistoryEntry?: () => SqlbotNewHistoryEntry | null
  deleteHistoryEntry: (entry: SqlbotNewHistoryEntry) => Promise<boolean>
  applyRestoredSelection: (
    executionContext: SqlbotNewExecutionContext,
    restoredSelection?: Partial<Pick<SqlbotNewHistoryEntry, 'selectionTitle' | 'selectionMeta'>>
  ) => Promise<void>
  restoreHistorySession: (entry: SqlbotNewHistoryEntry) => Promise<boolean>
}

interface SqlbotNewHistoryTreeItem extends HistoryItem {
  payload: SqlbotNewHistoryEntry
}

const ACTIVE_SESSION_STORAGE_KEY = 'STARBI-AI-QUERY-ACTIVE-SESSION'

const readActiveSessionId = () => {
  const { wsCache } = useCache('localStorage')
  try {
    const cached = wsCache.get(ACTIVE_SESSION_STORAGE_KEY)
    if (typeof cached === 'string' && cached.trim()) {
      return cached.trim()
    }
    return String(window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) || '').trim()
  } catch (error) {
    console.error('read sqlbot-new active history id failed', error)
    return ''
  }
}

const clearActiveSessionId = () => {
  const { wsCache } = useCache('localStorage')
  try {
    wsCache.delete(ACTIVE_SESSION_STORAGE_KEY)
    window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
  } catch (error) {
    console.error('clear sqlbot-new active history id failed', error)
  }
}

export const useSqlbotNewHistory = ({
  pageMode,
  fetchHistoryEntries,
  getCurrentConversationHistoryEntry,
  deleteHistoryEntry,
  applyRestoredSelection,
  restoreHistorySession
}: UseSqlbotNewHistoryOptions) => {
  const historyTreeExpanded = ref(false)
  const archivedGroupExpanded = ref(true)
  const activeHistoryId = ref('')
  const historyLoading = ref(false)
  const historyDeleting = ref(false)

  const historyItems = ref<SqlbotNewHistoryTreeItem[]>([])

  const normalizeHistoryItems = (entries: SqlbotNewHistoryEntry[]) => {
    return entries
      .map(entry => {
        return {
          id: entry.id,
          title: entry.title,
          subtitle: entry.subtitle,
          time: entry.time,
          group: 'history',
          payload: entry
        } as SqlbotNewHistoryTreeItem
      })
      .sort(
        (left, right) => Number(right.payload.updatedAt || 0) - Number(left.payload.updatedAt || 0)
      )
  }

  const mergedHistoryItems = computed(() => {
    const currentConversationEntry = getCurrentConversationHistoryEntry?.()
    if (!currentConversationEntry) {
      return historyItems.value
    }

    const fallbackItem = normalizeHistoryItems([currentConversationEntry])[0]
    const nextItems = historyItems.value.filter(item => item.id !== fallbackItem.id)
    return [fallbackItem, ...nextItems].sort((left, right) => {
      const leftUpdatedAt = Number(left.payload.updatedAt || 0)
      const rightUpdatedAt = Number(right.payload.updatedAt || 0)
      return rightUpdatedAt - leftUpdatedAt
    })
  })

  const recentHistoryItems = computed<SqlbotNewHistoryTreeItem[]>(() => [])
  const archivedHistoryItems = computed(() => mergedHistoryItems.value)

  const refreshHistory = async (restoreActive = false) => {
    historyLoading.value = true
    try {
      const entries = await fetchHistoryEntries()
      historyItems.value = normalizeHistoryItems(entries)

      const activeSessionId = readActiveSessionId()
      const targetItem = activeSessionId
        ? mergedHistoryItems.value.find(item => item.id === activeSessionId)
        : undefined

      activeHistoryId.value = restoreActive && targetItem ? targetItem.id : ''
      if (restoreActive && activeSessionId && !targetItem) {
        clearActiveSessionId()
      }

      if (targetItem && restoreActive) {
        historyTreeExpanded.value = true
        await openHistoryItem(targetItem.id)
      }
    } catch (error) {
      console.error('load sqlbot-new history failed', error)
      historyItems.value = []
      activeHistoryId.value = ''
    } finally {
      historyLoading.value = false
    }
  }

  const openHistoryItem = async (id: string) => {
    const item = mergedHistoryItems.value.find(historyItem => historyItem.id === id)
    if (!item) {
      return
    }
    const restored = await restoreHistorySession(item.payload)
    if (restored) {
      activeHistoryId.value = id
      await applyRestoredSelection(
        {
          queryMode: item.payload.queryMode,
          sourceId: item.payload.sourceId,
          sourceIds: item.payload.sourceIds,
          combinationId: item.payload.combinationId,
          combinationName: item.payload.combinationName,
          datasourceId: item.payload.datasourceId,
          modelId: item.payload.modelId,
          datasourcePending: item.payload.datasourcePending
        },
        {
          selectionTitle: item.payload.selectionTitle,
          selectionMeta: item.payload.selectionMeta
        }
      )
      await refreshHistory(false)
      activeHistoryId.value = id
    } else if (activeHistoryId.value === id) {
      activeHistoryId.value = ''
    }
  }

  const deleteHistoryItem = async (id: string) => {
    const item = mergedHistoryItems.value.find(historyItem => historyItem.id === id)
    if (!item) {
      return
    }

    try {
      await ElMessageBox.confirm(`确认删除历史对话「${item.title}」吗？`, '删除历史对话', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }

    historyDeleting.value = true
    try {
      await deleteHistoryEntry(item.payload)
      historyItems.value = historyItems.value.filter(historyItem => historyItem.id !== id)
      if (activeHistoryId.value === id) {
        activeHistoryId.value = ''
      }
      ElMessage.success('历史对话已删除')
      await refreshHistory(false)
    } catch (error) {
      console.error('delete sqlbot-new history item failed', error)
      ElMessage.error(error instanceof Error ? error.message : '删除历史对话失败')
    } finally {
      historyDeleting.value = false
    }
  }

  const clearHistoryItems = async (scope: 'recent' | 'history' | 'all' = 'all') => {
    const targets = [
      ...(scope === 'recent'
        ? recentHistoryItems.value
        : scope === 'history'
        ? archivedHistoryItems.value
        : mergedHistoryItems.value)
    ]

    if (!targets.length) {
      ElMessage.info('当前没有可清理的历史对话')
      return
    }

    const scopeLabel = '历史对话'
    try {
      await ElMessageBox.confirm(
        `确认清理${scopeLabel}（共 ${targets.length} 条）吗？`,
        '清理历史对话',
        {
          type: 'warning',
          confirmButtonText: '清理',
          cancelButtonText: '取消'
        }
      )
    } catch {
      return
    }

    historyDeleting.value = true
    const failedTitles: string[] = []
    try {
      for (const item of targets) {
        try {
          await deleteHistoryEntry(item.payload)
        } catch (error) {
          failedTitles.push(item.title)
          console.error('clear sqlbot-new history item failed', error, item.id)
        }
      }
      if (failedTitles.length === targets.length) {
        ElMessage.error(`${scopeLabel}清理失败，请稍后重试`)
      } else if (failedTitles.length) {
        ElMessage.warning(`已清理部分历史，失败 ${failedTitles.length} 条`)
      } else {
        ElMessage.success(`${scopeLabel}已清理`)
      }
      await refreshHistory(false)
    } finally {
      historyDeleting.value = false
    }
  }

  const toggleHistoryTree = async () => {
    historyTreeExpanded.value = !historyTreeExpanded.value
  }

  const toggleArchivedGroup = () => {
    archivedGroupExpanded.value = !archivedGroupExpanded.value
  }

  watch(
    () => pageMode.value,
    mode => {
      historyTreeExpanded.value = mode === 'result'
    },
    { immediate: true }
  )

  onMounted(() => {
    void refreshHistory(false)
  })

  return {
    activeHistoryId,
    archivedGroupExpanded,
    archivedHistoryItems,
    clearHistoryItems,
    deleteHistoryItem,
    historyItems,
    historyDeleting,
    historyLoading,
    historyTreeExpanded,
    openHistoryItem,
    recentHistoryItems,
    refreshHistory,
    toggleArchivedGroup,
    toggleHistoryTree,
    toggleRecentGroup: () => undefined
  }
}
