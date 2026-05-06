<template>
  <el-form ref="formRef" :model="localForm" label-position="top" @submit.prevent>
    <el-tabs v-model="activeTab" class="recipient-tabs">
      <el-tab-pane :label="t('report.by_org')" name="org">
        <div class="recipient-content">
          <el-tree-select
            v-model="selectedOrgItems"
            :data="orgTree"
            multiple
            show-checkbox
            :props="{ label: 'name', children: 'children' }"
            :placeholder="t('report.select_org_placeholder')"
            node-key="id"
            style="width: 100%"
          />
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('report.by_email')" name="email">
        <div class="recipient-content">
          <div class="email-input-list">
            <div v-for="(email, index) in localForm.emailList" :key="index" class="input-row">
              <el-input
                v-model="localForm.emailList[index]"
                :placeholder="t('report.email_placeholder')"
              />
              <el-tooltip :offset="14" effect="dark" :content="t('common.delete')" placement="top">
                <el-icon class="hover-icon" size="16" @click.stop="removeEmail(index)">
                  <icon_delete />
                </el-icon>
              </el-tooltip>
            </div>
            <el-button type="primary" link @click="addEmail">
              <el-icon><Plus /></el-icon>
              {{ t('report.add_email') }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('report.by_im')" name="im">
        <div class="recipient-content">
          <el-radio-group v-model="imType" class="im-radio-group">
            <el-radio value="dingtalk">{{ t('report.dingtalk') }}</el-radio>
            <el-radio value="lark">{{ t('report.lark') }}</el-radio>
          </el-radio-group>

          <div class="im-input-list">
            <div v-for="(group, index) in currentImGroups" :key="index" class="input-row">
              <el-input
                v-model="currentImGroups[index]"
                :placeholder="t('report.webhook_url_placeholder')"
              />
              <el-tooltip :offset="14" effect="dark" :content="t('common.delete')" placement="top">
                <el-icon class="hover-icon" size="16" @click.stop="removeImGroup(index)">
                  <icon_delete />
                </el-icon>
              </el-tooltip>
            </div>
            <el-button type="primary" link @click="addImGroup">
              <el-icon><Plus /></el-icon>
              {{ t('report.add_webhook') }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <div class="recipient-summary">
      <div class="summary-header">
        <span class="summary-title">{{ t('report.recipient_summary') }}</span>
        <span class="summary-count">({{ totalCount }})</span>
      </div>
      <div class="summary-content">
        <el-tag
          v-for="item in summaryList"
          :key="item.id"
          closable
          size="large"
          class="summary-tag"
          @close="removeRecipient(item)"
        >
          {{ item.label }}
        </el-tag>
        <el-empty v-if="summaryList.length === 0" :image-size="60" />
      </div>
    </div>
  </el-form>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import icon_delete from '@/assets/svg/sqlbot/icon_delete.svg'
import { useI18n } from '@/hooks/web/useI18n'

const { t } = useI18n()

const props = defineProps<{ formData: any }>()
const emit = defineEmits<{ 'update:formData': [value: any] }>()

const formRef = ref()
const activeTab = ref('org')
const imType = ref('dingtalk')
const selectedOrgItems = ref<any[]>([])
const orgTree = ref<any[]>([])
const localForm = ref({ ...props.formData })

watch(localForm, newVal => emit('update:formData', newVal), { deep: true })

const currentImGroups = computed({
  get: () =>
    imType.value === 'dingtalk' ? localForm.value.dingtalkGroupList : localForm.value.larkGroupList,
  set: val => {
    if (imType.value === 'dingtalk') localForm.value.dingtalkGroupList = val
    else localForm.value.larkGroupList = val
  }
})

const summaryList = computed(() => {
  const list: any[] = []
  selectedOrgItems.value.forEach(item =>
    list.push({
      id: 'org_' + item.id,
      label: item.name + ' (' + t('report.by_org') + ')',
      type: 'org'
    })
  )
  localForm.value.emailList.forEach((email: string, index: number) => {
    if (email)
      list.push({
        id: 'email_' + index,
        label: email + ' (' + t('report.by_email') + ')',
        type: 'email'
      })
  })
  currentImGroups.value.forEach((group: string, index: number) => {
    if (group)
      list.push({
        id: imType.value + '_' + index,
        label:
          (imType.value === 'dingtalk' ? t('report.dingtalk') : t('report.lark')) +
          ' (' +
          t('report.by_im') +
          ')',
        type: 'im'
      })
  })
  return list
})

const totalCount = computed(() => summaryList.value.length)
const addEmail = () => {
  if (!localForm.value.emailList) localForm.value.emailList = []
  localForm.value.emailList.push('')
}
const removeEmail = (index: number) => localForm.value.emailList.splice(index, 1)
const addImGroup = () => currentImGroups.value.push('')
const removeImGroup = (index: number) => currentImGroups.value.splice(index, 1)
const removeRecipient = (item: any) => {
  if (item.type === 'org') {
    const id = parseInt(item.id.replace('org_', ''))
    const index = selectedOrgItems.value.findIndex(i => i.id === id)
    if (index > -1) selectedOrgItems.value.splice(index, 1)
  } else if (item.type === 'email') {
    const index = parseInt(item.id.replace('email_', ''))
    localForm.value.emailList.splice(index, 1)
  } else if (item.type === 'im') {
    const index = parseInt(item.id.replace(/\w+_/, ''))
    currentImGroups.value.splice(index, 1)
  }
}

const validate = () => new Promise(resolve => resolve(totalCount.value > 0))
defineExpose({ validate })
</script>

<style lang="less" scoped>
.recipient-tabs {
  min-height: 280px;
}

.recipient-content {
  padding: 16px 0;
}

.email-input-list,
.im-input-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .hover-icon {
    cursor: pointer;
    color: #646a73;
    position: relative;
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

.im-radio-group {
  margin-bottom: 12px;
}

.recipient-summary {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e6ebf2;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.summary-title {
  font-weight: 600;
  font-size: 15px;
  color: #344054;
}

.summary-count {
  color: var(--system-blue, #1f5eff);
  font-size: 15px;
}

.summary-content {
  min-height: 60px;
  padding: 12px;
  background: #f7f9fc;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
