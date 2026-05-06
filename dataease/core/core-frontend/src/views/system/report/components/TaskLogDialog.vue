<template>
  <el-drawer
    v-model="visible"
    :title="t('report.task_log')"
    destroy-on-close
    size="700px"
    :before-close="handleClose"
    modal-class="report-task-drawer"
  >
    <div class="log-toolbar">
      <el-select
        v-model="statusFilter"
        :placeholder="t('report.exec_status_filter')"
        clearable
        style="width: 160px"
        @change="loadLogs"
      >
        <el-option :label="t('report.status_all')" value="" />
        <el-option :label="t('report.status_success')" value="0" />
        <el-option :label="t('report.status_failed')" value="1" />
      </el-select>

      <el-button secondary @click="loadLogs">
        <template #icon>
          <el-icon><Refresh /></el-icon>
        </template>
      </el-button>

      <el-button secondary type="danger" style="margin-left: auto" @click="handleDeleteLogs">
        {{ t('report.delete_logs') }}
      </el-button>
    </div>

    <div class="table-content">
      <el-table :data="logList" v-loading="loading" style="width: 100%">
        <el-table-column :label="t('report.exec_time')" width="170">
          <template #default="{ row }">
            <span>{{ formatTime(row.startTime) }}</span>
          </template>
        </el-table-column>

        <el-table-column
          :label="t('report.exec_status')"
          width="100"
          align="center"
          header-align="center"
        >
          <template #default="{ row }">
            <el-tag size="small" :type="row.execStatus === 0 ? 'success' : 'danger'" effect="light">
              {{ row.execStatus === 0 ? t('report.status_success') : t('report.status_failed') }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          :label="t('report.recipient_count')"
          width="100"
          align="center"
          header-align="center"
        >
          <template #default="{ row }">
            <span>{{ row.recipientCount || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column
          :label="t('common.operations')"
          width="100"
          align="center"
          header-align="center"
        >
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

        <template #empty>
          <EmptyBackground :description="t('report.no_logs')" img-type="noneWhite" />
        </template>
      </el-table>
    </div>

    <div v-if="logList.length" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 30]"
        :background="true"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <el-dialog
      v-model="showErrorDialog"
      :title="t('report.error_detail')"
      width="560px"
      append-to-body
      custom-class="confirm-no_icon"
    >
      <div class="error-content">
        <pre>{{ errorMessage }}</pre>
      </div>
    </el-dialog>
  </el-drawer>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'
import EmptyBackground from '@/components/empty-background/src/EmptyBackground.vue'
import { useI18n } from '@/hooks/web/useI18n'
import { reportLogPager, reportDeleteLog, reportLogMsg } from '@/api/report'

const { t } = useI18n()

const props = defineProps<{ taskId: number | null }>()
const emit = defineEmits(['close'])

const visible = ref(true)
const loading = ref(false)
const logList = ref<any[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const statusFilter = ref('')
const showErrorDialog = ref(false)
const errorMessage = ref('')

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
    logList.value = res.data?.list || res?.data || []
    total.value = res.data?.total || res?.total || 0
  } catch {
    ElMessage.error(t('report.load_logs_failed'))
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (val: number) => {
  currentPage.value = 1
  pageSize.value = val
  loadLogs()
}
const handleCurrentChange = (val: number) => {
  currentPage.value = val
  loadLogs()
}

const handleViewError = async (row: any) => {
  try {
    const res = await reportLogMsg(row.id)
    errorMessage.value = res.data || t('report.no_error_message')
    showErrorDialog.value = true
  } catch {
    ElMessage.error(t('report.load_error_failed'))
  }
}

const handleDeleteLogs = async () => {
  try {
    await ElMessageBox.confirm(t('report.delete_logs_confirm'), {
      confirmButtonType: 'danger',
      confirmButtonText: t('common.delete'),
      cancelButtonText: t('common.cancel'),
      customClass: 'confirm-no_icon',
      autofocus: false
    })
    await reportDeleteLog({ taskId: props.taskId })
    ElMessage.success(t('report.delete_logs_success'))
    loadLogs()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(t('report.delete_logs_failed'))
  }
}

const formatTime = (value: string | number | Date) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const pad = (num: number) => `${num}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const handleClose = () => emit('close')

watch(
  () => props.taskId,
  () => {
    if (props.taskId) loadLogs()
  },
  { immediate: true }
)
</script>

<style lang="less" scoped>
.log-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.table-content {
  border: 1px solid #e6ebf2;
  border-radius: 12px;
  overflow: hidden;

  :deep(.ed-table) {
    --ed-table-header-bg-color: #f7f9fc;
    font-size: 15px;
  }

  :deep(.ed-table__header-wrapper th.ed-table__cell) {
    padding: 10px 0;
    background: #f7f9fc;
    color: #5f6b7c;
    font-size: 15px;
    font-weight: 600;
  }

  :deep(.ed-table__body-wrapper td.ed-table__cell) {
    padding: 10px 0;
    color: #27364f;
    font-size: 15px;
  }

  :deep(.ed-table .cell) {
    padding: 0 12px;
    line-height: 24px;
  }
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.error-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  background: #f7f9fc;
  padding: 16px;
  border-radius: 8px;
  max-height: 400px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 22px;
  color: #27364f;
}
</style>
