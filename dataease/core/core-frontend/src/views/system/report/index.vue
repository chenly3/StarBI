<template>
  <main class="system-setting-page system-setting-standard report-page">
    <section class="system-setting-page__content report-page__content">
      <header class="system-setting-page__title-row">
        <h1 class="system-setting-page__title">{{ t('report.scheduled_reports') }}</h1>
        <el-button type="primary" @click="handleCreate">{{ t('report.create_task') }}</el-button>
      </header>

      <section class="system-setting-workspace report-content">
        <task-list @edit="handleEdit" @view-log="handleViewLog" @refresh="loadTasks" />
      </section>
    </section>

    <create-wizard
      v-if="showWizard"
      :task-id="editingTaskId"
      @close="handleCloseWizard"
      @success="handleWizardSuccess"
    />

    <task-log-dialog v-if="showLogDialog" :task-id="logTaskId" @close="handleCloseLogDialog" />
  </main>
</template>

<script lang="ts" setup>
import { ref, defineAsyncComponent } from 'vue'
import { useI18n } from '@/hooks/web/useI18n'
import TaskList from './components/TaskList.vue'
const CreateWizard = defineAsyncComponent(() => import('./components/CreateWizard.vue'))
const TaskLogDialog = defineAsyncComponent(() => import('./components/TaskLogDialog.vue'))
import '@/views/system/shared/system-setting-page.less'

const { t } = useI18n()

const showWizard = ref(false)
const editingTaskId = ref<number | null>(null)
const showLogDialog = ref(false)
const logTaskId = ref<number | null>(null)

const handleCreate = () => {
  editingTaskId.value = null
  showWizard.value = true
}

const handleEdit = (taskId: number) => {
  editingTaskId.value = taskId
  showWizard.value = true
}

const handleViewLog = (taskId: number) => {
  logTaskId.value = taskId
  showLogDialog.value = true
}

const handleCloseWizard = () => {
  showWizard.value = false
  editingTaskId.value = null
}

const handleWizardSuccess = () => {
  showWizard.value = false
  editingTaskId.value = null
}

const handleCloseLogDialog = () => {
  showLogDialog.value = false
  logTaskId.value = null
}

const loadTasks = () => undefined
</script>

<style lang="less" scoped>
.report-page {
  width: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  --system-card-border: #d9e5f4;
  --system-header-bg: #ffffff;
  --system-shadow-soft: 0 10px 24px rgba(32, 73, 137, 0.055);
}
</style>
