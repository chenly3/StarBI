<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { listDatasetPermissionTree } from '../api'
import type { DatasetPermissionTreeNode } from '../types'
import { useDatasetPermissionContext } from '../useDatasetPermissionContext'

interface VisibleTreeNode {
  id: string
  name: string
  leaf: boolean
  depth: number
  expanded: boolean
  hasChildren: boolean
}

const { datasetId, syncDatasetSelection, setSelectedDataset } = useDatasetPermissionContext()

const loading = ref(false)
const loaded = ref(false)
const loadFailed = ref(false)
const keyword = ref('')
const errorMessage = ref('')
const treeData = ref<DatasetPermissionTreeNode[]>([])
const expandedIds = ref<string[]>([])
const lastInvalidDatasetId = ref('')

const normalizeKeyword = (value: string) => value.trim().toLowerCase()

const collectLeafDatasets = (nodes: DatasetPermissionTreeNode[]): Array<{ id: string; name: string }> => {
  const datasets: Array<{ id: string; name: string }> = []
  const walk = (items: DatasetPermissionTreeNode[]) => {
    items.forEach(item => {
      if (item.leaf) {
        datasets.push({ id: item.id, name: item.name })
      }
      if (item.children.length) {
        walk(item.children)
      }
    })
  }
  walk(nodes)
  return datasets
}

const collectExpandedIds = (nodes: DatasetPermissionTreeNode[]): string[] => {
  const ids: string[] = []
  const walk = (items: DatasetPermissionTreeNode[]) => {
    items.forEach(item => {
      if (item.children.length) {
        ids.push(item.id)
        walk(item.children)
      }
    })
  }
  walk(nodes)
  return ids
}

const filterTree = (nodes: DatasetPermissionTreeNode[], searchText: string): DatasetPermissionTreeNode[] => {
  const normalizedKeyword = normalizeKeyword(searchText)
  if (!normalizedKeyword) {
    return nodes
  }
  return nodes
    .map(node => {
      const children = filterTree(node.children, normalizedKeyword)
      const matched = node.name.toLowerCase().includes(normalizedKeyword)
      if (!matched && !children.length) {
        return null
      }
      return {
        ...node,
        children
      }
    })
    .filter(Boolean) as DatasetPermissionTreeNode[]
}

const flattenTree = (
  nodes: DatasetPermissionTreeNode[],
  depth: number,
  shouldExpandAll: boolean
): VisibleTreeNode[] => {
  const rows: VisibleTreeNode[] = []
  nodes.forEach(node => {
    const expanded = shouldExpandAll || expandedIds.value.includes(node.id)
    rows.push({
      id: node.id,
      name: node.name,
      leaf: node.leaf,
      depth,
      expanded,
      hasChildren: node.children.length > 0
    })
    if (node.children.length && expanded) {
      rows.push(...flattenTree(node.children, depth + 1, shouldExpandAll))
    }
  })
  return rows
}

const selectableDatasets = computed(() => collectLeafDatasets(treeData.value))
const filteredTreeData = computed(() => filterTree(treeData.value, keyword.value))
const visibleNodes = computed(() => {
  return flattenTree(filteredTreeData.value, 0, !!normalizeKeyword(keyword.value))
})

const toggleExpanded = (id: string) => {
  if (expandedIds.value.includes(id)) {
    expandedIds.value = expandedIds.value.filter(item => item !== id)
    return
  }
  expandedIds.value = [...expandedIds.value, id]
}

const handleNodeClick = async (node: VisibleTreeNode) => {
  if (!node.leaf) {
    if (node.hasChildren) {
      toggleExpanded(node.id)
    }
    return
  }
  errorMessage.value = ''
  await setSelectedDataset({
    id: node.id,
    name: node.name
  })
}

const loadTree = async () => {
  loading.value = true
  loadFailed.value = false
  loaded.value = false
  try {
    const nodes = await listDatasetPermissionTree({})
    treeData.value = nodes
    expandedIds.value = collectExpandedIds(nodes)
    errorMessage.value = ''
  } catch (error) {
    treeData.value = []
    expandedIds.value = []
    loadFailed.value = true
    errorMessage.value = (error as Error)?.message || '数据集加载失败'
  } finally {
    loading.value = false
    loaded.value = true
  }
}

watch(
  () => [loaded.value, selectableDatasets.value, datasetId.value] as const,
  async ([isLoaded, datasets]) => {
    if (!isLoaded || loadFailed.value) {
      return
    }
    const result = await syncDatasetSelection(datasets)
    if (result.reason === 'invalid' && result.invalidDatasetId !== lastInvalidDatasetId.value) {
      lastInvalidDatasetId.value = result.invalidDatasetId
      errorMessage.value = '当前数据集不存在，已切换到第一个可用数据集'
      return
    }
    if (result.reason === 'matched' && lastInvalidDatasetId.value) {
      lastInvalidDatasetId.value = ''
      if (!loadFailed.value) {
        errorMessage.value = ''
      }
      return
    }
    if (result.reason === 'missing' || result.reason === 'empty') {
      lastInvalidDatasetId.value = ''
      if (!loadFailed.value) {
        errorMessage.value = ''
      }
    }
  },
  { immediate: true }
)

