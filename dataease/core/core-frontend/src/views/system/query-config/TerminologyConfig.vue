<template>
  <div class="terminology-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>术语配置</span>
          <div>
            <el-button @click="showUploadDialog">批量上传</el-button>
            <el-button type="primary" @click="showCreateDialog">新建术语</el-button>
          </div>
        </div>
      </template>
      <el-table :data="terms" v-loading="loading">
        <el-table-column prop="term" label="术语" />
        <el-table-column prop="mapping" label="映射目标" />
        <el-table-column prop="description" label="描述" />
        <el-table-column label="启用" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.enabled" @change="toggleTerm(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="editTerm(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteTermConfirm(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listTerminology, createTerm, updateTerm, deleteTerm } from '@/api/aiQuery'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'

const terms = ref<any[]>([])
const loading = ref(false)

const fetchTerms = async () => {
  loading.value = true
  try {
    const res = await listTerminology()
    terms.value = Array.isArray(res) ? res : (res as any)?.data ?? []
  } catch {
    terms.value = []
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  ElMessage.info('新建术语弹窗待实现')
}

const showUploadDialog = () => {
  ElMessage.info('批量上传弹窗待实现')
}

const editTerm = (row: any) => {
  ElMessage.info('编辑术语弹窗待实现')
}

const toggleTerm = async (row: any) => {
  try {
    await updateTerm(row.id, row)
  } catch {
    row.enabled = !row.enabled
  }
}

const deleteTermConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确认删除术语「${row.term}」？`, '提示')
    await deleteTerm(row.id)
    ElMessage.success('删除成功')
    await fetchTerms()
  } catch {
    // cancelled or error
  }
}

onMounted(fetchTerms)
</script>
