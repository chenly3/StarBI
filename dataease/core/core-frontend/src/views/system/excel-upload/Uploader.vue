<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus-secondary'
import icon_upload_outlined from '@/assets/svg/icon_upload_outlined.svg'
import { PATH_URL } from '@/config/axios/service'

const emits = defineEmits(['upload-finished'])

const props = defineProps<{
  uploadPath: string
  templatePath: string
  templateName: string
}>()

const fileInputRef = ref<HTMLInputElement>()
const uploadLoading = ref(false)

const uploadUrl = computed(() => {
  const base = PATH_URL.endsWith('/') ? PATH_URL.slice(0, -1) : PATH_URL
  return `${base}${props.uploadPath}`
})

const open = () => {
  fileInputRef.value?.click()
}

const handleFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (file.size / 1024 / 1024 > 50) {
    ElMessage.error('文件大小不能超过 50MB')
    input.value = ''
    return
  }

  const formData = new FormData()
  formData.append('file', file)
  uploadLoading.value = true

  try {
    const response = await fetch(uploadUrl.value, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    ElMessage.success('导入成功')
    emits('upload-finished')
  } catch (error: any) {
    ElMessage.error(error?.message || '导入失败')
  } finally {
    uploadLoading.value = false
    input.value = ''
  }
}
</script>

<template>
  <el-button class="no-margin" secondary :loading="uploadLoading" @click="open">
    <template #icon>
      <icon_upload_outlined />
    </template>
    {{ $t('user.batch_import') }}
  </el-button>
  <input
    ref="fileInputRef"
    type="file"
    accept=".xlsx,.xls"
    style="display: none"
    @change="handleFileChange"
  />
</template>
