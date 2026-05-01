<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, unref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'
import icon_export_outlined from '@/assets/svg/sqlbot/icon_export_outlined.svg'
import {
  listSqlExamples,
  createOrUpdateSqlExample,
  deleteSqlExamples,
  enableSqlExample,
  exportSqlExample
} from '@/api/aiQuery'
import { listAdvancedApplications, listDatasources } from '@/api/aiQuery'
import icon_add_outlined from '@/assets/svg/sqlbot/icon_add_outlined.svg'
import IconOpeEdit from '@/assets/svg/sqlbot/icon_edit_outlined.svg'
import icon_copy_outlined from '@/assets/embedded/icon_copy_outlined.svg'
import IconOpeDelete from '@/assets/svg/sqlbot/icon_delete.svg'
import icon_searchOutline_outlined from '@/assets/svg/sqlbot/icon_search-outline_outlined.svg'
import { useClipboard } from '@vueuse/core'
import { cloneDeep } from 'lodash-es'
import Uploader from '@/views/system/excel-upload/Uploader.vue'
import EmptyBackground from '@/components/empty-background/src/EmptyBackground.vue'
import { useI18n } from '@/hooks/web/useI18n'

interface Form {
  id?: string | null
  question: string | null
  datasource: string | null
  datasource_name: string | null
  advanced_application: string | null
  advanced_application_name: string | null
  description: string | null
}
const { t } = useI18n()
const multipleSelectionAll = ref<any[]>([])
const keywords = ref('')
const oldKeywords = ref('')
const searchLoading = ref(false)
const listError = ref('')
const { copy } = useClipboard({ legacy: true })
let searchTimer: number | undefined
const options = ref<any[]>([])
const adv_options = ref<any[]>([])
const selectable = () => {
  return true
}
const trainingApi = {
  getList: (currentPage: number, pageSize: number, params: Record<string, unknown>) =>
    listSqlExamples({ currentPage, pageSize, ...params }),
  updateEmbedded: createOrUpdateSqlExample,
  deleteEmbedded: deleteSqlExamples,
  enable: enableSqlExample,
  export2Excel: exportSqlExample
}
onMounted(() => {
  search()
})

const dialogFormVisible = ref<boolean>(false)
const multipleTableRef = ref()
const isIndeterminate = ref(true)
const checkAll = ref(false)
const fieldList = ref<any>([])
const pageInfo = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const dialogTitle = ref('')
const updateLoading = ref(false)
const defaultForm = {
  id: null,
  question: null,
  description: null,
  datasource: null,
  datasource_name: null,
  advanced_application: null,
  advanced_application_name: null
}
const pageForm = ref<Form>(cloneDeep(defaultForm))
const copyCode = () => {
  copy(pageForm.value.description || '')
    .then(function () {
      ElMessage.success(t('embedded.copy_successful'))
    })
    .catch(function () {
      ElMessage.error(t('embedded.copy_failed'))
    })
}
const cancelDelete = () => {
  handleToggleRowSelection(false)
  multipleSelectionAll.value = []
  checkAll.value = false
  isIndeterminate.value = false
}

