<template>
  <div v-loading="searchLoading" class="task-list-wrapper">
    <div class="tool-left">
      <span class="page-title">{{ t('report.title') }}</span>
      <div class="tool-row">
        <el-input
          v-model="searchText"
          :placeholder="t('report.search_placeholder')"
          clearable
          style="width: 240px; margin-right: 12px"
          @input="scheduleSearch"
          @keydown.enter.exact.prevent="handleSearch"
        >
          <template #prefix>
            <el-icon>
              <icon_searchOutline_outlined />
            </el-icon>
          </template>
        </el-input>
        <el-select
          v-model="statusFilter"
          :placeholder="t('report.status_filter')"
          clearable
          style="width: 160px"
          @change="handleSearch"
        >
          <el-option :label="t('report.status_all')" value="" />
          <el-option :label="t('report.status_underway')" value="0" />
          <el-option :label="t('report.status_stopped')" value="1" />
        </el-select>
      </div>
    </div>

    <div v-if="!searchLoading" class="table-content">
      <div class="preview-or-schema">
        <div v-if="listError" class="query-config-error-state">
          <EmptyBackground
            class="query-config-error-state__empty"
            :description="listError"
            img-type="error"
          >
            <el-button secondary :loading="searchLoading" @click="loadTasks">
              {{ t('common.retry') || '重试' }}
            </el-button>
          </EmptyBackground>
        </div>

        <el-table
          v-else
          ref="tableRef"
          :data="taskList"
          style="width: 100%"
          @row-click="handleRowClick"
        >
          <el-table-column prop="name" :label="t('report.task_name')" min-width="200">
            <template #default="{ row }">
              <div class="task-name-cell">
                <span :title="row.name" class="task-name-text">{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            :label="t('report.status')"
            width="100"
            align="center"
            header-align="center"
          >
            <template #default="{ row }">
              <el-tag size="small" :type="row.status === 0 ? 'success' : 'info'" effect="light">
                {{ row.status === 0 ? t('report.status_underway') : t('report.status_stopped') }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column :label="t('report.schedule')" min-width="150">
            <template #default="{ row }">
              {{ formatSchedule(row) }}
            </template>
          </el-table-column>

          <el-table-column :label="t('report.last_exec_time')" width="170">
            <template #default="{ row }">
              <span>{{ formatTime(row.lastExecTime) }}</span>
            </template>
          </el-table-column>

          <el-table-column
            width="186"
            :label="t('common.operations')"
            align="center"
            header-align="center"
          >
            <template #default="{ row }">
              <div class="field-comment" @click.stop>
                <el-tooltip :offset="14" effect="dark" :content="t('common.edit')" placement="top">
                  <el-icon class="action-btn" size="16" @click="emit('edit', row.id)">
                    <icon_edit_outlined />
                  </el-icon>
                </el-tooltip>
                <el-tooltip
                  :offset="14"
                  effect="dark"
                  :content="t('report.fire_now')"
                  placement="top"
                >
                  <el-icon class="action-btn" size="16" @click="handleFireNow(row)">
                    <icon_video_play />
                  </el-icon>
                </el-tooltip>
                <el-tooltip
                  :offset="14"
                  effect="dark"
                  :content="row.status === 0 ? t('report.stop') : t('report.start')"
                  placement="top"
                >
                  <el-icon class="action-btn" size="16" @click="handleToggleStatus(row)">
                    <icon_video_pause v-if="row.status === 0" />
                    <icon_video_play v-else />
                  </el-icon>
                </el-tooltip>
                <el-tooltip
                  :offset="14"
                  effect="dark"
                  :content="t('report.view_log')"
                  placement="top"
                >
                  <el-icon class="action-btn" size="16" @click="emit('view-log', row.id)">
                    <icon_describe />
                  </el-icon>
                </el-tooltip>
                <el-tooltip
                  :offset="14"
                  effect="dark"
                  :content="t('common.delete')"
                  placement="top"
                >
                  <el-icon class="action-btn" size="16" @click="handleDelete(row)">
                    <icon_delete />
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>

          <template #empty>
            <EmptyBackground
              v-if="!searchText && !taskList.length"
              :description="t('report.no_tasks')"
              img-type="noneWhite"
            />
            <EmptyBackground
              v-if="!!searchText && !taskList.length"
              :description="t('report.search_no_result') || '未找到匹配的任务'"
              img-type="tree"
            />
          </template>
        </el-table>
      </div>
    </div>

    <div v-if="taskList.length" class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 30]"
        :background="true"
        layout="total, sizes, prev, pager, next, jumper"
        :total="total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>

  <el-dialog
    v-model="showFireDialog"
    :title="t('report.fire_now_confirm_title')"
    width="420px"
    custom-class="confirm-no_icon"
    :close-on-click-modal="false"
  >
    <p style="font-size: 15px; line-height: 24px; color: #344054">
      {{ t('report.fire_now_confirm_message') }}
    </p>
    <p
      v-if="fireTask"
      style="
        margin-top: 12px;
        font-size: 15px;
        font-weight: 600;
        color: #27364f;
        text-align: center;
      "
    >
      {{ fireTask.name }}
    </p>
    <template #footer>
      <el-button secondary @click="showFireDialog = false">{{ t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="firing" @click="confirmFireNow">
        {{ t('common.sure') }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'
import icon_searchOutline_outlined from '@/assets/svg/sqlbot/icon_search-outline_outlined.svg'
import icon_edit_outlined from '@/assets/svg/sqlbot/icon_edit_outlined.svg'
import icon_delete from '@/assets/svg/sqlbot/icon_delete.svg'
import icon_video_play from '@/assets/svg/sqlbot/icon_video_play.svg'
import icon_video_pause from '@/assets/svg/sqlbot/icon_video_pause.svg'
import icon_describe from '@/assets/svg/sqlbot/icon_describe.svg'
import EmptyBackground from '@/components/empty-background/src/EmptyBackground.vue'
import { useI18n } from '@/hooks/web/useI18n'
import { reportPager, reportFireNow, reportStop, reportStart, reportDelete } from '@/api/report'

const { t } = useI18n()

const emit = defineEmits(['edit', 'view-log', 'refresh'])

const searchLoading = ref(false)
const listError = ref('')
const taskList = ref<any[]>([])
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchText = ref('')
let searchTimer: number | undefined

const showFireDialog = ref(false)
const fireTask = ref<any>(null)
const firing = ref(false)

const statusFilter = ref('')

const loadTasks = async () => {
  searchLoading.value = true
  listError.value = ''
  try {
    const res = await reportPager({
      goPage: currentPage.value,
      pageSize: pageSize.value,
      request: {
        keyword: searchText.value,
        statusList: statusFilter.value !== '' ? [parseInt(statusFilter.value)] : []
      }
    })
    taskList.value = res.data?.list || res?.data || []
    total.value = res.data?.total || res?.total || 0
  } catch {
    listError.value = t('report.load_failed')
    taskList.value = []
    total.value = 0
  } finally {
    searchLoading.value = false
  }
}

const scheduleSearch = ($event: any = {}) => {
  if ($event?.isComposing) return
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    currentPage.value = 1
    loadTasks()
  }, 300)
}

const handleSearch = () => {
  currentPage.value = 1
  loadTasks()
}

const handleSizeChange = (val: number) => {
  currentPage.value = 1
  pageSize.value = val
  loadTasks()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  loadTasks()
}

const handleRowClick = (row: any) => {
  emit('edit', row.id)
}

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
  } catch {
    ElMessage.error(t('report.fire_now_failed'))
  } finally {
    firing.value = false
  }
}

