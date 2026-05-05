<template>
  <el-dialog
    v-model="visible"
    :title="t('report.task_log')"
    width="900px"
    @close="handleClose"
  >
    <!-- 日志筛选 -->
    <div class="log-filter">
      <el-select
        v-model="statusFilter"
        :placeholder="t('report.exec_status_filter')"
        clearable
        @change="loadLogs"
        style="width: 150px"
      >
        <el-option :label="t('report.status_all')" value="" />
        <el-option :label="t('report.status_success')" value="0" />
        <el-option :label="t('report.status_failed')" value="1" />
      </el-select>
      
      <el-button @click="loadLogs" style="margin-left: 10px">
        <el-icon><Refresh /></el-icon>
      </el-button>
      
      <el-button 
        type="danger" 
        @click="handleDeleteLogs"
        style="margin-left: auto"
      >
        {{ t('report.delete_logs') }}
      </el-button>
    </div>

    <!-- 日志表格 -->
    <el-table
      :data="logList"
      v-loading="loading"
      class="log-table"
      :empty-text="t('report.no_logs')"
    >
      <el-table-column :label="t('report.exec_time')" width="180">
        <template #default="{ row }">
          {{ formatTime(row.startTime) }}
        </template>
      </el-table-column>

      <el-table-column :label="t('report.exec_status')" width="100">
        <template #default="{ row }">
          <el-tag :type="row.execStatus === 0 ? 'success' : 'danger'">
            {{ row.execStatus === 0 ? t('report.status_success') : t('report.status_failed') }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column :label="t('report.recipient_count')" width="100">
        <template #default="{ row }">
          {{ row.recipientCount || '-' }}
        </template>
      </el-table-column>

      <el-table-column :label="t('common.operations')" width="150">
        <template #default="{ row }">
          <el-button
            v-if="row.execStatus === 1"
            link
            type="primary"
            @click="handleViewError(row)"
          >
            {{ t('report.view_error') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="loadLogs"
        @size-change="loadLogs"
      />
    </div>

    <!-- 错误详情对话框 -->
    <el-dialog
      v-model="showErrorDialog"
      :title="t('report.error_detail')"
      width="600px"
      append-to-body
    >
      <div class="error-content">
        <pre>{{ errorMessage }}</pre>
      </div>
    </el-dialog>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from '@/hooks/web/useI18n'
import { reportLogPager, reportDeleteLog, reportLogMsg } from '@/api/report'

const { t } = useI18n()

const props = defineProps<{
  taskId: number | null
}>()

const emit = defineEmits(['close'])

const visible = ref(true)
const loading = ref(false)
const logList = ref<any[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const statusFilter = ref('')

// 错误详情
const showErrorDialog = ref(false)
const errorMessage = ref('')

// 加载日志
const loadLogs = async () => {
  if (!props.taskId) return
  
  loading.value = true
  try {
    const res = await reportLogPager({
      goPage: currentPage.value,
      pageSize: pageSize.value,
      request: {
        taskId: props.taskId,
        execStatusList: statusFilter.value !== '' ? [parseInt(statusFilter.value)] : []
      }
    })
    logList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error(t('report.load_logs_failed'))
  } finally {
    loading.value = false
  }
}

// 查看错误
const handleViewError = async (row: any) => {
  try {
    const res = await reportLogMsg(row.id)
    errorMessage.value = res.data || t('report.no_error_message')
    showErrorDialog.value = true
  } catch (error) {
    ElMessage.error(t('report.load_error_failed'))
  }
}

// 删除日志
const handleDeleteLogs = async () => {
  try {
    await ElMessageBox.confirm(
      t('report.delete_logs_confirm'),
      t('common.tip'),
      {
        type: 'warning',
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel')
      }
    )
    
    await reportDeleteLog({
      taskId: props.taskId
    })
    
    ElMessage.success(t('report.delete_logs_success'))
    loadLogs()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('report.delete_logs_failed'))
    }
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
}

// 关闭对话框
const handleClose = () => {
  emit('close')
}

watch(() => props.taskId, () => {
  if (props.taskId) {
    loadLogs()
  }
}, { immediate: true })
</script>

<style lang="less" scoped>
.log-filter {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.log-table {
  max-height: 500px;
  overflow-y: auto;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
}

.error-content {
  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    background: var(--el-fill-color-light);
    padding: 15px;
    border-radius: 4px;
    max-height: 400px;
    overflow-y: auto;
  }
}
</style>
