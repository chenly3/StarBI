<script lang="ts" setup>
import icon_searchOutline_outlined from '@/assets/svg/icon_search-outline_outlined.svg'
import icon_add_outlined from '@/assets/svg/icon_add_outlined.svg'
import { onMounted, ref, computed } from 'vue'
import UploadDetail from './UploadDetail.vue'
import { useAppearanceStoreWithOut } from '@/store/modules/appearance'
import { useI18n } from '@/hooks/web/useI18n'
import { deleteById, edit, defaultFont } from '@/api/font'
import { ElMessage, ElMessageBox } from 'element-plus-secondary'
import { cloneDeep } from 'lodash-es'
import '@/views/system/shared/system-setting-page.less'

const appearanceStore = useAppearanceStoreWithOut()
const { t } = useI18n()
const fontKeyword = ref('')
const fontList = ref([])
const basePath = import.meta.env.VITE_API_BASEPATH

const uploadDetail = ref()
const loading = ref(false)
const uploadFont = (title, type, item) => {
  uploadDetail.value.init(title, type, item)
}

const listFont = async () => {
  loading.value = true
  await appearanceStore.setFontList()
  fontList.value = cloneDeep(appearanceStore.fontList)
  loading.value = false
}

const fontListComputed = computed(() => {
  return fontList.value.filter(ele => {
    return ele.name?.toLocaleLowerCase().includes(fontKeyword.value.trim().toLocaleLowerCase())
  })
})

const deleteFont = item => {
  if (item.isDefault) {
    ElMessage.warning(t('system.fonts_before_deleting'))
    return
  }
  ElMessageBox.confirm(t('system.sure_to_delete'), {
    confirmButtonType: 'danger',
    type: 'warning',
    autofocus: false,
    showClose: false
  }).then(() => {
    loading.value = true
    deleteById(item.id)
      .then(() => {
        ElMessage.success(t('common.delete_success'))
        listFont()
        getDefaultFont()
      })
      .finally(() => {
        loading.value = false
      })
  })
}

const setToDefault = item => {
  item.isDefault = 1
  loading.value = true
  edit(item)
    .then(() => {
      ElMessage.success(t('system.setting_successful'))
      getDefaultFont()
      listFont()
    })
    .finally(() => {
      loading.value = false
    })
}
const setDefaultFont = (url, name, fileTransName) => {
  let fontStyleElement = document.querySelector('#de-custom_font')
  if (!fontStyleElement && name) {
    fontStyleElement = document.createElement('style')
    fontStyleElement.setAttribute('id', 'de-custom_font')
    document.querySelector('head').appendChild(fontStyleElement)
  }
  fontStyleElement.innerHTML =
    name && fileTransName
      ? `@font-face {
              font-family: '${name}';
              src: url(${url});
              font-weight: normal;
              font-style: normal;
              }`
      : ''
  document.documentElement.style.setProperty('--de-custom_font', `${name ? name : ''}`)
  document.documentElement.style.setProperty('--van-base-font', `${name ? name : ''}`)
}
const getDefaultFont = () => {
  defaultFont().then(res => {
    const [font] = res || []
    setDefaultFont(
      `${basePath}/typeface/download/${font?.fileTransName}`,
      font?.name,
      font?.fileTransName
    )
  })
}
const uploadFilish = async () => {
  loading.value = true
  await appearanceStore.setFontList()
  fontList.value = cloneDeep(appearanceStore.fontList)
  loading.value = false
  getDefaultFont()
}

onMounted(() => {
  listFont()
})
</script>

