<script lang="ts" setup>
import logo_dingtalk from '@/assets/svg/icon_sqlbot_colorful.svg'
import { ref, reactive } from 'vue'
import InfoTemplate from '@/views/system/common/InfoTemplate.vue'
import thirdEdit from './ThirdEdit.vue'
import request from '@/config/axios'
import { useI18n } from '@/hooks/web/useI18n'
import { ElMessage } from 'element-plus-secondary'
const { t } = useI18n()
type SqlbotMode = 'new' | 'old'
const editorNew = ref()
const editorOld = ref()
const existInfo = ref(true)
const copyList = []
const buildSettingList = () =>
  reactive([
    {
      pkey: t('common.sqlbot_server_url'),
      pval: '',
      type: 'text',
      sort: 2
    },
    {
      pkey: t('common.application_id'),
      pval: '',
      type: 'text',
      sort: 3
    }
  ])

const settingListNew = buildSettingList()
const settingListOld = buildSettingList()

const infoNew = ref({
  id: '',
  domain: '',
  enabled: false,
  valid: false
})
const infoOld = ref({
  id: '',
  domain: '',
  enabled: false,
  valid: false
})
const mappingArray = ['domain', 'id']
const resolveApiPath = (mode: SqlbotMode) => {
  return mode === 'new' ? '/sysParameter/sqlbot' : '/sysParameter/sqlbotOld'
}

const resolveInfoRef = (mode: SqlbotMode) => (mode === 'new' ? infoNew : infoOld)
const resolveSettingList = (mode: SqlbotMode) => (mode === 'new' ? settingListNew : settingListOld)
const resolveEditorRef = (mode: SqlbotMode) => (mode === 'new' ? editorNew : editorOld)

const loadInfo = (mode: SqlbotMode) => {
  const url = resolveApiPath(mode)
  request.get({ url }).then(res => {
    if (res.data) {
      const infoRef = resolveInfoRef(mode)
      const settingList = resolveSettingList(mode)
      infoRef.value = res.data
      for (let index = 0; index < settingList.length; index++) {
        const element = settingList[index]
        const key = mappingArray[index]
        element['pval'] = res.data[key] || '-'
      }
    }
  })
}

const search = () => {
  loadInfo('new')
  loadInfo('old')
}

const switchEnableApi = (mode: SqlbotMode) => {
  const param = { ...(resolveInfoRef(mode).value || {}) }
  request.post({ url: resolveApiPath(mode), data: param })
}

const edit = (mode: SqlbotMode) => {
  resolveEditorRef(mode)?.value?.edit(resolveInfoRef(mode).value)
}

const save = (mode: SqlbotMode) => {
  const param = { ...(resolveInfoRef(mode).value || {}) }
  request.post({ url: resolveApiPath(mode), data: param })
}

const validateHandler = (mode: SqlbotMode) => {
  const infoRef = resolveInfoRef(mode)
  const domain = infoRef.value?.domain
  const id = infoRef.value?.id
  if (!id || !domain) {
    return
  }
  let url = `${domain.endsWith('/') ? domain : domain + '/'}api/v1/system/assistant/info/${id}`
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      return response.json()
    })
    .then(() => {
      infoRef.value.valid = true
      ElMessage.success(t('datasource.validate_success'))
    })
    .catch(() => {
      ElMessage.error(t('data_source.verification_failed'))
      infoRef.value.enabled = false
      infoRef.value.valid = false
    })
    .finally(() => {
      save(mode)
    })
}

const validate = (mode: SqlbotMode) => {
  const infoRef = resolveInfoRef(mode)
  if (infoRef.value?.id && infoRef.value?.domain) {
    validateHandler(mode)
  }
}

search()
</script>

