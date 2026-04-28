<script setup lang="ts">
import { computed } from 'vue'
import type { IdType, OrgTreeNode } from '../types'

const props = defineProps<{
  node: OrgTreeNode
  expandedIds: string[]
  selectedNodeId: string
  matchedNodeId: string
  depth?: number
}>()

const emit = defineEmits<{
  (event: 'select', value: IdType): void
  (event: 'toggle', value: IdType): void
}>()

const currentDepth = computed(() => props.depth || 0)
const nodeId = computed(() => String(props.node.id))
const hasChildren = computed(() => Boolean(props.node.children?.length))
const expanded = computed(() => props.expandedIds.includes(nodeId.value))
const active = computed(() => props.selectedNodeId === nodeId.value)
const matched = computed(() => props.matchedNodeId === nodeId.value)

const handleToggle = () => {
  if (!hasChildren.value) {
    return
  }
  emit('toggle', props.node.id)
}

const handleSelect = () => {
  emit('select', props.node.id)
}
</script>

<template>
  <li class="org-tree-node">
    <div
      class="org-tree-node__row"
      :class="{
        'is-active': active,
        'is-matched': matched
      }"
      :style="{ paddingLeft: `${currentDepth * 18 + 12}px` }"
    >
      <button
        type="button"
        class="org-tree-node__toggle"
        :class="{ 'is-placeholder': !hasChildren }"
        @click="handleToggle"
      >
        <span v-if="hasChildren">{{ expanded ? '▾' : '▸' }}</span>
      </button>
      <button type="button" class="org-tree-node__label" @click="handleSelect">
        {{ node.name }}
      </button>
    </div>

    <ul v-if="hasChildren && expanded" class="org-tree-node__children">
      <OrgTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="currentDepth + 1"
        :expanded-ids="expandedIds"
        :selected-node-id="selectedNodeId"
        :matched-node-id="matchedNodeId"
        @select="value => emit('select', value)"
        @toggle="value => emit('toggle', value)"
      />
    </ul>
  </li>
</template>

<style scoped>
.org-tree-node {
  list-style: none;
}

.org-tree-node__children {
  margin: 0;
  padding: 0;
}

.org-tree-node__row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  border-radius: 10px;
  transition: background-color 0.2s ease;
}

.org-tree-node__row.is-active {
  background: rgba(51, 112, 255, 0.12);
}

.org-tree-node__row.is-matched:not(.is-active) {
  background: rgba(255, 166, 0, 0.12);
}

.org-tree-node__toggle,
.org-tree-node__label {
  border: none;
  background: transparent;
  padding: 0;
  color: #1f2329;
}

.org-tree-node__toggle {
  width: 18px;
  height: 18px;
  cursor: pointer;
  font-size: 13px;
  color: #4e5969;
}

.org-tree-node__toggle.is-placeholder {
  cursor: default;
}

.org-tree-node__label {
  flex: 1;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  line-height: 20px;
}
</style>
