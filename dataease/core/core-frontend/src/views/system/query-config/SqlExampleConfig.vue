<template>
  <div class="sql-example-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>示例 SQL 配置</span>
          <el-button type="primary" @click="showCreateDialog">新建示例</el-button>
        </div>
      </template>
      <el-table :data="sqlExamples" v-loading="loading">
        <el-table-column prop="question" label="自然语言问法" min-width="200" />
        <el-table-column prop="sql" label="SQL" min-width="300" show-overflow-tooltip />
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editExample(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteExampleConfirm(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  listSqlExamples,
  createSqlExample,
  updateSqlExample,
  deleteSqlExample
} from '@/api/aiQuery'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'

const sqlExamples = ref<any[]>([])
const loading = ref(false)

const fetchExamples = async () => {
  loading.value = true
  try {
    const res = await listSqlExamples()
    sqlExamples.value = Array.isArray(res) ? res : (res as any)?.data ?? []
  } catch {
    sqlExamples.value = []
  } finally {
    loading.value = false
  }
}

const showCreateDialog = () => {
  ElMessage.info('新建示例弹窗待实现')
}

const editExample = (row: any) => {
  ElMessage.info('编辑示例弹窗待实现')
}

const deleteExampleConfirm = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确认删除该示例？`, '提示')
    await deleteSqlExample(row.id)
    ElMessage.success('删除成功')
    await fetchExamples()
  } catch {
    // cancelled or error
  }
}

onMounted(fetchExamples)
</script>
