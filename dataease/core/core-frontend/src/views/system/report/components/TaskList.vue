<template>
  <div class="task-list-container">
    <!-- 工具栏 -->
    <div class="task-toolbar">
      <el-input
        v-model="searchText"
        :placeholder="t('report.search_placeholder')"
        clearable
        @clear="handleSearch"
        @keyup.enter="handleSearch"
        style="width: 250px"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select
        v-model="statusFilter"
        :placeholder="t('report.status_filter')"
        clearable
        @change="handleSearch"
        style="width: 150px; margin-left: 10px"
      >
        <el-option :label="t('report.status_all')" value="" />
        <el-option :label="t('report.status_underway')" value="0" />
        <el-option :label="t('report.status_stopped')" value="1" />
      </el-select>

      <el-button @click="handleSearch" style="margin-left: 10px">
        {{ t('common.search') }}
      </el-button>
    </div>

    <!-- 任务表格 -->
    <el-table
      :data="taskList"
      v-loading="loading"
      class="task-table"
      :empty-text="t('report.no_tasks')"
    >
      <el-table-column prop="name" :label="t('report.task_name')" min-width="200" />
      
      <el-table-column :label="t('report.status')" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 0 ? 'success' : 'info'">
            {{ row.status === 0 ? t('report.status_underway') : t('report.status_stopped') }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column :label="t('report.schedule')" min-width="150">
        <template #default="{ row }">
          {{ formatSchedule(row) }}
        </template>
      </el-table-column>

      <el-table-column :label="t('report.last_exec_time')" width="180">
        <template #default="{ row }">
          {{ formatTime(row.lastExecTime) }}
        </template>
      </el-table-column>

      <el-table-column :label="t('common.operations')" width="320" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleEdit(row.id)">
            {{ t('common.edit') }}
          </el-button>
          <el-button link @click="handleFireNow(row)">
            {{ t('report.fire_now') }}
          </el-button>
          <el-button
            link
            :type="row.status === 0 ? 'warning' : 'success'"
            @click="handleToggleStatus(row)"
          >
            {{ row.status === 0 ? t('report.stop') : t('report.start') }}
          </el-button>
          <el-button link @click="handleViewLog(row.id)">
            {{ t('report.view_log') }}
          </el-button>
          <el-button link type="danger" @click="handleDelete(row)">
            {{ t('common.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadTasks"
        @size-change="loadTasks"
      />
    </div>

    <!-- 立即执行确认对话框 -->
    <el-dialog
      v-model="showFireDialog"
      :title="t('report.fire_now_confirm_title')"
      width="400px"
    >
      <p>{{ t('report.fire_now_confirm_message') }}</p>
      <p v-if="fireTask" class="fire-task-name">{{ fireTask.name }}</p>
      <template #footer>
        <el-button @click="showFireDialog = false">{{ t('common.cancel') }}</el-button>
        <el-button type="primary" @click="confirmFireNow" :loading="firing">
          {{ t('common.confirm') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useI18n } from '@/hooks/web/useI18n'
import { reportPager, reportFireNow, reportStop, reportStart, reportDelete } from '@/api/report'

const { t } = useI18n()

const emit = defineEmits(['edit', 'view-log', 'refresh'])

// 状态
const loading = ref(false)
const taskList = ref<any[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchText = ref('')
const statusFilter = ref('')

// 立即执行对话框
const showFireDialog = ref(false)
const fireTask = ref<any>(null)
const firing = ref(false)

// 加载任务列表
const loadTasks = async () => {
  loading.value = true
  try {
    const res = await reportPager({
      goPage: currentPage.value,
      pageSize: pageSize.value,
      request: {
        keyword: searchText.value,
        statusList: statusFilter.value !== '' ? [parseInt(statusFilter.value)] : []
      }
    })
    taskList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error(t('report.load_failed'))
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadTasks()
}

// 编辑
const handleEdit = (taskId: number) => {
  emit('edit', taskId)
}

// 查看日志
const handleViewLog = (taskId: number) => {
  emit('view-log', taskId)
}

// 立即执行
const handleFireNow = (task: any) => {
  fireTask.value = task
  showFireDialog.value = true
}

const confirmFireNow = async () => {
  if (!fireTask.value) return
  
  firing.value = true
  try {
    await reportFireNow(fireTask.value.id)
    ElMessage.success(t('report.fire_now_success'))
    showFireDialog.value = false
  } catch (error) {
    ElMessage.error(t('report.fire_now_failed'))
  } finally {
    firing.value = false
  }
}

// 切换状态
const handleToggleStatus = async (task: any) => {
  const action = task.status === 0 ? 'stop' : 'start'
  const confirmMsg = task.status === 0 
    ? t('report.stop_confirm') 
    : t('report.start_confirm')
  
  try {
    await ElMessageBox.confirm(confirmMsg, t('common.tip'), {
      type: 'warning'
    })
    
    if (action === 'stop') {
      await reportStop(task.id)
      ElMessage.success(t('report.stop_success'))
    } else {
      await reportStart(task.id)
      ElMessage.success(t('report.start_success'))
    }
    
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('report.toggle_status_failed'))
    }
  }
}

// 删除
const handleDelete = async (task: any) => {
  try {
    await ElMessageBox.confirm(
      t('report.delete_confirm_message', { name: task.name }),
      t('report.delete_confirm_title'),
      {
        type: 'warning',
        confirmButtonText: t('common.confirm'),
        cancelButtonText: t('common.cancel')
      }
    )
    
    await reportDelete([task.id])
    ElMessage.success(t('report.delete_success'))
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(t('report.delete_failed'))
    }
  }
}

// 格式化调度信息
const formatSchedule = (row: any) => {
  // TODO: 根据rateType和rateVal格式化调度信息
  return t('report.schedule_daily', { time: '12:00' })
}

// 格式化时间
const formatTime = (timestamp: number) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
}

onMounted(() => {
  loadTasks()
})

defineExpose({
  loadTasks
})
</script>

<style lang="less" scoped>
.task-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.task-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.task-table {
  flex: 1;
  
  :deep(.el-table__empty-block) {
    min-height: 200px;
  }
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0;
}

.fire-task-name {
  font-weight: bold;
  color: var(--el-color-primary);
  text-align: center;
  margin-top: 10px;
}
</style>
