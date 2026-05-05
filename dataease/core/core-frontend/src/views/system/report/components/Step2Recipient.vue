<template>
  <el-form ref="formRef" :model="formData" label-width="120px">
    <!-- 接收人类型Tab -->
    <el-tabs v-model="activeTab" class="recipient-tabs">
      <!-- 按用户/角色/部门 -->
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

      <!-- 按邮箱 -->
      <el-tab-pane :label="t('report.by_email')" name="email">
        <div class="recipient-content">
          <div class="email-input-list">
            <div
              v-for="(email, index) in formData.emailList"
              :key="index"
              class="email-input-item"
            >
              <el-input
                v-model="formData.emailList[index]"
                :placeholder="t('report.email_placeholder')"
              />
              <el-button
                type="danger"
                link
                @click="removeEmail(index)"
              >
                {{ t('common.delete') }}
              </el-button>
            </div>
            <el-button type="primary" link @click="addEmail">
              <el-icon><Plus /></el-icon>
              {{ t('report.add_email') }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <!-- 按IM群组 -->
      <el-tab-pane :label="t('report.by_im')" name="im">
        <div class="recipient-content">
          <el-radio-group v-model="imType" style="margin-bottom: 15px">
            <el-radio value="dingtalk">{{ t('report.dingtalk') }}</el-radio>
            <el-radio value="lark">{{ t('report.lark') }}</el-radio>
          </el-radio-group>

          <div class="im-input-list">
            <div
              v-for="(group, index) in currentImGroups"
              :key="index"
              class="im-input-item"
            >
              <el-input
                v-model="currentImGroups[index]"
                :placeholder="t('report.webhook_url_placeholder')"
              />
              <el-button
                type="danger"
                link
                @click="removeImGroup(index)"
              >
                {{ t('common.delete') }}
              </el-button>
            </div>
            <el-button type="primary" link @click="addImGroup">
              <el-icon><Plus /></el-icon>
              {{ t('report.add_webhook') }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 已添加的接收人汇总 -->
    <div class="recipient-summary">
      <div class="summary-header">
        <span>{{ t('report.recipient_summary') }}</span>
        <span class="summary-count">({{ totalCount }})</span>
      </div>
      <div class="summary-content">
        <el-tag
          v-for="item in summaryList"
          :key="item.id"
          closable
          @close="removeRecipient(item)"
          style="margin: 5px"
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
import { useI18n } from '@/hooks/web/useI18n'

const { t } = useI18n()

const props = defineProps<{
  formData: any
}>()

const formRef = ref()
const activeTab = ref('org')
const imType = ref('dingtalk')
const selectedOrgItems = ref<any[]>([])

const orgTree = ref<any[]>([])

// 当前IM群组列表
const currentImGroups = computed({
  get: () => {
    return imType.value === 'dingtalk' 
      ? props.formData.dingtalkGroupList 
      : props.formData.larkGroupList
  },
  set: (val) => {
    if (imType.value === 'dingtalk') {
      props.formData.dingtalkGroupList = val
    } else {
      props.formData.larkGroupList = val
    }
  }
})

// 接收人汇总
const summaryList = computed(() => {
  const list: any[] = []
  
  // 组织
  selectedOrgItems.value.forEach(item => {
    list.push({
      id: 'org_' + item.id,
      label: item.name + ' (' + t('report.by_org') + ')',
      type: 'org'
    })
  })
  
  // 邮箱
  props.formData.emailList.forEach((email: string, index: number) => {
    if (email) {
      list.push({
        id: 'email_' + index,
        label: email + ' (' + t('report.by_email') + ')',
        type: 'email'
      })
    }
  })
  
  // IM
  currentImGroups.value.forEach((group: string, index: number) => {
    if (group) {
      list.push({
        id: imType.value + '_' + index,
        label: (imType.value === 'dingtalk' ? t('report.dingtalk') : t('report.lark')) + 
              ' (' + t('report.by_im') + ')',
        type: 'im'
      })
    }
  })
  
  return list
})

const totalCount = computed(() => summaryList.value.length)

// 添加邮箱
const addEmail = () => {
  if (!props.formData.emailList) {
    props.formData.emailList = []
  }
  props.formData.emailList.push('')
}

// 删除邮箱
const removeEmail = (index: number) => {
  props.formData.emailList.splice(index, 1)
}

// 添加IM群组
const addImGroup = () => {
  currentImGroups.value.push('')
}

// 删除IM群组
const removeImGroup = (index: number) => {
  currentImGroups.value.splice(index, 1)
}

// 删除接收人
const removeRecipient = (item: any) => {
  // 根据类型删除
  if (item.type === 'org') {
    const id = parseInt(item.id.replace('org_', ''))
    const index = selectedOrgItems.value.findIndex(i => i.id === id)
    if (index > -1) {
      selectedOrgItems.value.splice(index, 1)
    }
  } else if (item.type === 'email') {
    const index = parseInt(item.id.replace('email_', ''))
    props.formData.emailList.splice(index, 1)
  } else if (item.type === 'im') {
    const index = parseInt(item.id.replace(/\w+_/, ''))
    currentImGroups.value.splice(index, 1)
  }
}

// 验证方法
const validate = () => {
  return new Promise((resolve) => {
    // 至少需要一个接收人
    if (totalCount.value === 0) {
      // TODO: 显示错误提示
      resolve(false)
    } else {
      resolve(true)
    }
  })
}

defineExpose({
  validate
})
</script>

<style lang="less" scoped>
.recipient-tabs {
  min-height: 300px;
}

.recipient-content {
  padding: 20px 0;
}

.email-input-list,
.im-input-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.email-input-item,
.im-input-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.recipient-summary {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color);
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: bold;
  margin-bottom: 15px;
}

.summary-count {
  color: var(--el-color-primary);
}

.summary-content {
  min-height: 60px;
  padding: 10px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}
</style>
