<script lang="ts" setup>
import { ref, computed, shallowRef, reactive, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'
import icon_searchOutline_outlined from '@/assets/svg/sqlbot/icon_search-outline_outlined.svg'
import icon_admin_outlined from '@/assets/svg/sqlbot/icon_admin_outlined.svg'
import icon_add_outlined from '@/assets/svg/sqlbot/icon_add_outlined.svg'
import icon_done_outlined from '@/assets/svg/sqlbot/icon_done_outlined.svg'
import icon_close_outlined from '@/assets/svg/sqlbot/ope-close.svg'
import ModelList from './components/ModelList.vue'
import ModelForm from './components/ModelFormDrawer.vue'
import {
  listModels,
  createModel,
  updateModel,
  deleteModel,
  getModel,
  setDefaultModel,
  checkModel
} from '@/api/aiQuery'
import Card from './components/ModelCard.vue'
import { getModelTypeName } from '@/utils/sqlbot-entity'
import { get_supplier } from '@/utils/sqlbot-entity'
import { highlightKeyword } from '@/utils/sqlbot-utils'
import { useRoute } from 'vue-router_2'
import { isStarBIPageMode } from '@/utils/sqlbot-utils'
import { useI18n } from '@/hooks/web/useI18n'

interface Model {
  name: string
  model_type: string
  base_model: string
  id?: string
  default_model: boolean
  supplier: number
}

const route = useRoute()
const { t } = useI18n()
const modelApi = {
  queryAll: listModels,
  add: createModel,
  edit: (data: Record<string, unknown>) => updateModel(String(data.id || ''), data),
  delete: deleteModel,
  query: getModel,
  setDefault: setDefaultModel,
  check: checkModel
}
const keywords = ref('')
const defaultModelKeywords = ref('')
const modelConfigvVisible = ref(false)
const searchLoading = ref(false)
const modelListError = ref('')
const editModel = ref(false)
const activeStep = ref(0)
const activeName = ref('')
const activeNameI18nKey = ref('')
const activeType = ref('')
const modelFormRef = ref()
const cardRefs = ref<any[]>([])
const showCardError = ref(false) // if you don`t want card mask error, just change this to false
reactive({
  form: {
    id: '',
    name: '',
    model_type: 0,
    api_key: '',
    api_domain: ''
  },
  selectedIds: []
})
const modelList = shallowRef([] as Model[])
const queryValueToString = (value: string | string[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value || undefined
const isStarBIEmbedded = computed(() => isStarBIPageMode(queryValueToString(route.query.pageMode)))
const modelDrawerSize = computed(() =>
  isStarBIEmbedded.value ? 'calc(100% - 32px)' : 'calc(100% - 100px)'
)
const modelDrawerClass = computed(() =>
  isStarBIEmbedded.value ? 'model-drawer-fullscreen starbi-model-drawer' : 'model-drawer-fullscreen'
)

const modelListWithSearch = computed(() => {
  if (!keywords.value) return modelList.value
  return modelList.value.filter(ele =>
    ele.name.toLowerCase().includes(keywords.value.toLowerCase())
  )
})
const hasSearchKeyword = computed(() => keywords.value.trim().length > 0)
const hasModelResults = computed(() => modelListWithSearch.value.length > 0)
const showSearchEmpty = computed(
  () =>
    hasSearchKeyword.value &&
    !hasModelResults.value &&
    !searchLoading.value &&
    !modelListError.value
)
const showNoModelEmpty = computed(
  () =>
    !hasSearchKeyword.value &&
    !hasModelResults.value &&
    !searchLoading.value &&
    !modelListError.value
)
const beforeClose = () => {
  modelConfigvVisible.value = false
}
const defaultModelListWithSearch = computed(() => {
  let tempModelList = modelList.value
  if (defaultModelKeywords.value) {
    tempModelList = tempModelList.filter(ele =>
      ele.name.toLowerCase().includes(defaultModelKeywords.value.toLowerCase())
    )
  }
  return tempModelList.map((item: any) => {
    item['supplier_item'] = get_supplier(item.supplier)
    return item
  })
})

const modelCheckHandler = async (item: any) => {
  const response = await modelApi.check(item)
  const checkMsg = response?.error || response?.msg || response?.message || ''
  if (!checkMsg) {
    return
  }
  console.warn('Model status check failed')
  if (!showCardError.value) {
    ElMessage.error(checkMsg)
    return
  }
  nextTick(() => {
    const index = modelListWithSearch.value.findIndex((el: any) => el.id === item.id)
    if (index > -1) {
      const currentRef = cardRefs.value[index]
      currentRef?.showErrorMask(checkMsg)
    }
  })
}
const duplicateName = async (item: any) => {
  const res = await modelApi.queryAll()
  const names = res.filter((ele: any) => ele.id !== item.id).map((ele: any) => ele.name)
  if (names.includes(item.name)) {
    ElMessage.error(t('embedded.duplicate_name'))
    return
  }
  const param = {
    ...item
  }
  if (!item.id) {
    modelApi.add(param).then(() => {
      beforeClose()
      search()
      ElMessage({
        type: 'success',
        message: t('workspace.add_successfully')
      })
      modelCheckHandler(item)
    })
    return
  }
  modelApi.edit(param).then(() => {
    beforeClose()
    search()
    ElMessage({
      type: 'success',
      message: t('common.save_success')
    })
    modelCheckHandler(item)
  })
}

const handleDefaultModelChange = (item: any) => {
  const current_default_node = modelList.value.find((ele: Model) => ele.default_model)
  if (current_default_node?.id === item.id) {
    return
  }
  ElMessageBox.confirm(t('model.system_default_model', { msg: item.name }), {
    confirmButtonType: 'primary',
    tip: t('model.operate_with_caution'),
    confirmButtonText: t('datasource.confirm'),
    cancelButtonText: t('common.cancel'),
    customClass: 'confirm-no_icon',
    autofocus: false,
    callback: (val: string) => {
      if (val === 'confirm') {
        modelApi.setDefault(item.id).then(() => {
          ElMessage.success(t('model.set_successfully'))
          search()
        })
      }
    }
  })
}

const formatKeywords = (item: string) => {
  // Use XSS-safe highlight function
  return highlightKeyword(item, defaultModelKeywords.value)
}
const handleAddModel = () => {
  activeStep.value = 0
  editModel.value = false
  modelConfigvVisible.value = true
}
const handleEditModel = (row: any) => {
  activeStep.value = 1
  editModel.value = true
  activeType.value = row.supplier
  activeName.value = row.supplier_item.name
  activeNameI18nKey.value = row.supplier_item.i18nKey
  modelApi.query(row.id).then((res: any) => {
    modelConfigvVisible.value = true
    nextTick(() => {
      modelFormRef.value.initForm({ ...res })
    })
  })
}

const handleDefault = (row: any) => {
  if (row.default_model) return
  ElMessageBox.confirm(t('model.system_default_model', { msg: row.name }), {
    confirmButtonType: 'primary',
    tip: t('model.operate_with_caution'),
    confirmButtonText: t('datasource.confirm'),
    cancelButtonText: t('common.cancel'),
    customClass: 'confirm-no_icon',
    autofocus: false,
    callback: (val: string) => {
      if (val === 'confirm') {
        modelApi.setDefault(row.id).then(() => {
          ElMessage.success(t('model.set_successfully'))
          search()
        })
      }
    }
  })
}

const deleteHandler = (item: any) => {
  if (item.default_model) {
    ElMessageBox.confirm(t('model.del_default_tip', { msg: item.name }), {
      confirmButtonType: 'primary',
      tip: t('model.del_default_warn'),
      showConfirmButton: false,
      confirmButtonText: t('datasource.confirm'),
      cancelButtonText: t('datasource.got_it'),
      customClass: 'confirm-no_icon',
      autofocus: false,
      callback: (val: string) => {
        console.info(val)
      }
    })
    return
  }
  ElMessageBox.confirm(t('model.del_warn_tip', { msg: item.name }), {
    confirmButtonType: 'danger',
    confirmButtonText: t('dashboard.delete'),
    cancelButtonText: t('common.cancel'),
    customClass: 'confirm-no_icon',
    autofocus: false,
    callback: (value: string) => {
      if (value === 'confirm') {
        modelApi.delete(item.id).then(() => {
          ElMessage({
            type: 'success',
            message: t('dashboard.delete_success')
          })
          search()
        })
      }
    }
  })
}

const clickModel = (ele: any) => {
  activeStep.value = 1
  supplierChang(ele)
}

const supplierChang = (ele: any) => {
  activeName.value = ele.name
  activeNameI18nKey.value = ele.i18nKey
  nextTick(() => {
    modelFormRef.value.supplierChang({ ...ele })
  })
}

const cancel = () => {
  beforeClose()
}

const preStep = () => {
  activeStep.value = 0
}

const saveModel = () => {
  modelFormRef.value.submitModel()
}
const setCardRef = (el: any, index: number) => {
  if (el) {
    cardRefs.value[index] = el
  }
}
const search = () => {
  searchLoading.value = true
  modelListError.value = ''
  modelApi
    .queryAll()
    .then((res: any) => {
      modelList.value = Array.isArray(res) ? res : []
    })
    .catch(() => {
      console.warn('Failed to load AI models')
      modelList.value = []
      modelListError.value = '模型服务暂不可用，请确认 SQLBot 后端服务和数据库连接正常后刷新。'
    })
    .finally(() => {
      searchLoading.value = false
    })
}
search()

const submit = (item: any) => {
  duplicateName(item)
}
</script>

<template>
  <div class="model-config no-padding">
    <div class="model-methods">
      <span class="title">{{ t('model.ai_model_configuration') }}</span>
      <div class="button-input">
        <el-input
          v-model="keywords"
          clearable
          style="width: 240px; margin-right: 12px"
          :placeholder="$t('datasource.search')"
        >
          <template #prefix>
            <el-icon>
              <icon_searchOutline_outlined class="svg-icon" />
            </el-icon>
          </template>
        </el-input>

        <el-popover popper-class="system-default_model" placement="bottom-end">
          <template #reference>
            <el-button secondary>
              <template #icon>
                <icon_admin_outlined></icon_admin_outlined>
              </template>
              {{ t('model.system_default_model_de') }}
            </el-button></template
          >
          <div class="popover">
            <el-input
              v-model="defaultModelKeywords"
              clearable
              style="width: 100%; margin-right: 12px"
              :placeholder="t('datasource.search_by_name')"
            >
              <template #prefix>
                <el-icon>
                  <icon_searchOutline_outlined class="svg-icon" />
                </el-icon>
              </template>
            </el-input>
            <div class="popover-content">
              <div
                v-for="ele in defaultModelListWithSearch"
                :key="ele.name"
                class="popover-item"
                :class="ele.default_model && 'isActive'"
                @click="handleDefaultModelChange(ele)"
              >
                <img :src="ele.supplier_item.icon" width="24px" height="24px" />
                <div class="model-name ellipsis" v-html="formatKeywords(ele.name)"></div>
                <el-icon size="16" class="done">
                  <icon_done_outlined></icon_done_outlined>
                </el-icon>
              </div>
              <div v-if="!defaultModelListWithSearch.length" class="popover-item empty">
                {{ t('model.relevant_results_found') }}
              </div>
            </div>
          </div>
        </el-popover>

        <el-button type="primary" @click="handleAddModel">
          <template #icon>
            <icon_add_outlined></icon_add_outlined>
          </template>
          {{ t('model.add_model') }}
        </el-button>
      </div>
    </div>
    <EmptyBackground
      v-if="showSearchEmpty"
      class="search-empty"
      :description="$t('datasource.relevant_content_found')"
      img-type="tree"
    />
    <div v-else-if="modelListError" class="model-error-state">
      <EmptyBackground
        class="model-error-state__empty"
        :description="modelListError"
        img-type="error"
      >
        <el-button secondary :loading="searchLoading" @click="search">
          {{ t('datasource.retry') }}
        </el-button>
      </EmptyBackground>
    </div>
    <div v-else-if="hasModelResults" class="card-content">
      <el-row :gutter="16" class="w-full">
        <el-col
          v-for="(ele, index) in modelListWithSearch"
          :key="ele.id"
          :xs="24"
          :sm="12"
          :md="12"
          :lg="8"
          :xl="6"
          class="mb-16"
        >
          <card
            :id="ele.id"
            :ref="(el: any) => setCardRef(el, index)"
            :key="ele.id"
            :name="ele.name"
            :supplier="ele.supplier"
            :model-type="getModelTypeName(ele['model_type'])"
            :base-model="ele['base_model']"
            :is-default="ele['default_model']"
            @edit="handleEditModel(ele)"
            @del="deleteHandler"
            @default="handleDefault(ele)"
          ></card>
        </el-col>
      </el-row>
    </div>
    <template v-if="showNoModelEmpty">
      <EmptyBackground
        class="datasource-yet"
        :description="$t('common.no_model_yet')"
        img-type="noneWhite"
      />
    </template>
    <el-drawer
      v-model="modelConfigvVisible"
      :close-on-click-modal="false"
      :size="modelDrawerSize"
      :modal-class="modelDrawerClass"
      direction="btt"
      destroy-on-close
      :before-close="beforeClose"
      :show-close="false"
    >
      <template #header="{ close }">
        <span style="white-space: nowrap">{{
          editModel
            ? $t('dashboard.edit') + $t('common.empty') + $t(activeNameI18nKey)
            : t('model.add_model')
        }}</span>
        <div v-if="!editModel" class="flex-center" style="width: 100%">
          <el-steps custom style="max-width: 500px; flex: 1" :active="activeStep" align-center>
            <el-step>
              <template #title> {{ t('model.select_supplier') }} </template>
            </el-step>
            <el-step>
              <template #title> {{ t('model.add_model') }} </template>
            </el-step>
          </el-steps>
        </div>
        <el-icon class="ed-dialog__headerbtn mrt" style="cursor: pointer" @click="close">
          <icon_close_outlined></icon_close_outlined>
        </el-icon>
      </template>
      <ModelList v-if="activeStep === 0" @click-model="clickModel"></ModelList>
      <ModelForm
        v-if="activeStep === 1 && modelConfigvVisible"
        ref="modelFormRef"
        :active-name="activeName"
        :active-type="activeType"
        :edit-model="editModel"
        @submit="submit"
      ></ModelForm>
      <template v-if="activeStep !== 0" #footer>
        <el-button secondary @click="cancel"> {{ $t('common.cancel') }} </el-button>
        <el-button v-if="!editModel" secondary @click="preStep">
          {{ $t('ds.previous') }}
        </el-button>
        <el-button type="primary" @click="saveModel"> {{ $t('common.save') }} </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style lang="less" scoped>
.model-config {
  height: calc(100% - 16px);
  padding: 16px 0 16px 0;
  display: flex;
  flex-direction: column;
  min-height: 0;

  .search-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .datasource-yet {
    flex: 0 0 auto;
    min-height: 300px;
    padding-bottom: 0;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed #dee0e3;
    border-radius: 12px;
    background: #ffffff;
  }

  .model-error-state {
    flex: 0 0 auto;
    min-height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 24px;
    border: 1px dashed #f1c8c4;
    border-radius: 12px;
    background: #fffafa;
  }

  .model-error-state__empty {
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
  .model-methods {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 0 24px 0 24px;
    .title {
      font-weight: 500;
      font-size: 20px;
      line-height: 28px;
    }
  }

  .card-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 8px 0 24px;

    .w-full {
      width: 100%;
    }

    .mb-16 {
      margin-bottom: 16px;
    }
  }
}
</style>

<style lang="less">
.system-default_model.system-default_model {
  padding: 4px 0;
  width: 360px !important;
  box-shadow: 0px 4px 8px 0px #1f23291a;
  border: 1px solid #dee0e3;
  .ed-input {
    .ed-input__wrapper {
      box-shadow: none;
    }

    border-bottom: 1px solid #1f232926;
  }

  .popover {
    .popover-content {
      padding: 4px;
      max-height: 300px;
      overflow-y: auto;
    }
    .popover-item {
      height: 44px;
      display: flex;
      align-items: center;
      padding-left: 12px;
      padding-right: 8px;
      margin-bottom: 2px;
      position: relative;
      border-radius: 4px;
      cursor: pointer;
      &:not(.empty):hover {
        background: #1f23291a;
      }

      &.empty {
        font-weight: 400;
        font-size: 15px;
        line-height: 24px;
        color: #8f959e;
        cursor: default;
      }

      .model-name {
        margin-left: 8px;
        font-weight: 400;
        font-size: 15px;
        line-height: 24px;
        max-width: 250px;
      }

      .done {
        margin-left: auto;
        display: none;
      }

      .isSearch {
        color: var(--ed-color-primary);
      }

      &.isActive {
        color: var(--ed-color-primary);

        .done {
          display: block;
        }
      }
    }
  }
}

.model-drawer-fullscreen {
  .ed-drawer__body {
    padding: 0;
    position: relative;
    overflow: hidden;
  }
  .is-process .ed-step__line {
    background-color: var(--ed-color-primary);
  }
}

.starbi-model-drawer {
  .ed-drawer__header {
    padding: 16px 24px 12px;
  }

  .ed-drawer__body {
    min-height: 0;
  }

  .ed-drawer__footer {
    padding: 12px 24px 20px;
  }
}

.confirm-no_icon {
  border-radius: 12px;
  padding: 24px;
  .tip {
    margin-top: 24px;
  }
}
</style>