const handleToggleStatus = async (task: any) => {
  const confirmMsg = task.status === 0 ? t('report.stop_confirm') : t('report.start_confirm')
  try {
    await ElMessageBox.confirm(confirmMsg, {
      confirmButtonType: task.status === 0 ? 'danger' : 'primary',
      confirmButtonText: task.status === 0 ? t('report.stop') : t('report.start'),
      cancelButtonText: t('common.cancel'),
      customClass: 'confirm-no_icon',
      autofocus: false
    })
    if (task.status === 0) {
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

const handleDelete = async (task: any) => {
  try {
    await ElMessageBox.confirm(
      t('report.delete_confirm_message', { name: task.name }),
      t('report.delete_confirm_title'),
      {
        confirmButtonType: 'danger',
        confirmButtonText: t('common.delete'),
        cancelButtonText: t('common.cancel'),
        customClass: 'confirm-no_icon',
        autofocus: false
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

const formatSchedule = (row: any) => {
  if (!row.rateType && row.rateType !== 0) return '-'
  const rateVal = row.rateVal || '12:00'
  switch (row.rateType) {
    case 0:
      return t('report.type_hourly') + ' ' + rateVal
    case 1:
      return t('report.type_daily') + ' ' + rateVal
    case 2:
      return t('report.type_weekly') + ' ' + rateVal
    case 3:
      return t('report.type_monthly') + ' ' + rateVal
    default:
      return '-'
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

onMounted(() => {
  loadTasks()
})

onBeforeUnmount(() => {
  if (searchTimer) window.clearTimeout(searchTimer)
})

defineExpose({ loadTasks })
</script>

<style lang="less" scoped>
.task-list-wrapper {
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.tool-left {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .page-title {
    font-weight: 500;
    font-size: 20px;
    line-height: 28px;
  }

  .tool-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.table-content {
  max-height: calc(100% - 104px);
  overflow-y: auto;
  border: 1px solid #e6ebf2;
  border-radius: 12px;

  .preview-or-schema {
    min-width: 0;

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

    :deep(.ed-table__cell) {
      cursor: pointer;
    }

    .task-name-cell {
      display: flex;
      align-items: center;
      min-height: 28px;
    }

    .task-name-text {
      max-width: 100%;
      display: -webkit-box;
      max-height: 72px;
      color: #27364f;
      font-size: 15px;
      line-height: 24px;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      text-overflow: ellipsis;
      word-break: break-word;
    }

    .field-comment {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 32px;

      .ed-icon {
        position: relative;
        cursor: pointer;
        color: #646a73;

        &::after {
          content: '';
          background-color: #1f23291a;
          position: absolute;
          border-radius: 6px;
          width: 28px;
          height: 28px;
          transform: translate(-50%, -50%);
          top: 50%;
          left: 50%;
          display: none;
        }

        &:hover::after {
          display: block;
        }
      }
    }

    .query-config-error-state {
      display: flex;
      min-height: 300px;
      align-items: center;
      justify-content: center;
      background: #fffafa;
    }

    .query-config-error-state__empty {
      width: 100%;
      min-height: 300px;
      padding: 24px;
      box-sizing: border-box;

      :deep(.ed-empty__description) {
        max-width: 520px;
        margin-right: auto;
        margin-left: auto;
        color: #8a3b35;
        font-size: 16px;
        line-height: 24px;
      }
    }
  }
}

.pagination-container {
  display: flex;
  justify-content: end;
  align-items: center;
  margin-top: 16px;
}
</style>
