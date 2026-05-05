<template>
  <section class="trusted-answer-overview" aria-label="可信答案层总览">
    <div class="trusted-answer-overview__health">
      <div class="trusted-answer-overview__heading">
        <span class="trusted-answer-overview__eyebrow">Trusted Answer Layer</span>
        <h2>可信健康</h2>
      </div>
      <div class="trusted-answer-overview__metrics">
        <article class="trusted-answer-overview__metric">
          <span class="trusted-answer-overview__metric-label">可信状态</span>
          <strong>{{ healthLabel }}</strong>
        </article>
        <article class="trusted-answer-overview__metric">
          <span class="trusted-answer-overview__metric-label">可信率</span>
          <strong>{{ health?.trusted_rate ?? 0 }}%</strong>
        </article>
        <article class="trusted-answer-overview__metric">
          <span class="trusted-answer-overview__metric-label">阻断问题</span>
          <strong>{{ health?.blocking_issue_count ?? 0 }}</strong>
        </article>
      </div>
      <div class="trusted-answer-overview__status-grid">
        <article class="trusted-answer-overview__status-card">
          <span>动作契约</span>
          <strong>{{ contracts.length }}</strong>
          <p>覆盖可见问数入口与 SQLBot 代理路径</p>
        </article>
        <article class="trusted-answer-overview__status-card">
          <span>运行时开关</span>
          <strong>{{ runtimePolicyLabel }}</strong>
          <p>问数、解读、预测、追问按后端开关执行</p>
        </article>
        <article class="trusted-answer-overview__status-card">
          <span>修正待办</span>
          <strong>{{ correctionTodos.length }}</strong>
          <p>用户反馈与系统诊断进入运营修复队列</p>
        </article>
        <article class="trusted-answer-overview__status-card">
          <span>语义补丁</span>
          <strong>{{ semanticPatchHealthLabel }}</strong>
          <p>已发布/草稿/停用补丁进入健康观察</p>
        </article>
      </div>
    </div>

    <div class="trusted-answer-overview__queue">
      <div class="trusted-answer-overview__heading">
        <span class="trusted-answer-overview__eyebrow">Repair Queue</span>
        <h2>待修复答案</h2>
      </div>
      <div v-if="repairItems.length" class="trusted-answer-overview__repair-list">
        <article
          v-for="item in repairItems.slice(0, 3)"
          :key="item.trace_id || item.todo_id"
          class="trusted-answer-overview__repair-item"
        >
          <div>
            <strong>{{ item.message || item.error_code || '待处理问题' }}</strong>
            <p>{{ item.fix || item.cause || '查看 Trace 定位原因' }}</p>
          </div>
          <button class="trusted-answer-overview__trace-button" type="button">
            {{ item.source_type === 'correction_todo' ? '处理反馈' : '查看 Trace' }}
          </button>
        </article>
      </div>
      <div v-else class="trusted-answer-overview__empty">
        暂无待修复问题，运行一次可信问数后会在这里显示 Trace 证据。
      </div>
      <div v-if="loadError" class="trusted-answer-overview__error">
        {{ loadError }}
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import {
  getTrustedAnswerTrustHealth,
  getTrustedAnswerRuntimePolicy,
  listTrustedAnswerContracts,
  listTrustedAnswerCorrectionTodos,
  listTrustedAnswerRepairQueue,
  listTrustedAnswerSemanticPatches,
  type TrustedAnswerCorrectionTodo,
  type TrustedAnswerEndpointContract,
  type TrustedAnswerRepairItem,
  type TrustedAnswerRuntimePolicy,
  type TrustedAnswerSemanticPatch,
  type TrustedAnswerTrustHealth
} from '@/api/aiTrustedAnswer'

const health = ref<TrustedAnswerTrustHealth | null>(null)
const repairItems = ref<TrustedAnswerRepairItem[]>([])
const contracts = ref<TrustedAnswerEndpointContract[]>([])
const runtimePolicy = ref<TrustedAnswerRuntimePolicy | null>(null)
const correctionTodos = ref<TrustedAnswerCorrectionTodo[]>([])
const semanticPatches = ref<TrustedAnswerSemanticPatch[]>([])
const loadError = ref('')

function unwrapResponse<T>(response: any, fallback: T): T {
  return (response?.data ?? response ?? fallback) as T
}

const healthLabel = computed(() => {
  if (!health.value || health.value.total_trace_count === 0) {
    return '待验证'
  }
  return health.value.trusted ? '可信' : '需修复'
})

const runtimePolicyLabel = computed(() => {
  if (!runtimePolicy.value) {
    return '待加载'
  }
  const switches = [
    runtimePolicy.value.ask_enabled,
    runtimePolicy.value.data_interpretation_enabled,
    runtimePolicy.value.forecast_enabled,
    runtimePolicy.value.followup_enabled
  ]
  const enabledCount = switches.filter(Boolean).length
  return `${enabledCount}/${switches.length}`
})