loadTree()
</script>

<template>
  <aside class="dataset-tree-panel">
    <div class="dataset-tree-panel__header">
      <span>数据集</span>
      <button type="button" class="dataset-tree-panel__create" disabled>＋</button>
    </div>

    <div class="dataset-tree-panel__search">
      <input
        v-model.trim="keyword"
        type="text"
        class="dataset-tree-panel__search-input"
        placeholder="搜索数据集"
      />
    </div>

    <div class="dataset-tree-panel__body">
      <div v-if="errorMessage" class="dataset-tree-panel__error">{{ errorMessage }}</div>
      <div v-if="loading" class="dataset-tree-panel__empty">加载中...</div>
      <div v-else-if="loadFailed" class="dataset-tree-panel__empty">数据集加载失败</div>
      <div v-else-if="!visibleNodes.length" class="dataset-tree-panel__empty">
        {{ keyword ? '没有匹配的数据集' : '暂无可用数据集' }}
      </div>

      <button
        v-for="node in visibleNodes"
        :key="node.id"
        type="button"
        class="dataset-tree-panel__item"
        :class="{
          'is-active': node.leaf && datasetId === node.id,
          'is-leaf': node.leaf
        }"
        :style="{ '--tree-depth': node.depth }"
        @click="handleNodeClick(node)"
      >
        <span class="dataset-tree-panel__toggle" :class="{ 'is-hidden': !node.hasChildren }">
          {{ node.expanded ? '▾' : '▸' }}
        </span>
        <span class="dataset-tree-panel__icon" :class="{ 'is-folder': !node.leaf }"></span>
        <span class="dataset-tree-panel__label" :title="node.name">{{ node.name }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.dataset-tree-panel {
  height: 100%;
  max-height: none;
  min-height: 0;
  border: 1px solid #dde6f2;
  border-radius: 14px;
  background: #ffffff;
  padding: 12px 0 10px;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
  display: flex;
  flex-direction: column;
}

.dataset-tree-panel__header {
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #111827;
  font-size: 19px;
  font-weight: 700;
}

.dataset-tree-panel__create {
  border: none;
  background: transparent;
  color: #2f6bff;
  font-size: 20px;
  padding: 0;
  cursor: not-allowed;
}

.dataset-tree-panel__search {
  padding: 12px 16px 10px;
}

.dataset-tree-panel__search-input {
  width: 100%;
  height: 42px;
  border: 1px solid #d7deea;
  border-radius: 8px;
  padding: 0 12px;
  box-sizing: border-box;
  color: #344054;
  font-size: 15px;
  outline: none;
}

.dataset-tree-panel__search-input:focus {
  border-color: #2f6bff;
  box-shadow: 0 0 0 2px rgba(47, 107, 255, 0.1);
}

.dataset-tree-panel__body {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.dataset-tree-panel__item {
  min-height: 40px;
  width: 100%;
  padding: 0 14px 0 calc(14px + var(--tree-depth) * 14px);
  margin-right: -1px;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 7px;
  color: #344054;
  font-size: 15px;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.dataset-tree-panel__item.is-leaf:hover,
.dataset-tree-panel__item:not(.is-leaf):hover {
  background: #f5f8ff;
}

.dataset-tree-panel__item.is-active {
  background: #eef4ff;
  box-shadow: inset 3px 0 0 #2f6bff;
  color: #2f6bff;
  font-weight: 600;
}

.dataset-tree-panel__toggle {
  width: 12px;
  color: #667085;
  flex: 0 0 auto;
}

.dataset-tree-panel__toggle.is-hidden {
  visibility: hidden;
}

.dataset-tree-panel__icon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: linear-gradient(180deg, #2f6bff 0%, #1f4cd8 100%);
  flex: 0 0 auto;
}

.dataset-tree-panel__icon.is-folder {
  border-radius: 3px;
  background: linear-gradient(180deg, #f7b955 0%, #ec9d12 100%);
}

.dataset-tree-panel__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dataset-tree-panel__empty {
  padding: 0 16px;
  color: #98a2b3;
  font-size: 15px;
  line-height: 36px;
}

.dataset-tree-panel__error {
  margin: 0 16px 8px;
  border-radius: 8px;
  background: #fff2f0;
  color: #d92d20;
  font-size: 14px;
  line-height: 20px;
  padding: 6px 8px;
}
</style>
