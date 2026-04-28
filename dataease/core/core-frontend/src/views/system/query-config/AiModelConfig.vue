<template>
  <div class="ai-model-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 模型配置</span>
          <el-button type="primary" @click="showCreateDialog">添加模型</el-button>
        </div>
      </template>
      <el-table :data="models" v-loading="loading">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="provider" label="提供商" />
        <el-table-column prop="modelName" label="模型名称" />
        <el-table-column prop="enabled" label="启用" width="80">
          <template #default="{ row }">
            <el-tag :type="row.enabled ? 'success' : 'info'">{{
              row.enabled ? '启用' : '禁用'
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" @click="editModel(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteModelConfirm(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listModels, createModel, updateModel, deleteModel } from '@/api/aiQuery'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'

const models = ref<any[]>([])
const loading = ref(false)

const fetchModels = async () => {
  loading.value = true
  try {
    const res = await listModels()
    models.value = Array.isArray(res) ? res : (res as any)?.data ?? []
  } catch {
    models.value = []
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  ElMessage.info('创建模型弹窗待实现')
}

const editModel = (row: any) => {
  ElMessage.info('编辑模型弹窗待实现')
}

const deleteModelConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确认删除模型「${row.name}」？`, '提示')
    await deleteModel(row.id)
    ElMessage.success('删除成功')
    await fetchModels()
  } catch {
    // cancelled or error
  }
}

onMounted(fetchModels)
</script>