<template>
  <main
    class="system-setting-page system-setting-standard font-management-page"
    v-loading="loading"
  >
    <section class="system-setting-page__content font-management-page__content">
      <header class="system-setting-page__title-row">
        <h1 class="system-setting-page__title">{{ t('system.font_management') }}</h1>
        <div class="font-management-tools">
          <el-input
            v-model="fontKeyword"
            clearable
            class="font-management-search"
            :placeholder="t('system.search_font_name')"
          >
            <template #prefix>
              <el-icon>
                <Icon name="icon_search-outline_outlined"
                  ><icon_searchOutline_outlined class="svg-icon"
                /></Icon>
              </el-icon>
            </template>
          </el-input>

          <el-button type="primary" @click="uploadFont(t('system.a_new_font'), 'create', {})">
            <template #icon>
              <Icon name="icon_add_outlined"><icon_add_outlined class="svg-icon" /></Icon>
            </template>
            {{ t('system.add_font') }}
          </el-button>
        </div>
      </header>

      <section class="font-management-content">
        <div class="font-content_list" v-if="fontListComputed.length">
          <div class="font-content_item" v-for="ele in fontListComputed" :key="ele.id || ele.name">
            <span v-if="ele.isDefault" class="font-default">{{ t('system.default_font') }}</span>
            <div class="font-name">
              <span :title="ele.name" :class="!ele.isBuiltin && 'font-name_text'">{{
                ele.name
              }}</span>
              <span v-if="ele.isBuiltin" class="font-type">{{ t('system.system_built_in') }}</span>
            </div>
            <div :title="ele.fileName" class="font-update_time">
              <span
                >{{ t('system.update_time') }} {{ new Date(ele.updateTime).toLocaleString() }}</span
              >
              <span class="line"></span>
              <span :title="ele.fileName" class="font-update_text"
                >{{ t('system.font_file') }} {{ ele.fileName }}</span
              >
            </div>
            <div class="font-upload_btn">
              <el-button
                v-if="!ele.fileTransName"
                @click="uploadFont(t('system.upload_font_file'), 'uploadFile', ele)"
                secondary
                >{{ t('system.upload_font_file') }}</el-button
              >
              <el-button
                v-if="ele.fileTransName"
                @click="uploadFont(t('system.replace_font_file'), 'uploadFile', ele)"
                secondary
                >{{ t('system.replace_font_file') }}</el-button
              >
              <el-button v-if="!ele.isDefault" @click="setToDefault(ele)" secondary>{{
                t('system.as_default_font')
              }}</el-button>
              <el-button v-if="ele.id !== '1'" @click="deleteFont(ele)" secondary>{{
                t('common.delete')
              }}</el-button>
            </div>
          </div>
        </div>
        <div class="font-empty" v-else>
          <empty-background
            :description="$t('work_branch.relevant_content_found')"
            img-type="tree"
          />
        </div>
      </section>
    </section>
    <UploadDetail @finish="uploadFilish" ref="uploadDetail"></UploadDetail>
  </main>
</template>

<style lang="less" scoped>
.font-management-page {
  width: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.font-management-page__content {
  min-height: 0;
  flex: 1;
  overflow: hidden;
}

.font-management-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
  min-width: 0;
}

.font-management-search {
  width: 300px;
  max-width: 42vw;
}

.font-management-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0;
  background: transparent;
  border: none;
}

.font-content_list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr));
  gap: 12px;
  align-content: start;

  .font-content_item {
    width: 100%;
    min-width: 0;
    border: 1px solid #e6ebf2;
    border-radius: 14px;
    background: #fff;
    position: relative;
    padding: 18px 20px;
    box-shadow: 0 8px 20px rgba(31, 68, 143, 0.045);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      border-color: rgba(51, 112, 255, 0.22);
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
    }

    .font-default {
      min-width: 72px;
      height: 28px;
      background: #e8f8e6;
      position: absolute;
      right: 0;
      top: 0;
      font-size: 14px;
      font-weight: 500;
      line-height: 28px;
      color: #2ca91f;
      padding: 0 10px;
      border-bottom-left-radius: 10px;
      border-top-right-radius: 12px;
    }

    .font-name {
      font-size: 16px;
      font-weight: 600;
      line-height: 24px;
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding-right: 84px;
      color: #1f2329;
      min-width: 0;

      .font-name_text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }

      .font-type {
        min-width: 56px;
        height: 22px;
        border-radius: 999px;
        background-color: #eef4ff;
        font-size: 12px;
        font-weight: 500;
        line-height: 22px;
        color: var(--ed-color-primary, rgba(51, 112, 255, 1));
        margin-left: 8px;
        padding: 0 8px;
        white-space: nowrap;
      }
    }

    .font-update_time {
      margin-bottom: 16px;
      font-size: 13px;
      font-weight: 400;
      line-height: 22px;
      color: #646a73;
      display: flex;
      align-items: center;
      white-space: nowrap;
      min-width: 0;

      .line {
        width: 1px;
        height: 16px;
        background: #1f232926;
        margin: 0 8px;
        flex: none;
      }

      .font-update_text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 30px;
      }
    }

    .font-upload_btn {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;

      .ed-button {
        min-width: 0;
        margin: 0;
        height: 34px;
        padding: 0 12px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
      }
    }
  }
}

.font-empty {
  min-height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 1440px) {
  .font-management-content {
    padding: 0;
  }

  .font-content_list {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;

    .font-content_item {
      width: 100%;
      padding: 16px;
    }
  }

  .font-management-search {
    width: 260px;
  }
}

@media (max-width: 960px) {
  .system-setting-page__title-row {
    align-items: stretch;
    flex-direction: column;
  }

  .font-management-tools {
    width: 100%;
    justify-content: flex-start;
  }

  .font-management-search {
    width: 100%;
    max-width: none;
  }

  .font-content_list .font-content_item .font-update_time {
    align-items: flex-start;
    flex-direction: column;
    white-space: normal;

    .line {
      display: none;
    }
  }
}
</style>