<template>
  <div class="third-party-config">
    <div v-if="infoNew.id" class="container-sys-platform">
      <div class="platform-head-container just-head">
        <div class="platform-setting-head">
          <div class="platform-setting-head-left">
            <div class="lead-left-icon">
              <el-icon size="24px">
                <Icon name="logo_dingtalk"><logo_dingtalk class="svg-icon" /></Icon>
              </el-icon>
              <span>{{ t('starbi.smart_query_title') }}</span>
            </div>
            <div class="lead-left-status" :class="{ invalid: !infoNew.valid }">
              <span>{{ infoNew.valid ? t('datasource.valid') : t('datasource.invalid') }}</span>
            </div>
          </div>
          <div v-if="existInfo" class="platform-setting-head-right">
            <el-switch
              class="status-switch"
              v-model="infoNew.enabled"
              @change="switchEnableApi('new')"
            />
          </div>
          <div v-else class="platform-setting-head-right-btn">
            <el-button type="primary" @click="edit('new')">{{ t('system.access') }}</el-button>
          </div>
        </div>
      </div>
      <InfoTemplate
        v-if="existInfo"
        class="platform-setting-main"
        :copy-list="copyList"
        setting-key="sqlbot"
        setting-title=""
        :hide-head="true"
        :setting-data="settingListNew"
        @edit="() => edit('new')"
      />
      <div v-if="existInfo" class="platform-foot-container">
        <el-button type="primary" @click="edit('new')">
          {{ t('commons.edit') }}
        </el-button>
        <el-button secondary :disabled="!infoNew.id || !infoNew.domain" @click="validate('new')">
          {{ t('commons.validate') }}
        </el-button>
      </div>
    </div>
    <div v-else class="no-params">
      <el-icon size="24px">
        <Icon name="logo_dingtalk"><logo_dingtalk class="svg-icon" /></Icon>
      </el-icon>
      <span style="margin-left: 8px">{{ t('starbi.smart_query_title') }}</span>
      <el-button type="primary" @click="edit('new')">
        {{ t('common.embed') }}
      </el-button>
    </div>

    <div v-if="infoOld.id" class="container-sys-platform old-config">
      <div class="platform-head-container just-head">
        <div class="platform-setting-head">
          <div class="platform-setting-head-left">
            <div class="lead-left-icon">
              <el-icon size="24px">
                <Icon name="logo_dingtalk"><logo_dingtalk class="svg-icon" /></Icon>
              </el-icon>
              <span>{{ t('starbi.smart_query_old_title') }}</span>
            </div>
            <div class="lead-left-status" :class="{ invalid: !infoOld.valid }">
              <span>{{ infoOld.valid ? t('datasource.valid') : t('datasource.invalid') }}</span>
            </div>
          </div>
          <div v-if="existInfo" class="platform-setting-head-right">
            <el-switch
              class="status-switch"
              v-model="infoOld.enabled"
              @change="switchEnableApi('old')"
            />
          </div>
          <div v-else class="platform-setting-head-right-btn">
            <el-button type="primary" @click="edit('old')">{{ t('system.access') }}</el-button>
          </div>
        </div>
      </div>
      <InfoTemplate
        v-if="existInfo"
        class="platform-setting-main"
        :copy-list="copyList"
        setting-key="sqlbotOld"
        setting-title=""
        :hide-head="true"
        :setting-data="settingListOld"
        @edit="() => edit('old')"
      />
      <div v-if="existInfo" class="platform-foot-container">
        <el-button type="primary" @click="edit('old')">
          {{ t('commons.edit') }}
        </el-button>
        <el-button secondary :disabled="!infoOld.id || !infoOld.domain" @click="validate('old')">{{
          t('commons.validate')
        }}</el-button>
      </div>
    </div>
    <div v-else class="no-params old-config">
      <el-icon size="24px">
        <Icon name="logo_dingtalk"><logo_dingtalk class="svg-icon" /></Icon>
      </el-icon>
      <span style="margin-left: 8px">{{ t('starbi.smart_query_old_title') }}</span>
      <el-button type="primary" @click="edit('old')">
        {{ t('common.embed') }}
      </el-button>
    </div>
  </div>

  <third-edit ref="editorNew" :api-path="resolveApiPath('new')" @saved="() => loadInfo('new')" />
  <third-edit
    ref="editorOld"
    :api-path="resolveApiPath('old')"
    :drawer-title="t('common.sqlbot_old_settings')"
    @saved="() => loadInfo('old')"
  />
</template>

<style lang="less" scoped>
.third-party-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.old-config {
  margin-top: 0;
}

.no-params {
  height: 72px;
  border-radius: 4px;
  display: flex;
  padding: 0 24px;
  align-items: center;
  .ed-button {
    margin-left: auto;
  }
}
.container-sys-platform {
  padding: 24px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--ContentBG, #ffffff);
}
.platform-head-container {
  height: 41px;
  border-bottom: 1px solid #1f232926;
}
.just-head {
  height: auto !important;
  border: none !important;
}
.platform-setting-head {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  .platform-setting-head-left {
    display: flex;
    .lead-left-icon {
      display: flex;
      line-height: 24px;
      align-items: center;
      i {
        width: 24px;
        height: 24px;
        font-size: 20px;
      }
      span {
        margin-left: 4px;
        font-family: var(--de-custom_font, 'PingFang');
        font-size: 16px;
        font-style: normal;
        font-weight: 500;
        line-height: 24px;
      }
    }
    .lead-left-status {
      margin-left: 4px;
      width: 40px;
      height: 24px;
      background: #34c72433;
      padding: 0 6px;
      font-size: 14px;
      border-radius: 2px;
      overflow: hidden;
      span {
        line-height: 24px;
        color: #2ca91f;
      }
    }
    .invalid {
      background: #f54a4533 !important;
      span {
        color: #d03f3b !important;
      }
    }
  }
  .platform-setting-head-right-btn {
    height: 32px;
    line-height: 32px;
  }
  .platform-setting-head-right {
    height: 22px;
    line-height: 24px;
    display: flex;
    span {
      margin-right: 8px;
      font-size: 14px;
      height: 22px;
      line-height: 22px;
    }
    .status-switch {
      line-height: 22px !important;
      height: 22px !important;
    }
  }
}

.platform-setting-main {
  display: inline-block;
  width: 100%;
  padding: 16px 0 0 0 !important;
  ::v-deep(.info-template-content) {
    display: contents !important;
  }
}
.platform-foot-container {
  height: 32px;
  margin-top: -7px;
}
</style>