const semanticPatchHealthLabel = computed(() => {
  if (!semanticPatches.value.length) {
    return '0'
  }
  const publishedCount = semanticPatches.value.filter(item => item.status === 'PUBLISHED').length
  return `${publishedCount}/${semanticPatches.value.length}`
})

const loadOverview = async () => {
  try {
    const [
      healthResult,
      repairQueueResult,
      contractsResult,
      runtimePolicyResult,
      correctionTodosResult,
      semanticPatchesResult
    ] = await Promise.all([
      getTrustedAnswerTrustHealth(),
      listTrustedAnswerRepairQueue(),
      listTrustedAnswerContracts(),
      getTrustedAnswerRuntimePolicy(),
      listTrustedAnswerCorrectionTodos(),
      listTrustedAnswerSemanticPatches()
    ])
    health.value = unwrapResponse<TrustedAnswerTrustHealth | null>(healthResult, null)
    const repairPayload = unwrapResponse<TrustedAnswerRepairItem[]>(repairQueueResult, [])
    repairItems.value = Array.isArray(repairPayload) ? repairPayload : []
    const contractPayload = unwrapResponse<TrustedAnswerEndpointContract[]>(contractsResult, [])
    contracts.value = Array.isArray(contractPayload) ? contractPayload : []
    runtimePolicy.value = unwrapResponse<TrustedAnswerRuntimePolicy | null>(runtimePolicyResult, null)
    const todoPayload = unwrapResponse<TrustedAnswerCorrectionTodo[]>(correctionTodosResult, [])
    correctionTodos.value = Array.isArray(todoPayload) ? todoPayload : []
    const patchPayload = unwrapResponse<TrustedAnswerSemanticPatch[]>(semanticPatchesResult, [])
    semanticPatches.value = Array.isArray(patchPayload) ? patchPayload : []
    loadError.value = ''
  } catch (error) {
    console.error('load trusted answer overview failed', error)
    health.value = null
    repairItems.value = []
    contracts.value = []
    runtimePolicy.value = null
    correctionTodos.value = []
    semanticPatches.value = []
    loadError.value = '可信答案概览暂时不可用，请确认后端服务已更新。'
  }
}

onMounted(() => {
  void loadOverview()
})
</script>

<style lang="less" scoped>
.trusted-answer-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
  gap: 12px;
  margin-bottom: 12px;
}

.trusted-answer-overview__health,
.trusted-answer-overview__queue {
  border: 1px solid #e6ebf2;
  border-radius: 14px;
  background: #fff;
  padding: 14px 16px;
  box-sizing: border-box;
}

.trusted-answer-overview__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.trusted-answer-overview__heading h2 {
  margin: 0;
  color: #1f2733;
  font-size: 16px;
  line-height: 24px;
  font-weight: 700;
}

.trusted-answer-overview__eyebrow {
  color: #5f6f89;
  font-size: 13px;
}

.trusted-answer-overview__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.trusted-answer-overview__status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.trusted-answer-overview__status-card {
  border: 1px solid #e6ebf2;
  border-radius: 12px;
  background: #fbfdff;
  padding: 10px 12px;
}

.trusted-answer-overview__status-card span {
  color: #5f6f89;
  font-size: 13px;
  line-height: 20px;
}

.trusted-answer-overview__status-card strong {
  display: block;
  margin-top: 3px;
  color: #1f2733;
  font-size: 18px;
  line-height: 24px;
}

.trusted-answer-overview__status-card p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 18px;
}

.trusted-answer-overview__metric {
  border-radius: 12px;
  background: #f5f8ff;
  padding: 12px;
}

.trusted-answer-overview__metric-label {
  display: block;
  color: #5f6f89;
  font-size: 14px;
  line-height: 22px;
}

.trusted-answer-overview__metric strong {
  display: block;
  margin-top: 4px;
  color: #1f2733;
  font-size: 20px;
  line-height: 28px;
}

.trusted-answer-overview__repair-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.trusted-answer-overview__repair-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 12px;
  background: #fff7ed;
  padding: 10px 12px;
}

.trusted-answer-overview__repair-item strong {
  color: #1f2733;
  font-size: 15px;
  line-height: 22px;
}

.trusted-answer-overview__repair-item p {
  margin: 2px 0 0;
  color: #6b7280;
  font-size: 14px;
  line-height: 20px;
}

.trusted-answer-overview__trace-button {
  flex: 0 0 auto;
  border: 1px solid #2f6bff;
  border-radius: 10px;
  background: #fff;
  color: #2f6bff;
  font-size: 14px;
  line-height: 22px;
  padding: 7px 12px;
  cursor: pointer;
}

.trusted-answer-overview__empty,
.trusted-answer-overview__error {
  margin-top: 12px;
  border-radius: 12px;
  color: #5f6f89;
  font-size: 14px;
  line-height: 22px;
  padding: 14px;
}

.trusted-answer-overview__empty {
  background: #f8fafc;
}

.trusted-answer-overview__error {
  background: #fff1f2;
  color: #be123c;
}

@media (max-width: 1180px) {
  .trusted-answer-overview {
    grid-template-columns: 1fr;
  }

  .trusted-answer-overview__status-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