const exportExcel = () => {
  ElMessageBox.confirm(t('training.export_hint', { msg: pageInfo.total }), {
    confirmButtonType: 'primary',
    confirmButtonText: t('professional.export'),
    cancelButtonText: t('common.cancel'),
    customClass: 'confirm-no_icon',
    autofocus: false
  }).then(() => {
    searchLoading.value = true
    trainingApi
      .export2Excel(keywords.value ? { question: keywords.value } : {})
      .then(res => {
        const blob = new Blob([res], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${t('training.data_training')}.xlsx`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
      .catch(async error => {
        if (error.response) {
          try {
            let text = await error.response.data.text()
            try {
              text = JSON.parse(text)
            } finally {
              ElMessage({
                message: text,
                type: 'error',
                showClose: true
              })
            }
          } catch {
            console.warn('Failed to parse SQL example export error')
          }
        } else {
          console.warn('Failed to export SQL examples')
          ElMessage({
            message: t('common.download_failed') || '导出失败，请稍后重试',
            type: 'error',
            showClose: true
          })
        }
      })
      .finally(() => {
        searchLoading.value = false
      })
  })
}

const deleteBatchUser = () => {
  ElMessageBox.confirm(
    t('training.training_data_items', { msg: multipleSelectionAll.value.length }),
    {
      confirmButtonType: 'danger',
      confirmButtonText: t('dashboard.delete'),
      cancelButtonText: t('common.cancel'),
      customClass: 'confirm-no_icon',
      autofocus: false
    }
  ).then(() => {
    trainingApi.deleteEmbedded(multipleSelectionAll.value.map(ele => ele.id)).then(() => {
      ElMessage({
        type: 'success',
        message: t('dashboard.delete_success')
      })
      multipleSelectionAll.value = []
      search()
    })
  })
}
const deleteHandler = (row: any) => {
  ElMessageBox.confirm(t('training.sales_this_year', { msg: row.question }), {
    confirmButtonType: 'danger',
    confirmButtonText: t('dashboard.delete'),
    cancelButtonText: t('common.cancel'),
    customClass: 'confirm-no_icon',
    autofocus: false
  }).then(() => {
    trainingApi.deleteEmbedded([row.id]).then(() => {
      multipleSelectionAll.value = multipleSelectionAll.value.filter(ele => row.id !== ele.id)
      ElMessage({
        type: 'success',
        message: t('dashboard.delete_success')
      })
      search()
    })
  })
}
const handleSelectionChange = (val: any[]) => {
  if (toggleRowLoading.value) return
  const arr = fieldList.value.filter(selectable)
  const ids = arr.map((ele: any) => ele.id)
  multipleSelectionAll.value = [
    ...multipleSelectionAll.value.filter((ele: any) => !ids.includes(ele.id)),
    ...val
  ]
  isIndeterminate.value = !(val.length === 0 || val.length === arr.length)
  checkAll.value = val.length === arr.length
}
const handleCheckAllChange = (val: any) => {
  isIndeterminate.value = false
  handleSelectionChange(val ? fieldList.value.filter(selectable) : [])
  if (val) {
    handleToggleRowSelection()
  } else {
    multipleTableRef.value.clearSelection()
  }
}

const toggleRowLoading = ref(false)

const handleToggleRowSelection = (check = true) => {
  toggleRowLoading.value = true
  const arr = fieldList.value.filter(selectable)
  let i = 0
  const ids = multipleSelectionAll.value.map((ele: any) => ele.id)
  for (const key in arr) {
    if (ids.includes((arr[key] as any).id)) {
      i += 1
      multipleTableRef.value.toggleRowSelection(arr[key], check)
    }
  }
  toggleRowLoading.value = false
  checkAll.value = i === arr.length
  isIndeterminate.value = !(i === 0 || i === arr.length)
}

const search = ($event: any = {}) => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
    searchTimer = undefined
  }
  if ($event?.isComposing) {
    return
  }
  searchLoading.value = true
  listError.value = ''
  oldKeywords.value = keywords.value
  trainingApi
    .getList(
      pageInfo.currentPage,
      pageInfo.pageSize,
      keywords.value ? { question: keywords.value } : {}
    )
    .then(res => {
      toggleRowLoading.value = true
      fieldList.value = Array.isArray(res.data) ? res.data : []
      pageInfo.total = Number(res.total_count || fieldList.value.length || 0)
      searchLoading.value = false
      nextTick(() => {
        handleToggleRowSelection()
      })
    })
    .catch(() => {
      console.warn('Failed to load SQL examples')
      fieldList.value = []
      pageInfo.total = 0
      listError.value = 'SQL 示例服务暂不可用，请确认 SQLBot 后端服务和数据库连接正常后刷新。'
    })
    .finally(() => {
      searchLoading.value = false
    })
}

const scheduleSearch = ($event: any = {}) => {
  if ($event?.isComposing) {
    return
  }
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
  searchTimer = window.setTimeout(() => {
    search()
  }, 300)
}

onBeforeUnmount(() => {
  if (searchTimer) {
    window.clearTimeout(searchTimer)
  }
})

const termFormRef = ref()
const requireDatasourceOrAdvancedApplication = (_: any, _value: any, callback: any) => {
  if (!pageForm.value.datasource && !pageForm.value.advanced_application) {
    callback(new Error('请选择数据源或高级应用'))
    return
  }
  callback()
}

const clearDatasourceRequirementError = () => {
  termFormRef.value?.clearValidate(['datasource'])
}

const rules = computed(() => {
  let _list = {
    question: [
      {
        required: true,
        message:
          t('datasource.please_enter') + t('common.empty') + t('training.problem_description')
      }
    ],
    datasource: [{ validator: requireDatasourceOrAdvancedApplication, trigger: 'change' }] as any,
    description: [
      {
        required: true,
        message: t('datasource.please_enter') + t('common.empty') + t('training.sample_sql')
      }
    ]
  }
  return _list
})

const list = () => {
  listDatasources().then((res: any) => {
    options.value = res?.data || res || []
  })
  listAdvancedApplications().then((res: any) => {
    adv_options.value = res?.data || res || []
  })
}

const saveHandler = () => {
  termFormRef.value.validate((res: any) => {
    if (res) {
      const obj: Record<string, unknown> = { ...unref(pageForm) }
      if (!obj.id) {
        delete obj.id
      }
      updateLoading.value = true
      trainingApi
        .updateEmbedded(obj)
        .then(() => {
          ElMessage({
            type: 'success',
            message: t('common.save_success')
          })
          search()
          onFormClose()
        })
        .finally(() => {
          updateLoading.value = false
        })
    }
  })
}

const editHandler = (row: any) => {
  rowInfoDialog.value = false
  pageForm.value.id = null
  if (row) {
    pageForm.value = cloneDeep(row)
  }
  list()

  dialogTitle.value = row?.id ? t('training.edit_training_data') : t('training.add_training_data')
  dialogFormVisible.value = true
}

const onFormClose = () => {
  pageForm.value = cloneDeep(defaultForm)
  dialogFormVisible.value = false
}

const handleSizeChange = (val: number) => {
  pageInfo.currentPage = 1
  pageInfo.pageSize = val
  search()
}

const handleCurrentChange = (val: number) => {
  pageInfo.currentPage = val
  search()
}
const rowInfoDialog = ref(false)

const handleRowClick = (row: any) => {
  dialogFormVisible.value = false
  pageForm.value = cloneDeep(row)
  rowInfoDialog.value = true
}

const changeStatus = (id: any, val: any) => {
  trainingApi
    .enable(id, val + '')
    .then(() => {
      ElMessage({
        message: t('common.save_success'),
        type: 'success'
      })
    })
    .finally(() => {
      search()
    })
}

const onRowFormClose = () => {
  pageForm.value = cloneDeep(defaultForm)
  rowInfoDialog.value = false
}

const formatTimestamp = (value: string | number | Date, fallback = '-') => {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  const pad = (num: number) => `${num}`.padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
</script>

<template>
  <div v-loading="searchLoading" class="training">
    <div class="tool-left">
      <span class="page-title">{{ $t('training.data_training') }}</span>
      <div class="tool-row">
        <el-input
          v-model="keywords"
          style="width: 240px"
          :placeholder="$t('training.search_problem')"
          clearable
          @input="scheduleSearch"
          @keydown.enter.exact.prevent="search"
        >
          <template #prefix>
            <el-icon>
              <icon_searchOutline_outlined />
            </el-icon>
          </template>
        </el-input>
        <el-button secondary @click="exportExcel">
          <template #icon>
            <icon_export_outlined />
          </template>
          {{ $t('professional.export_all') }}
        </el-button>
        <Uploader
          upload-path="/system/data-training/uploadExcel"
          template-path="/system/data-training/template"
          :template-name="`${t('training.data_training')}.xlsx`"
          @upload-finished="search"
        />
        <el-button class="no-margin" type="primary" @click="editHandler(null)">
          <template #icon>
            <icon_add_outlined></icon_add_outlined>
          </template>
          {{ $t('training.add_training_data') }}
        </el-button>
      </div>
    </div>
    <div
      v-if="!searchLoading"
      class="table-content"
      :class="multipleSelectionAll?.length ? 'show-pagination_height' : ''"
    >
      <div class="preview-or-schema">
        <div v-if="listError" class="query-config-error-state">
          <EmptyBackground
            class="query-config-error-state__empty"
            :description="listError"
            img-type="error"
          >
            <el-button secondary :loading="searchLoading" @click="search">
              {{ t('datasource.retry') }}
            </el-button>
          </EmptyBackground>
        </div>
        <el-table
          v-else
          ref="multipleTableRef"
          :data="fieldList"
          style="width: 100%"
          @row-click="handleRowClick"
          @selection-change="handleSelectionChange"
        >
          <el-table-column :selectable="selectable" type="selection" width="44" />
          <el-table-column prop="question" :label="$t('training.problem_description')" width="200">
          </el-table-column>
          <el-table-column prop="description" :label="$t('training.sample_sql')" min-width="250">
            <template #default="scope">
              <div class="field-comment_d">
                <span :title="scope.row.description" class="notes-in_table">{{
                  scope.row.description
                }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="datasource_name" :label="$t('ds.title')" width="130" />
          <el-table-column
            prop="advanced_application_name"
            :label="$t('embedded.advanced_application')"
            width="130"
          />
          <el-table-column label="状态" width="88" align="center" header-align="center">
            <template #default="scope">
              <div class="switch-cell" @click.stop>
                <el-switch
                  v-model="scope.row.enabled"
                  size="small"
                  @change="(val: any) => changeStatus(scope.row.id, val)"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="create_time"
            sortable
            :label="$t('dashboard.create_time')"
            width="150"
          >
            <template #default="scope">
              <span>{{ formatTimestamp(scope.row.create_time) }}</span>
            </template>
          </el-table-column>
          <el-table-column width="76" label="操作" align="center" header-align="center">
            <template #default="scope">
              <div class="field-comment">
                <el-tooltip
                  :offset="14"
                  effect="dark"
                  :content="$t('datasource.edit')"
                  placement="top"
                >
                  <el-icon class="action-btn" size="16" @click.stop="editHandler(scope.row)">
                    <IconOpeEdit></IconOpeEdit>
                  </el-icon>
                </el-tooltip>
                <el-tooltip
                  :offset="14"
                  effect="dark"
                  :content="$t('dashboard.delete')"
                  placement="top"
                >
                  <el-icon class="action-btn" size="16" @click.stop="deleteHandler(scope.row)">
                    <IconOpeDelete></IconOpeDelete>
                  </el-icon>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <template #empty>
            <template v-if="!oldKeywords && !fieldList.length">
              <EmptyBackground
                class="datasource-yet"
                :description="$t('qa.no_data')"
                img-type="noneWhite"
              />

              <div style="margin-top: -23px; text-align: center">
                <el-button type="primary" @click="editHandler(null)">
                  <template #icon>
                    <icon_add_outlined></icon_add_outlined>
                  </template>
                  {{ $t('prompt.add_sql_sample') }}
                </el-button>
              </div>
            </template>

            <EmptyBackground
              v-if="!!oldKeywords && !fieldList.length"
              :description="$t('datasource.relevant_content_found')"
              img-type="tree"
            />
          </template>
        </el-table>
      </div>
    </div>

    <div v-if="fieldList.length" class="pagination-container">
      <el-pagination
        v-model:current-page="pageInfo.currentPage"
        v-model:page-size="pageInfo.pageSize"
        :page-sizes="[10, 20, 30]"
        :background="true"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pageInfo.total"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
    <div v-if="multipleSelectionAll.length" class="bottom-select">
      <el-checkbox
        v-model="checkAll"
        :indeterminate="isIndeterminate"
        @change="handleCheckAllChange"
      >
        {{ $t('datasource.select_all') }}
      </el-checkbox>

      <button class="danger-button" @click="deleteBatchUser">{{ $t('dashboard.delete') }}</button>

      <span class="selected">{{
        $t('user.selected_2_items', { msg: multipleSelectionAll.length })
      }}</span>

      <el-button text @click="cancelDelete">
        {{ $t('common.cancel') }}
      </el-button>
    </div>
  </div>

  <el-drawer
    v-model="dialogFormVisible"
    :title="dialogTitle"
    destroy-on-close
    size="600px"
    :before-close="onFormClose"
    modal-class="training-add_drawer"
  >
    <el-form
      ref="termFormRef"
      :model="pageForm"
      label-width="180px"
      label-position="top"
      :rules="rules"
      class="form-content_error"
      @submit.prevent
    >
      <el-form-item prop="question" :label="t('training.problem_description')">
        <el-input
          v-model="pageForm.question"
          :placeholder="
            $t('datasource.please_enter') + $t('common.empty') + $t('training.problem_description')
          "
          autocomplete="off"
          maxlength="50"
          clearable
        />
      </el-form-item>
      <el-form-item prop="description" :label="t('training.sample_sql')">
        <el-input
          v-model="pageForm.description"
          :placeholder="$t('datasource.please_enter')"
          :autosize="{ minRows: 3.636, maxRows: 11.09 }"
          type="textarea"
        />
      </el-form-item>

      <el-form-item prop="datasource" :label="t('ds.title')">
        <el-select
          v-model="pageForm.datasource"
          filterable
          clearable
          :placeholder="$t('datasource.Please_select') + $t('common.empty') + $t('ds.title')"
          style="width: 100%"
          @change="clearDatasourceRequirementError"
        >
          <el-option v-for="item in options" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>

      <el-form-item prop="advanced_application" :label="t('embedded.advanced_application')">
        <el-select
          v-model="pageForm.advanced_application"
          filterable
          clearable
          :placeholder="
            $t('datasource.Please_select') +
            $t('common.empty') +
            $t('embedded.advanced_application')
          "
          style="width: 100%"
          @change="clearDatasourceRequirementError"
        >
          <el-option
            v-for="item in adv_options"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <div v-loading="updateLoading" class="dialog-footer">
        <el-button secondary @click="onFormClose">{{ $t('common.cancel') }}</el-button>
        <el-button type="primary" @click="saveHandler">
          {{ $t('common.save') }}
        </el-button>
      </div>
    </template>
  </el-drawer>
  <el-drawer
    v-model="rowInfoDialog"
    :title="$t('training.training_data_details')"
    destroy-on-close
    size="600px"
    :before-close="onRowFormClose"
    modal-class="training-term_drawer"
  >
    <el-form label-width="180px" label-position="top" class="form-content_error" @submit.prevent>
      <el-form-item :label="t('training.problem_description')">
        <div class="content">
          {{ pageForm.question }}
        </div>
      </el-form-item>
      <el-form-item :label="t('training.sample_sql')">
        <div style="white-space: pre-wrap" class="content">
          {{ pageForm.description }}
        </div>
        <div class="copy-icon">
          <el-tooltip :offset="12" effect="dark" :content="t('datasource.copy')" placement="top">
            <el-icon class="hover-icon_with_bg" style="cursor: pointer" size="16" @click="copyCode">
              <icon_copy_outlined></icon_copy_outlined>
            </el-icon>
          </el-tooltip>
        </div>
      </el-form-item>
      <el-form-item :label="t('ds.title')">
        <div class="content">
          {{ pageForm.datasource_name }}
        </div>
      </el-form-item>
      <el-form-item :label="t('embedded.advanced_application')">
        <div class="content">
          {{ pageForm.advanced_application_name }}
        </div>
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<style lang="less" scoped>
.no-margin {
  margin: 0;
}
.training {
  height: 100%;
  position: relative;

  .datasource-yet {
    padding-bottom: 0;
    height: auto;
    padding-top: 80px;
  }

  :deep(.ed-table__cell) {
    cursor: pointer;
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
  }

  .tool-row {
    display: flex;
    align-items: center;
    flex-direction: row;
    gap: 8px;
  }

  .pagination-container {
    display: flex;
    justify-content: end;
    align-items: center;
    margin-top: 16px;
  }

  .table-content {
    max-height: calc(100% - 104px);
    overflow-y: auto;
    border: 1px solid #e6ebf2;
    border-radius: 12px;

    &.show-pagination_height {
      max-height: calc(100% - 165px);
    }

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

      :deep(.ed-table-column--selection .cell) {
        padding: 0;
      }

      :deep(.ed-table__fixed-right) {
        box-shadow: -6px 0 12px rgba(15, 23, 42, 0.04);
      }

      .field-comment_d {
        display: flex;
        align-items: center;
        min-height: 28px;
      }

      .notes-in_table {
        max-width: 100%;
        display: -webkit-box;
        max-height: 72px;
        color: #27364f;
        font-size: 15px;
        line-height: 24px;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3; /* 限制行数为3 */
        overflow: hidden;
        text-overflow: ellipsis;
        word-break: break-word;
        white-space: pre-wrap;
      }
      .ed-icon {
        color: #646a73;
      }

      .user-status-container {
        display: flex;
        align-items: center;
        font-weight: 400;
        font-size: 15px;
        line-height: 24px;
        min-height: 28px;

        .ed-icon {
          margin-left: 8px;
        }
      }

      .switch-cell {
        display: flex;
        justify-content: center;
        align-items: center;
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
          margin-top: 0;

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

          &:not(.not-allow):hover {
            &::after {
              display: block;
            }
          }

          &.not-allow {
            cursor: not-allowed;
          }
        }
        .ed-icon + .ed-icon {
          margin-left: 0;
        }
      }

      .preview-num {
        margin: 12px 0;
        font-weight: 400;
        font-size: 15px;
        line-height: 24px;
        color: #646a73;
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

  .bottom-select {
    position: absolute;
    height: 64px;
    width: calc(100% + 48px);
    left: -24px;
    bottom: -16px;
    border-top: 1px solid #1f232926;
    display: flex;
    background-color: #fff;
    align-items: center;
    padding-left: 24px;
    background-color: #fff;
    z-index: 10;

    .danger-button {
      border: 1px solid var(--ed-color-danger);
      color: var(--ed-color-danger);
      border-radius: var(--ed-border-radius-base);
      min-width: 80px;
      height: var(--system-control-height, 44px);
      line-height: var(--system-control-height, 44px);
      text-align: center;
      cursor: pointer;
      margin: 0 16px;
      background-color: transparent;
    }

    .primary-button {
      border: 1px solid var(--ed-color-primary);
      color: var(--ed-color-primary);
      border-radius: var(--ed-border-radius-base);
      min-width: 80px;
      height: var(--system-control-height, 44px);
      line-height: var(--system-control-height, 44px);
      text-align: center;
      cursor: pointer;
      margin: 0 16px;
      background-color: transparent;
    }

    .selected {
      font-weight: 400;
      font-size: 15px;
      line-height: 24px;
      color: #646a73;
      margin-right: 12px;
    }
  }
}
</style>
<style lang="less">
.training-term_drawer {
  .ed-form-item--label-top .ed-form-item__label {
    margin-bottom: 4px;
  }

  .ed-form-item__label {
    color: #646a73;
  }

  .content {
    width: 100%;
    color: #27364f;
    font-size: 15px;
    line-height: 24px;
    word-break: break-all;
  }

  .copy-icon {
    position: absolute;
    right: 0;
    top: -27px;
  }
}

.training-add_drawer {
  .ed-textarea__inner {
    font-size: 15px;
    line-height: 24px;
  }
}
.upload-user {
  height: 32px;
  .ed-upload {
    width: 100% !important;
  }
}
</style>
