<template>
  <div class="query-resource-prototype">
    <section class="prototype-page">
      <header class="prototype-page__tools">
        <label class="search-box">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M11.2 10.5l3.1 3.1-.7.7-3.1-3.1a5 5 0 1 1 .7-.7Zm-6.2.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              fill="currentColor"
            />
          </svg>
          <input v-model="keyword" type="text" placeholder="请输入名称搜索" />
        </label>
        <button
          class="ghost-button"
          type="button"
          :disabled="loadingResources"
          @click="handleRefreshList"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 2a6 6 0 1 0 5.6 4H12l2.5-2.5L17 6h-1.4A8 8 0 1 1 8 0v2Z"
              fill="currentColor"
            />
          </svg>
          <span>{{ loadingResources ? '刷新中...' : '刷新列表' }}</span>
        </button>
      </header>

      <div v-if="hasResourceLoadError" class="prototype-page__error">
        <div class="prototype-page__error-copy">
          <strong>问数资源加载失败</strong>
          <span>{{ resourceLoadError }}</span>
        </div>
        <button
          class="ghost-button"
          type="button"
          :disabled="loadingResources"
          @click="handleRefreshList"
        >
          {{ loadingResources ? '刷新中...' : '重新加载' }}
        </button>
      </div>

      <section class="prototype-table" :class="{ 'is-empty': showResourceEmptyState }">
        <div class="prototype-table__header-row">
          <div class="cell cell--select">
            <input v-model="allChecked" type="checkbox" />
          </div>
          <div class="cell cell--name">名称</div>
          <div class="cell cell--creator">创建者</div>
          <div class="cell cell--theme">分析主题</div>
          <div class="cell cell--time">最后学习时间</div>
          <div class="cell cell--status">学习状态</div>
          <div class="cell cell--operation">操作</div>
        </div>

        <div class="prototype-table__body">
          <div v-for="row in filteredRows" :key="row.id" class="prototype-table__data-row">
            <div class="cell cell--select">
              <input v-model="selectedIds" :value="row.id" type="checkbox" />
            </div>
            <div class="cell cell--name cell--name-row">
              <div class="dataset-entry">
                <span class="dataset-entry__title">{{ row.name }}</span>
                <button
                  v-if="isPrototypeRoute"
                  class="name-link"
                  type="button"
                  @click="renameAlias(row)"
                >
                  重命名
                </button>
              </div>
            </div>

            <div class="cell cell--creator">{{ row.creator }}</div>
            <div class="cell cell--theme">{{ row.theme }}</div>
            <div class="cell cell--time">{{ row.lastLearnTime }}</div>
            <div class="cell cell--status">
              <div class="learning-status-cell">
                <div class="learning-status-cell__primary">
                  <LearningStatusTag :status="row.learningStatus || row.status" />
                  <span v-if="hasLearningScore(row)" class="learning-status-cell__score">
                    {{ buildLearningScoreLabel(row) }}
                  </span>
                  <button
                    class="task-detail-link"
                    type="button"
                    @click.stop="openLearningTaskDetail(row)"
                  >
                    任务详情
                  </button>
                </div>
                <span
                  v-if="row.failureReason"
                  class="learning-status-cell__failure"
                  :title="row.failureReason"
                >
                  {{ row.failureReason }}
                </span>
              </div>
            </div>
            <div class="cell cell--operation">
              <button
                class="icon-action"
                type="button"
                :title="buildLearningActionTitle(row)"
                :aria-label="buildLearningActionTitle(row)"
                @click="handleLearningAction(row)"
              >
                <Icon><iconSyncPlayRoundOutlined class="icon-action__svg" /></Icon>
              </button>
              <button
                class="icon-action icon-action--danger"
                type="button"
                title="移除资源"
                aria-label="移除资源"
                @click="removeResource(row)"
              >
                <Icon><iconDeleteTrashOutlined class="icon-action__svg" /></Icon>
              </button>
            </div>
          </div>
          <div
            v-if="showResourceEmptyState"
            class="prototype-table__empty"
            :class="{ 'is-search-empty': hasKeyword, 'is-error': hasResourceLoadError }"
          >
            <div class="prototype-table__empty-card">
              <div class="prototype-table__empty-icon" aria-hidden="true">
                <svg viewBox="0 0 64 64">
                  <path d="M16 16h32v32H16z" fill="#eef4ff" stroke="#b8c7e8" stroke-width="2" />
                  <path
                    d="M23 25h18M23 32h12M23 39h16"
                    stroke="#2f6bff"
                    stroke-width="2.5"
                    stroke-linecap="round"
                  />
                  <path d="M47 45l7 7" stroke="#8ba7e8" stroke-width="3" stroke-linecap="round" />
                </svg>
              </div>
              <div class="prototype-table__empty-title">{{ emptyStateTitle }}</div>
              <p class="prototype-table__empty-copy">{{ emptyStateCopy }}</p>
              <button
                class="primary-inline prototype-table__empty-action"
                type="button"
                :disabled="loadingResources"
                @click="handleRefreshList"
              >
                {{ loadingResources ? '刷新中...' : '刷新列表' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </section>

    <footer class="prototype-footer" :class="{ 'has-selection': selectedIds.length > 0 }">
      <div v-if="selectedIds.length" class="prototype-footer__left">
        <label class="checkbox-wrap">
          <input v-model="allChecked" type="checkbox" />
          <span>全选</span>
        </label>
        <span>已选 {{ selectedIds.length }} 项</span>
        <button class="footer-link" type="button" @click="clearSelection">取消选择</button>
        <button class="footer-link" type="button" @click="removeSelected">移除</button>
      </div>

      <div class="prototype-footer__right">
        <span>共 {{ filteredRows.length }} 条</span>
        <template v-if="isPrototypeRoute">
          <div class="pagination">
            <button class="pagination__button" type="button">‹</button>
            <button class="pagination__button is-active" type="button">1</button>
            <button class="pagination__button" type="button">›</button>
          </div>
          <button class="page-size" type="button">20条/页</button>
        </template>
      </div>
    </footer>

    <el-dialog
      v-if="isPrototypeRoute"
      v-model="quickDialogVisible"
      width="600px"
      :class="['prototype-dialog', 'prototype-dialog--quick', `prototype-dialog--${quickMode}`]"
      :show-close="false"
      destroy-on-close
    >
      <template #header>
        <div class="dialog-header">
          <div class="dialog-header__title">
            <span>快捷提问设置</span>
            <span class="dialog-header__info">ⓘ</span>
          </div>
          <button class="dialog-close" type="button" @click="closeQuickDialog">✕</button>
        </div>
      </template>

      <div class="dialog-body">
        <div class="dialog-field">
          <div class="dialog-label">模式</div>
          <div class="mode-group">
            <label v-for="mode in quickModes" :key="mode.value" class="mode-option">
              <input v-model="quickMode" type="radio" :value="mode.value" />
              <span>{{ mode.label }}</span>
            </label>
          </div>
        </div>

        <div v-if="quickMode === 'system'" class="dialog-card">
          <div class="dialog-card__header">
            <span>预览快捷提问</span>
            <button class="mini-link" type="button" @click="shuffleQuestions">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path
                  d="M8 2a5.5 5.5 0 1 0 5.2 3.8h-1.4l2.2-2.3 2.2 2.3h-1.5A6.9 6.9 0 1 1 8 1v1Z"
                  fill="currentColor"
                />
              </svg>
              <span>换一换</span>
            </button>
          </div>
          <div class="question-stack">
            <div v-for="question in systemQuestions" :key="question" class="question-line">
              {{ question }}
            </div>
          </div>
        </div>

        <div v-else-if="quickMode === 'expert'" class="dialog-card">
          <div class="dialog-card__header">
            <span>预览快捷提问</span>
            <div class="dialog-card__actions">
              <button class="mini-link" type="button" @click="addQuestionBatch">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M8 2v8m-4-4h8M3 11h10v2H3v-2Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>批量添加</span>
              </button>
              <button class="mini-link" type="button" @click="addExpertQuestion">
                <span>+</span>
                <span>添加问题</span>
              </button>
            </div>
          </div>
          <div v-if="expertQuestions.length" class="expert-list">
            <div v-for="question in expertQuestions" :key="question" class="expert-item">
              <span class="expert-item__drag">⋮⋮</span>
              <span class="expert-item__text">{{ question }}</span>
              <button type="button" @click="deleteExpertQuestion(question)">✕</button>
            </div>
          </div>
          <div v-else class="empty-panel">
            <div class="empty-panel__icon empty-panel__icon--trend">◌</div>
            <div class="empty-panel__text">暂无数据</div>
          </div>
        </div>

        <div v-else class="dialog-card">
          <div class="dialog-card__header">
            <span>推荐规则</span>
          </div>
          <div v-if="!objectRuleConfigured" class="empty-panel empty-panel--large">
            <div class="empty-panel__icon empty-panel__icon--trend">◌</div>
            <div class="empty-panel__text">暂未添加推荐规则，请在下方点击添加</div>
            <button class="primary-inline" type="button" @click="openAddRuleDialog">
              + 添加推荐规则
            </button>
          </div>
          <div v-else class="rule-box">
            <div class="rule-box__title">{{ objectRuleSummary.name }}</div>
            <div class="rule-box__user">{{ objectRuleSummary.user }}</div>
            <div class="rule-box__label">推荐问题</div>
            <div class="expert-list expert-list--tight">
              <div
                v-for="(question, index) in objectRuleSummary.questions"
                :key="`${question}-${index}`"
                class="expert-item"
              >
                <span class="expert-item__drag">⋮⋮</span>
                <span class="expert-item__text">{{ question }}</span>
                <button type="button" @click="removeRuleQuestion(index)">✕</button>
              </div>
            </div>
          </div>
          <div class="rule-footer">
            <button class="mini-link" type="button" @click="openAddRuleDialog">+ 添加规则</button>
            <div class="rule-footer__right">
              <span>其他用户</span>
              <button class="selector-button" type="button">专家自定义 ▾</button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <button class="secondary-button" type="button" @click="closeQuickDialog">取消</button>
          <button class="primary-button" type="button" @click="closeQuickDialog">确定</button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-if="isPrototypeRoute"
      v-model="ruleDialogVisible"
      width="600px"
      :class="[
        'prototype-dialog',
        'prototype-dialog--rule',
        { 'prototype-dialog--rule-complete': isRuleCompleteRoute }
      ]"
      :show-close="false"
      destroy-on-close
    >
      <template #header>
        <div class="dialog-header">
          <span>添加推荐规则</span>
          <button class="dialog-close" type="button" @click="closeRuleDialog">✕</button>
        </div>
      </template>

      <div class="dialog-body">
        <div class="dialog-field">
          <div class="dialog-label">推荐规则名称</div>
          <input
            v-model="ruleForm.name"
            class="field-input"
            type="text"
            placeholder="给当前推荐规则起个名字方便检索..."
          />
        </div>

        <div class="dialog-field">
          <div class="dialog-label">推荐对象</div>
          <button class="field-select" type="button" @click="toggleUserPanel">
            <template v-if="showSelectedRuleUser">
              <span class="field-select__selected">
                <span class="field-select__icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16">
                    <path
                      d="M8 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm0 1.5c-2.8 0-5 1.6-5 3.5h10c0-1.9-2.2-3.5-5-3.5Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span class="field-select__tag">
                  {{ ruleForm.user }}
                  <button type="button" @click.stop="clearRuleUser">×</button>
                </span>
              </span>
            </template>
            <span v-else>选择用户</span>
            <span>▾</span>
          </button>
          <div v-if="userPanelVisible && !isRuleCompleteRoute" class="user-panel">
            <div class="user-panel__inner">
              <label class="search-box search-box--panel">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M11.2 10.5l3.1 3.1-.7.7-3.1-3.1a5 5 0 1 1 .7-.7Zm-6.2.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                    fill="currentColor"
                  />
                </svg>
                <input v-model="userKeyword" type="text" placeholder="搜索用户" />
              </label>
              <label v-for="user in filteredUsers" :key="user" class="user-option">
                <input v-model="ruleForm.user" type="radio" :value="user" />
                <span>{{ user }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="dialog-field">
          <div class="dialog-label">推荐问题</div>
          <div class="dialog-card dialog-card--question">
            <div class="dialog-card__header dialog-card__header--flat">
              <span>预览快捷提问</span>
              <div class="dialog-card__actions">
                <button class="mini-link" type="button">
                  <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M8 2v8m-4-4h8M3 11h10v2H3v-2Z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.3"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  <span>批量添加</span>
                </button>
                <button class="mini-link" type="button" @click="appendRuleQuestion">
                  <span>+</span>
                  <span>添加问题</span>
                </button>
              </div>
            </div>
            <div class="expert-list expert-list--tight expert-list--card">
              <div
                v-for="(question, index) in ruleForm.questions"
                :key="`${question}-${index}`"
                class="expert-item"
              >
                <span class="expert-item__drag">⋮⋮</span>
                <input v-model="ruleForm.questions[index]" class="expert-item__input" type="text" />
                <button type="button" @click="removeRuleQuestion(index)">✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <button class="secondary-button" type="button" @click="cancelRuleDialog">取消</button>
          <button class="primary-button" type="button" @click="completeRuleDialog">确定</button>
        </div>
      </template>
    </el-dialog>

    <el-dialog
      v-if="isPrototypeRoute"
      v-model="previewVisible"
      width="760px"
      class="prototype-dialog"
      :show-close="false"
      destroy-on-close
    >
      <template #header>
        <div class="dialog-header">
          <span>{{ previewRow?.name || '预览数据' }}</span>
          <button class="dialog-close" type="button" @click="closePreviewDialog">✕</button>
        </div>
      </template>
      <div class="preview-panel">
        <div class="preview-meta">
          <div><strong>数据集名称：</strong>{{ previewRow?.name }}</div>
          <div><strong>创建者：</strong>{{ previewRow?.creator }}</div>
          <div><strong>分析主题：</strong>{{ previewRow?.theme }}</div>
        </div>
        <table class="preview-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>地市</th>
              <th>产品</th>
              <th>收入</th>
              <th>新增用户</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in previewRows" :key="`${item.date}-${item.city}`">
              <td>{{ item.date }}</td>
              <td>{{ item.city }}</td>
              <td>{{ item.product }}</td>
              <td>{{ item.revenue }}</td>
              <td>{{ item.users }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </el-dialog>

    <LearningTaskDrawer
      v-model="learningDrawerVisible"
      :task-id="selectedLearningTaskId"
      :resource-name="selectedLearningRow?.name"
      :status="selectedLearningRow?.learningStatus || selectedLearningRow?.status || '待学习'"
      :quality-grade="selectedLearningQualitySummary?.grade || selectedLearningRow?.qualityGrade"
      :signals="
        selectedLearningQualitySummary?.signals ||
        selectedLearningRow?.qualitySummary?.signals ||
        selectedLearningRow?.learningSignals ||
        []
      "
      :suggestions="
        selectedLearningQualitySummary?.suggestions ||
        selectedLearningRow?.qualitySummary?.suggestions ||
        selectedLearningRow?.learningSuggestions ||
        []
      "
      :failure-reason="selectedLearningRow?.failureReason || ''"
      :feedback-summary="
        selectedLearningFeedbackSummary || selectedLearningRow?.feedbackSummary || null
      "
      @update:model-value="handleLearningDrawerVisibleChange"
      @retry="handleLearningRetry"
    />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router_2'
import { ElMessage } from 'element-plus-secondary'
import { Icon } from '@/components/icon-custom'
import iconSyncPlayRoundOutlined from '@/assets/svg/icon_sync-play-round_outlined.svg'
import iconDeleteTrashOutlined from '@/assets/svg/icon_delete-trash_outlined.svg'
import {
  deleteQueryLearningResource,
  getQueryLearningFeedbackSummary,
  getQueryLearningQualitySummary,
  listQueryLearningResources,
  resolveQueryLearningDatasourceName,
  triggerQueryLearning,
  type QueryLearningDeleteResult,
  type QueryLearningFeedbackSummary,
  type QueryLearningQualitySummary,
  type QueryLearningResource
} from '@/api/queryResourceLearning'
import LearningStatusTag from './components/LearningStatusTag.vue'
import LearningTaskDrawer from './components/LearningTaskDrawer.vue'

type QuickMode = 'system' | 'expert' | 'object'

interface ResourceRow {
  id: string
  name: string
  creator: string
  theme: string
  lastLearnTime: string
  status: string
  learningStatus?: string
  qualityGrade?: string
  qualityScore?: number
  qualitySummary?: QueryLearningQualitySummary | null
  learningTaskId?: string
  learningSignals?: string[]
  learningSuggestions?: string[]
  failureReason?: string
  feedbackSummary?: QueryLearningFeedbackSummary | null
  readinessState?: string
  askabilityState?: string
  recommendationCount?: number
  failureRate30d?: number
  negativeFeedbackRate30d?: number
  ambiguityRate30d?: number
}

const route = useRoute()
const router = useRouter()
const isPrototypeRoute = computed(() => route.path === '/query-config-prototype')

const fallbackRows: ResourceRow[] = [
  {
    id: '1',
    name: '自动化销售数据集_20260409',
    creator: '李永',
    theme: '哈哈',
    lastLearnTime: '2026/04/23 22:37:22',
    status: '学习成功',
    learningStatus: '学习成功',
    qualityGrade: 'A',
    qualityScore: 96,
    qualitySummary: {
      risks: [],
      signals: ['字段完整度高', '语义标签已生成'],
      suggestions: ['补充更多业务问题示例']
    },
    learningTaskId: 'task-20260424-001',
    learningSignals: ['字段完整度高', '语义标签已生成'],
    learningSuggestions: ['补充更多业务问题示例'],
    feedbackSummary: {
      totalFeedbackCount: 6,
      downvoteCount: 1,
      downvoteRate: 17,
      failureCount: 1,
      failureRate: 17,
      relearningSuggested: false,
      triggerReason: 'observe',
      relearningAdvice: '当前反馈稳定，建议持续观察。',
      recentIssues: []
    }
  },
  {
    id: '2',
    name: '门店经营分析数据集_20260418',
    creator: '王璐',
    theme: '门店运营',
    lastLearnTime: '2026/04/24 08:15:40',
    status: '学习失败',
    learningStatus: '学习失败',
    learningTaskId: 'task-20260424-002',
    failureReason: '数据源连接超时，未能完成字段语义抽取，请检查网络或凭证后重试。'
  }
]

const rows = ref<ResourceRow[]>(isPrototypeRoute.value ? fallbackRows.map(row => ({ ...row })) : [])

const previewRows = ref([
  { date: '2026-04-23', city: '南昌', product: '宽带', revenue: '128,900', users: 340 },
  { date: '2026-04-23', city: '九江', product: '宽带', revenue: '96,500', users: 251 },
  { date: '2026-04-23', city: '赣州', product: '宽带', revenue: '117,200', users: 298 }
])

const keyword = ref('')
const selectedIds = ref<string[]>(isPrototypeRoute.value ? ['1'] : [])
const loadingResources = ref(false)
const resourceLoadError = ref('')
const quickDialogVisible = ref(false)
const quickMode = ref<QuickMode>('system')
const expertQuestions = ref<string[]>([])
const systemQuestionsSeed = [
  '2026年4月产品1为B产品的订单数1',
  '分组为分组2的销售额1的年环比',
  '不同产品1的销售额1的占比',
  '不同月份的销售额1的年度累计情况'
]
const systemQuestions = ref([...systemQuestionsSeed])
const ruleDialogVisible = ref(false)
const previewVisible = ref(false)
const learningDrawerVisible = ref(false)
const selectedLearningTaskId = ref<string | null>(null)
const learningTaskIdOverrides = reactive<Record<string, string>>({})
const resourceNameOverrides = reactive<Record<string, string>>({})
const qualitySummaryByResourceId = reactive<Record<string, QueryLearningQualitySummary>>({})
const feedbackSummaryByResourceId = reactive<Record<string, QueryLearningFeedbackSummary>>({})
const learningSummaryRequestVersionByResourceId = reactive<Record<string, number>>({})
const resourceNameRequestVersion = ref(0)
const userPanelVisible = ref(false)
const userKeyword = ref('')
const objectRuleConfigured = ref(false)
const previewRow = ref<ResourceRow | null>(null)

const ruleForm = reactive({
  name: '',
  user: '',
  questions: ['AAA']
})

const quickModes = [
  { value: 'system' as QuickMode, label: '系统推荐' },
  { value: 'expert' as QuickMode, label: '专家自定义' },
  { value: 'object' as QuickMode, label: '按对象推荐' }
]

const users = ['李永', '李川', '王璐', '张宁']

const fallbackRowMap = new Map(
  fallbackRows.flatMap(row => [
    [row.id, row],
    [row.name, row]
  ])
)

const filteredRows = computed(() => {
  const search = keyword.value.trim().toLowerCase()
  if (!search) {
    return rows.value
  }
  return rows.value.filter(row => row.name.toLowerCase().includes(search))
})

const hasKeyword = computed(() => keyword.value.trim().length > 0)

const showResourceEmptyState = computed(
  () => !loadingResources.value && filteredRows.value.length === 0 && !hasResourceLoadError.value
)

const hasResourceLoadError = computed(() => resourceLoadError.value.trim().length > 0)

const emptyStateTitle = computed(() => {
  if (hasResourceLoadError.value) {
    return '问数资源加载失败'
  }
  return hasKeyword.value ? '没有匹配的问数资源' : '暂无问数资源'
})

const emptyStateCopy = computed(() => {
  if (hasResourceLoadError.value) {
    return `资源学习服务暂不可用：${resourceLoadError.value}。请确认 SQLBot 上游服务已启动后刷新。`
  }
  return hasKeyword.value
    ? '当前搜索条件下没有资源，请调整关键词后重试。'
    : '当前接口没有返回可学习资源。请先完成分析主题或数据集资源接入，再刷新同步最新资源。'
})

const filteredUsers = computed(() => {
  if (route.query.panel === 'user') {
    return ['李永']
  }
  const search = userKeyword.value.trim()
  if (!search) {
    return users
  }
  return users.filter(user => user.includes(search))
})

const isRuleCompleteRoute = computed(() => route.query.preset === 'rule-complete')

const showSelectedRuleUser = computed(
  () => Boolean(ruleForm.user) && (!userPanelVisible.value || isRuleCompleteRoute.value)
)

const allChecked = computed({
  get: () =>
    filteredRows.value.length > 0 && selectedIds.value.length === filteredRows.value.length,
  set: checked => {
    selectedIds.value = checked ? filteredRows.value.map(row => row.id) : []
  }
})

const objectRuleSummary = computed(() => ({
  name: ruleForm.name || '当前推荐规则',
  user: ruleForm.user || '李永',
  questions: ruleForm.questions.filter(Boolean)
}))

const selectedLearningRow = computed(
  () =>
    rows.value.find(
      row =>
        row.id === selectedLearningTaskId.value ||
        row.learningTaskId === selectedLearningTaskId.value
    ) || null
)

const selectedLearningQualitySummary = computed(() => {
  const row = selectedLearningRow.value
  if (!row) {
    return undefined
  }
  return qualitySummaryByResourceId[row.id] || row.qualitySummary || undefined
})

const selectedLearningFeedbackSummary = computed(() => {
  const row = selectedLearningRow.value
  if (!row) {
    return undefined
  }
  return feedbackSummaryByResourceId[row.id] || row.feedbackSummary || undefined
})

const loadLearningDrawerSummaries = (taskId: string) => {
  const selectedRow = rows.value.find(row => row.id === taskId || row.learningTaskId === taskId)
  if (!selectedRow) {
    return
  }
  const requestVersion = (learningSummaryRequestVersionByResourceId[selectedRow.id] || 0) + 1
  learningSummaryRequestVersionByResourceId[selectedRow.id] = requestVersion
  void Promise.all([
    getQueryLearningQualitySummary(selectedRow.id).then(summary => {
      if (
        summary &&
        learningSummaryRequestVersionByResourceId[selectedRow.id] === requestVersion &&
        (selectedLearningTaskId.value === taskId ||
          selectedLearningRow.value?.id === selectedRow.id)
      ) {
        qualitySummaryByResourceId[selectedRow.id] = summary
      }
    }),
    getQueryLearningFeedbackSummary(selectedRow.id).then(summary => {
      if (
        summary &&
        learningSummaryRequestVersionByResourceId[selectedRow.id] === requestVersion &&
        (selectedLearningTaskId.value === taskId ||
          selectedLearningRow.value?.id === selectedRow.id)
      ) {
        feedbackSummaryByResourceId[selectedRow.id] = summary
      }
    })
  ]).catch(() => undefined)
}

const syncRouteState = () => {
  const dialog = String(route.query.dialog || '')
  const mode = String(route.query.mode || '')
  const panel = String(route.query.panel || '')
  const preset = String(route.query.preset || '')
  const taskId = String(route.query.taskId || '')
  const previewId = String(route.query.previewId || '')

  quickDialogVisible.value = false
  ruleDialogVisible.value = false
  previewVisible.value = false
  learningDrawerVisible.value = false
  selectedLearningTaskId.value = null
  expertQuestions.value = []

  if (!isPrototypeRoute.value) {
    objectRuleConfigured.value = false
    userPanelVisible.value = false
    if (dialog === 'learning-task' && taskId) {
      selectedLearningTaskId.value = taskId
      learningDrawerVisible.value = true
      loadLearningDrawerSummaries(taskId)
    }
    return
  }

  if (preset === 'expert-filled') {
    expertQuestions.value = ['xxx销售金额占比']
  }
  if (preset === 'rule-complete') {
    objectRuleConfigured.value = true
    ruleForm.name = 'xxx'
    ruleForm.user = '李永'
    ruleForm.questions = ['AAA']
  } else {
    objectRuleConfigured.value = false
  }

  if (mode === 'system' || mode === 'expert' || mode === 'object') {
    quickMode.value = mode
  }

  if (dialog === 'quick') {
    quickDialogVisible.value = true
  }

  if (dialog === 'rule') {
    quickDialogVisible.value = false
    quickMode.value = 'object'
    ruleDialogVisible.value = true
  }

  if (dialog === 'preview') {
    previewRow.value =
      rows.value.find(row => row.id === previewId) || previewRow.value || rows.value[0]
    previewVisible.value = true
  }

  if (dialog === 'learning-task' && taskId) {
    selectedLearningTaskId.value = taskId
    learningDrawerVisible.value = true
    loadLearningDrawerSummaries(taskId)
  }

  userPanelVisible.value = panel === 'user'
}

watch(
  () => route.fullPath,
  () => syncRouteState(),
  { immediate: true }
)

const updatePrototypeRoute = (query: Record<string, string | undefined>) => {
  router.replace({
    path: route.path,
    query
  })
}

const buildResourceRow = (resource: QueryLearningResource): ResourceRow => {
  const fallbackRow = isPrototypeRoute.value
    ? fallbackRowMap.get(resource.id) || fallbackRowMap.get(resource.name)
    : null
  const isFailure = resource.learningStatus.includes('失败')
  const qualitySummary = resource.qualitySummary || fallbackRow?.qualitySummary || null
  const resolvedNameOverride = resourceNameOverrides[resource.id]
  let resourceName = resolvedNameOverride
  if (!resourceName) {
    resourceName =
      !resource.name || (fallbackRow?.name && resource.name === resource.id)
        ? fallbackRow?.name || resource.name || '未命名资源'
        : resource.name
  }
  const resolvedFailureReason =
    resource.failureReason || (isFailure ? fallbackRow?.failureReason : '')

  return {
    id: resource.id,
    name: resourceName,
    creator: resource.creator || fallbackRow?.creator || '-',
    theme: resource.theme || fallbackRow?.theme || '-',
    lastLearnTime: resource.lastLearningTime || fallbackRow?.lastLearnTime || '--',
    status: resource.learningStatus,
    learningStatus: resource.learningStatus,
    qualityGrade: resource.qualityGrade || fallbackRow?.qualityGrade,
    qualityScore: resource.qualityScore,
    qualitySummary,
    learningTaskId:
      learningTaskIdOverrides[resource.id] || fallbackRow?.learningTaskId || resource.id,
    learningSignals: qualitySummary?.signals || fallbackRow?.learningSignals || [],
    learningSuggestions: qualitySummary?.suggestions || fallbackRow?.learningSuggestions || [],
    failureReason:
      resolvedFailureReason || (isFailure ? '学习任务执行失败，请查看任务详情后重试。' : ''),
    feedbackSummary: resource.feedbackSummary || fallbackRow?.feedbackSummary || null,
    readinessState: resource.readinessState,
    askabilityState: resource.askabilityState,
    recommendationCount: resource.recommendationCount,
    failureRate30d: resource.failureRate30d,
    negativeFeedbackRate30d: resource.negativeFeedbackRate30d,
    ambiguityRate30d: resource.ambiguityRate30d
  }
}

const isPlaceholderResourceName = (name: string, resourceId: string) => {
  const normalizedName = name.trim()
  if (!normalizedName) {
    return true
  }
  if (normalizedName === resourceId) {
    return true
  }
  return /^\d+$/.test(normalizedName) && normalizedName === String(resourceId).trim()
}

const syncResolvedResourceNames = async (targetRows: ResourceRow[]) => {
  const unresolvedRows = targetRows.filter(row => {
    if (resourceNameOverrides[row.id]) {
      return false
    }
    return isPlaceholderResourceName(row.name, row.id)
  })
  if (unresolvedRows.length === 0) {
    return
  }

  const requestVersion = resourceNameRequestVersion.value + 1
  resourceNameRequestVersion.value = requestVersion

  const resolvedNames = await Promise.all(
    unresolvedRows.map(async row => ({
      id: row.id,
      name: await resolveQueryLearningDatasourceName(row.id)
    }))
  )
  if (resourceNameRequestVersion.value !== requestVersion) {
    return
  }

  let hasOverrideChange = false
  for (const resolvedItem of resolvedNames) {
    const nextName = resolvedItem.name || `未关联数据源(${resolvedItem.id})`
    if (resourceNameOverrides[resolvedItem.id] === nextName) {
      continue
    }
    resourceNameOverrides[resolvedItem.id] = nextName
    hasOverrideChange = true
  }
  if (!hasOverrideChange) {
    return
  }

  rows.value = rows.value.map(row => {
    const overrideName = resourceNameOverrides[row.id]
    if (!overrideName || row.name === overrideName) {
      return row
    }
    return {
      ...row,
      name: overrideName
    }
  })

  if (previewRow.value && resourceNameOverrides[previewRow.value.id]) {
    previewRow.value = {
      ...previewRow.value,
      name: resourceNameOverrides[previewRow.value.id]
    }
  }
}

const syncSelectedIds = () => {
  const rowIdSet = new Set(rows.value.map(row => row.id))
  selectedIds.value = selectedIds.value.filter(id => rowIdSet.has(id))
}

const loadLearningResources = async (options?: { silent?: boolean }) => {
  loadingResources.value = true
  try {
    const resources = await listQueryLearningResources()
    const nextRows = resources.map(buildResourceRow)
    resourceLoadError.value = ''
    rows.value = nextRows
    syncSelectedIds()
    void syncResolvedResourceNames(nextRows)
    if (selectedLearningTaskId.value) {
      loadLearningDrawerSummaries(selectedLearningTaskId.value)
    }
  } catch (error) {
    resourceLoadError.value = error instanceof Error ? error.message : String(error || '未知错误')
    rows.value = isPrototypeRoute.value ? fallbackRows.map(row => ({ ...row })) : []
    syncSelectedIds()
    if (!options?.silent) {
      ElMessage.warning(
        isPrototypeRoute.value ? '学习资源接口暂不可用，已展示本地演示数据' : '学习资源接口暂不可用'
      )
    }
  } finally {
    loadingResources.value = false
  }
}

const resetKeyword = () => {
  keyword.value = ''
}

const handleRefreshList = async () => {
  resetKeyword()
  await loadLearningResources({ silent: true })
}

const clearSelection = () => {
  selectedIds.value = []
}

const isDeleteEffective = (result: QueryLearningDeleteResult | undefined) => {
  if (!result) {
    return false
  }
  return Boolean(result.deleted || result.deletedRows > 0)
}

const removeSelected = async () => {
  const targetIds = [...selectedIds.value]
  if (targetIds.length === 0) {
    return
  }

  if (isPrototypeRoute.value) {
    rows.value = rows.value.filter(item => !targetIds.includes(item.id))
    selectedIds.value = []
    return
  }

  const outcomes = await Promise.all(
    targetIds.map(async resourceId => {
      try {
        const result = await deleteQueryLearningResource(resourceId)
        return isDeleteEffective(result)
      } catch (error) {
        return false
      }
    })
  )
  const successCount = outcomes.filter(Boolean).length

  if (successCount === targetIds.length) {
    ElMessage.success(`已移除 ${successCount} 个资源`)
  } else if (successCount > 0) {
    const failedCount = targetIds.length - successCount
    ElMessage.warning(`已移除 ${successCount} 个资源，${failedCount} 个移除失败`)
  } else {
    ElMessage.warning('未能移除资源，请稍后重试')
  }
  await loadLearningResources({ silent: true })
  selectedIds.value = []
}

const removeResource = async (row: ResourceRow) => {
  if (isPrototypeRoute.value) {
    rows.value = rows.value.filter(item => item.id !== row.id)
    selectedIds.value = selectedIds.value.filter(id => id !== row.id)
    return
  }

  try {
    const result = await deleteQueryLearningResource(row.id)
    if (!isDeleteEffective(result)) {
      ElMessage.error('移除资源失败，请稍后重试')
      return
    }
    ElMessage.success('资源已移除')
  } catch (error) {
    ElMessage.error('移除资源失败，请稍后重试')
    return
  }
  await loadLearningResources({ silent: true })
}

const renameAlias = (row: ResourceRow) => {
  const nextName = window.prompt('请输入新的资源名称', row.name)?.trim()
  if (!nextName || nextName === row.name) {
    return
  }
  rows.value = rows.value.map(item => (item.id === row.id ? { ...item, name: nextName } : item))
  if (previewRow.value?.id === row.id) {
    previewRow.value = { ...previewRow.value, name: nextName }
  }
}

const closePreviewDialog = () => {
  previewVisible.value = false
  updatePrototypeRoute({})
}

const isLearningPendingOrRunning = (status?: string) => {
  return Boolean(status && (status.includes('学习中') || status.includes('执行中')))
}

const buildLearningActionTitle = (row: ResourceRow) => {
  const status = row.learningStatus || row.status || ''
  if (isLearningPendingOrRunning(status)) {
    return '查看学习进度'
  }
  if (status.includes('学习成功') || status.includes('学习失败')) {
    return '重新学习'
  }
  return '开始学习'
}

const hasLearningScore = (row: ResourceRow) => Boolean(row.qualityGrade || row.qualityScore != null)

const buildLearningScoreLabel = (row: ResourceRow) => {
  const scoreParts: string[] = []
  if (row.qualityGrade) {
    scoreParts.push(`评分 ${row.qualityGrade}`)
  }
  if (row.qualityScore != null) {
    scoreParts.push(`${row.qualityScore} 分`)
  }
  return scoreParts.join(' · ')
}

const openLearningTaskDetail = (row: ResourceRow) => {
  const taskId = row.id
  selectedLearningTaskId.value = taskId
  learningDrawerVisible.value = true
  updatePrototypeRoute({ dialog: 'learning-task', taskId })
  loadLearningDrawerSummaries(taskId)
}

const handleLearningDrawerVisibleChange = (visible: boolean) => {
  learningDrawerVisible.value = visible
  if (!visible) {
    selectedLearningTaskId.value = null
    updatePrototypeRoute({})
  }
}

const startLearningForRow = (
  row: ResourceRow,
  options: { successMessage: string; errorMessage: string }
) => {
  return triggerQueryLearning(row.id)
    .then(response => {
      const nextTaskId = response.taskId || row.learningTaskId || row.id
      if (response.taskId) {
        learningTaskIdOverrides[row.id] = response.taskId
      }
      learningSummaryRequestVersionByResourceId[row.id] =
        (learningSummaryRequestVersionByResourceId[row.id] || 0) + 1
      delete qualitySummaryByResourceId[row.id]
      delete feedbackSummaryByResourceId[row.id]
      rows.value = rows.value.map(item => {
        if (item.id !== row.id) {
          return item
        }
        return {
          ...item,
          learningTaskId: nextTaskId,
          status: '学习中',
          learningStatus: '学习中',
          failureReason: '',
          qualityScore: undefined,
          qualityGrade: '',
          qualitySummary: null,
          feedbackSummary: null,
          learningSignals: [],
          learningSuggestions: []
        }
      })
      selectedLearningTaskId.value = nextTaskId
      learningDrawerVisible.value = true
      updatePrototypeRoute({ dialog: 'learning-task', taskId: nextTaskId })
      ElMessage.success(options.successMessage)
      void loadLearningResources({ silent: true })
      return response
    })
    .catch(error => {
      ElMessage.error(options.errorMessage)
      throw error
    })
}

const handleLearningAction = (row: ResourceRow) => {
  const status = row.learningStatus || row.status || ''
  if (isLearningPendingOrRunning(status)) {
    openLearningTaskDetail(row)
    return
  }
  const hasLearningHistory = status.includes('学习成功') || status.includes('学习失败')
  void startLearningForRow(row, {
    successMessage: hasLearningHistory ? '已重新发起学习任务' : '已发起学习任务',
    errorMessage: hasLearningHistory ? '重新学习失败，请稍后重试' : '发起学习失败，请稍后重试'
  })
}

const handleLearningRetry = () => {
  const selectedRow = selectedLearningRow.value
  if (!selectedRow) {
    return
  }
  void startLearningForRow(selectedRow, {
    successMessage: '已重新发起学习任务',
    errorMessage: '重新学习失败，请稍后重试'
  })
}

const closeQuickDialog = () => {
  quickDialogVisible.value = false
  updatePrototypeRoute({})
}

const shuffleQuestions = () => {
  systemQuestions.value = [...systemQuestions.value.slice(1), systemQuestions.value[0]]
}

const addQuestionBatch = () => {
  expertQuestions.value = ['xxx销售金额占比']
}

const addExpertQuestion = () => {
  expertQuestions.value = ['xxx销售金额占比']
}

const deleteExpertQuestion = (question: string) => {
  expertQuestions.value = expertQuestions.value.filter(item => item !== question)
}

const toggleUserPanel = () => {
  userPanelVisible.value = !userPanelVisible.value
  updatePrototypeRoute({
    dialog: 'rule',
    mode: 'object',
    panel: userPanelVisible.value ? 'user' : undefined
  })
}

const clearRuleUser = () => {
  ruleForm.user = ''
}

const openAddRuleDialog = () => {
  ruleDialogVisible.value = true
  quickDialogVisible.value = false
  ruleForm.name = 'xxx'
  ruleForm.user = ''
  ruleForm.questions = ['AAA']
  userPanelVisible.value = true
  updatePrototypeRoute({ dialog: 'rule', mode: 'object', panel: 'user' })
}

const closeRuleDialog = () => {
  ruleDialogVisible.value = false
  userPanelVisible.value = false
  updatePrototypeRoute({})
}

const cancelRuleDialog = () => {
  ruleDialogVisible.value = false
  userPanelVisible.value = false
  updatePrototypeRoute({})
}

const appendRuleQuestion = () => {
  ruleForm.questions.push(`问题 ${ruleForm.questions.length + 1}`)
}

const removeRuleQuestion = (index: number) => {
  ruleForm.questions.splice(index, 1)
  if (ruleForm.questions.length === 0) {
    ruleForm.questions.push('AAA')
  }
}

const completeRuleDialog = () => {
  if (!ruleForm.name) {
    ruleForm.name = 'xxx'
  }
  if (!ruleForm.user) {
    ruleForm.user = '李永'
  }
  objectRuleConfigured.value = true
  userPanelVisible.value = false
  updatePrototypeRoute({ dialog: 'rule', mode: 'object', preset: 'rule-complete' })
}

onMounted(() => {
  loadLearningResources({ silent: true })
})
</script>

<style lang="less" scoped>
.query-resource-prototype {
  --resource-table-columns: 44px minmax(260px, 1.35fr) minmax(112px, 0.55fr) minmax(132px, 0.7fr)
    minmax(168px, 0.85fr) minmax(240px, 1.2fr) 118px;
  position: relative;
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  height: 100%;
  min-width: 0;
  flex-direction: column;
  background: #fff;
  color: #344054;
  overflow: hidden;
}

.prototype-page {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
}

.prototype-page__tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  margin-bottom: 12px;
  border: 1px solid #e7edf7;
  border-radius: 12px;
  background: #f8fbff;
}

.prototype-page__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 10px 12px 10px 14px;
  margin-bottom: 12px;
  border: 1px solid #fed7d7;
  border-radius: 12px;
  background: linear-gradient(90deg, #fff5f5 0%, #fffafa 100%);
  color: #b42318;
  box-sizing: border-box;
}

.prototype-page__error-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.prototype-page__error-copy strong {
  font-size: 16px;
  line-height: 22px;
}

.prototype-page__error-copy span {
  overflow: hidden;
  color: #912018;
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 320px;
  max-width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid #dfe5ef;
  border-radius: 12px;
  color: #98a2b3;
  background: #fff;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-box:focus-within {
  border-color: rgba(47, 107, 255, 0.32);
  box-shadow: 0 0 0 3px rgba(47, 107, 255, 0.08);
}

.search-box svg {
  width: 14px;
  height: 14px;
  flex: none;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: #1f2329;
  font-size: 15px;
}

.ghost-button,
.page-size,
.field-select,
.selector-button,
.secondary-button,
.primary-button,
.primary-inline {
  height: 44px;
  border-radius: 12px;
  font-size: 15px;
}

.ghost-button,
.page-size,
.field-select,
.selector-button,
.secondary-button {
  border: 1px solid #dfe5ef;
  background: #fff;
  color: #344054;
}

.ghost-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  background: #fff;
  font-weight: 500;
}

.ghost-button svg {
  width: 14px;
  height: 14px;
}

.prototype-table {
  flex: 1 1 auto;
  min-height: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #edf0f5;
  border-radius: 12px;
  background: #fff;
}

.prototype-table__header-row,
.prototype-table__data-row {
  display: grid;
  width: 100%;
  grid-template-columns: var(--resource-table-columns);
  align-items: center;
  column-gap: 14px;
  padding: 0 16px;
  box-sizing: border-box;
  font-size: 14px;
}

.prototype-table__header-row {
  min-height: 54px;
  border-bottom: 1px solid #edf0f5;
  background: #fbfcfe;
  color: #7b8799;
  font-size: 16px;
  font-weight: 600;
}

.prototype-table__body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

.prototype-table.is-empty .prototype-table__body {
  display: flex;
  flex: 1 1 auto;
  min-height: 166px;
}

.prototype-table__data-row {
  min-height: 66px;
  border-bottom: 1px solid #edf0f5;
  color: #344054;
  font-size: 16px;
  background: #fff;
  transition: background-color 0.2s ease;
}

.prototype-table__data-row:hover {
  background: #fbfcff;
}

.prototype-table__empty {
  display: flex;
  flex: 1 1 auto;
  min-height: 264px;
  align-items: center;
  justify-content: center;
  padding: 30px 16px;
  background: radial-gradient(circle at 50% 0%, rgba(47, 107, 255, 0.07), transparent 34%),
    linear-gradient(180deg, #fff 0%, #fbfdff 100%);
  box-sizing: border-box;
}

.prototype-table__empty.is-search-empty {
  min-height: 238px;
}

.prototype-table__empty.is-error {
  background: radial-gradient(circle at 50% 0%, rgba(245, 101, 101, 0.1), transparent 34%),
    linear-gradient(180deg, #fff 0%, #fffafa 100%);
}

.prototype-table__empty.is-error .prototype-table__empty-icon {
  border-color: #fed7d7;
  background: #fff5f5;
}

.prototype-table__empty.is-error .prototype-table__empty-title {
  color: #b42318;
}

.prototype-table__empty-card {
  display: flex;
  width: min(520px, 100%);
  align-items: center;
  flex-direction: column;
  gap: 10px;
  text-align: center;
}

.prototype-table__empty-icon {
  display: grid;
  place-items: center;
  width: 78px;
  height: 78px;
  border: 1px solid #e3ebff;
  border-radius: 24px;
  background: #f6f9ff;
}

.prototype-table__empty-icon svg {
  width: 54px;
  height: 54px;
}

.prototype-table__empty-title {
  margin-top: 2px;
  color: #1f2329;
  font-size: 18px;
  line-height: 26px;
  font-weight: 700;
}

.prototype-table__empty-copy {
  max-width: 430px;
  margin: 0;
  color: #667085;
  font-size: 16px;
  line-height: 24px;
}

.prototype-table__empty-action {
  margin-top: 6px;
}

.cell {
  min-width: 0;
}

.cell--creator,
.cell--theme,
.cell--time {
  color: #475467;
}

.cell--time {
  white-space: nowrap;
}

.cell--status {
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.cell--select {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell--select input {
  width: 16px;
  height: 16px;
  accent-color: #2f6bff;
}

.prototype-table__header-row .cell--status,
.prototype-table__data-row .cell--status {
  justify-self: stretch;
}

.prototype-table__header-row .cell--operation,
.prototype-table__data-row .cell--operation {
  justify-self: center;
  width: 100%;
}

.prototype-table__header-row .cell--operation {
  text-align: center;
}

.cell--name-row {
  display: flex;
  align-items: center;
}

.checkbox-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.checkbox-wrap--row {
  flex: none;
  width: 16px;
  justify-content: center;
}

.checkbox-wrap input {
  width: 16px;
  height: 16px;
  accent-color: #2f6bff;
}

.dataset-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.dataset-entry__title {
  font-weight: 600;
  color: #344054;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 17px;
  line-height: 25px;
}

.name-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: #2f6bff;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
}

.learning-status-cell {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  overflow: hidden;
}

.learning-status-cell__primary {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.learning-status-cell__score {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #eef4ff;
  color: #175cd3;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.learning-status-cell__failure {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  color: #b42318;
  font-size: 15px;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-detail-link {
  min-height: 32px;
  border: 1px solid #d6e4ff;
  border-radius: 999px;
  background: #f5f8ff;
  padding: 0 12px;
  color: #2f6bff;
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
}

.task-detail-link:hover {
  border-color: #9dbbff;
  background: #eaf2ff;
}

.cell--operation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.icon-action {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8f99ab;
  padding: 0;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.icon-action:hover {
  background: #eef4ff;
  color: #2f6bff;
}

.icon-action--danger:hover {
  background: #fff1f0;
  color: #d92d20;
}

.icon-action__svg {
  width: 18px;
  height: 18px;
  color: currentColor;
}

.prototype-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  margin-top: 0;
  padding: 0 16px;
  border-top: 1px solid #edf0f5;
  background: #fbfcff;
  flex: none;
  gap: 16px;
}

.prototype-footer.has-selection {
  min-height: 52px;
}

.prototype-footer__left,
.prototype-footer__right,
.pagination {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 15px;
  color: #475467;
  flex-wrap: wrap;
}

.footer-link,
.mini-link {
  border: 0;
  background: transparent;
  padding: 0;
  color: #2f6bff;
  font-size: 15px;
}

.mini-link svg {
  width: 14px;
  height: 14px;
}

.pagination__button {
  width: 32px;
  height: 32px;
  border: 1px solid #dfe5ef;
  border-radius: 8px;
  background: #fff;
  color: #98a2b3;
}

.pagination__button.is-active {
  border-color: #2f6bff;
  background: #2f6bff;
  color: #fff;
}

.page-size {
  height: 44px;
  padding: 0 14px;
}

.prototype-dialog :deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.12);
}

.prototype-dialog--quick :deep(.el-dialog) {
  min-height: 430px;
}

.prototype-dialog--system :deep(.el-dialog) {
  min-height: 445px;
}

.prototype-dialog--expert :deep(.el-dialog) {
  min-height: 429px;
}

.prototype-dialog--object :deep(.el-dialog) {
  min-height: 518px;
}

.prototype-dialog--rule :deep(.el-dialog) {
  min-height: 425px;
}

.prototype-dialog--rule-complete :deep(.el-dialog) {
  min-height: 425px;
}

.prototype-dialog :deep(.el-dialog__header),
.prototype-dialog :deep(.el-dialog__body),
.prototype-dialog :deep(.el-dialog__footer) {
  padding: 0;
  margin: 0;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 0 22px;
  border-bottom: 1px solid #edf0f5;
  font-size: 16px;
  font-weight: 600;
}

.dialog-header__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.dialog-header__info {
  color: #98a2b3;
  font-size: 15px;
}

.dialog-close {
  border: 0;
  background: transparent;
  color: #98a2b3;
  font-size: 16px;
}

.dialog-body {
  padding: 18px 22px 22px;
}

.dialog-field {
  margin-bottom: 18px;
}

.dialog-label {
  margin-bottom: 10px;
  color: #344054;
  font-size: 15px;
  font-weight: 600;
}

.dialog-tip {
  color: #98a2b3;
  font-size: 15px;
}

.mode-group {
  display: flex;
  align-items: center;
  gap: 24px;
}

.mode-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}

.mode-option input,
.user-option input {
  accent-color: #2f6bff;
}

.dialog-card {
  border: 1px solid #dfe8fa;
  border-radius: 12px;
  background: #f2f7ff;
}

.dialog-card--question {
  padding-bottom: 14px;
  background: #eef5ff;
}

.dialog-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
  font-size: 15px;
  font-weight: 600;
}

.dialog-card__header--flat {
  padding: 0 0 10px;
}

.dialog-card__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.dialog-card__actions .mini-link,
.rule-footer .mini-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dialog-card__actions .mini-link svg,
.rule-footer .mini-link svg {
  width: 14px;
  height: 14px;
}

.question-stack {
  padding: 10px 14px 16px;
}

.question-line {
  min-height: 44px;
  line-height: 24px;
  padding: 7px 12px;
  border: 1px solid #d9e2f0;
  border-radius: 8px;
  background: #fff;
  color: #475467;
  font-size: 15px;
}

.question-line + .question-line {
  margin-top: 8px;
}

.expert-list {
  padding: 10px 14px 16px;
}

.expert-list--tight {
  padding: 0;
}

.expert-list--card {
  padding: 10px 14px 0;
}

.prototype-dialog--expert .dialog-card {
  min-height: 216px;
}

.prototype-dialog--object .dialog-card {
  min-height: 306px;
}

.prototype-dialog--system .dialog-card {
  min-height: 233px;
}

.expert-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid #d9e2f0;
  border-radius: 8px;
  background: #fff;
  box-sizing: border-box;
}

.expert-item + .expert-item {
  margin-top: 8px;
}

.expert-item__drag {
  color: #98a2b3;
  letter-spacing: -1px;
}

.expert-item__text,
.expert-item__input {
  flex: 1;
  min-width: 0;
  color: #344054;
}

.expert-item__input {
  border: 0;
  outline: none;
  background: transparent;
}

.expert-item button {
  border: 0;
  background: transparent;
  color: #98a2b3;
}

.empty-panel {
  display: flex;
  min-height: 152px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px 16px;
  color: #98a2b3;
}

.empty-panel--large {
  min-height: 196px;
}

.empty-panel__icon {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 999px;
  background: #f6f8fb;
  font-size: 28px;
  color: #c1c7d0;
}

.empty-panel__icon--trend {
  position: relative;
}

.empty-panel__icon--trend::before {
  content: '';
  width: 24px;
  height: 24px;
  border-left: 4px solid #c8d2e4;
  border-bottom: 4px solid #c8d2e4;
  transform: rotate(45deg) translate(2px, -2px);
}

.empty-panel__text {
  font-size: 15px;
  color: #97a1b1;
}

.primary-inline {
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: #2f6bff;
  color: #fff;
}

.rule-box {
  margin: 12px 16px 16px;
  border: 1px solid #dbe6ff;
  border-radius: 10px;
  background: #fff;
  padding: 14px 16px;
}

.rule-box__title {
  color: #344054;
  font-size: 15px;
  font-weight: 600;
}

.rule-box__user {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 8px;
  border-radius: 999px;
  background: #eaf2ff;
  color: #2f6bff;
  font-size: 15px;
}

.rule-box__label {
  margin-top: 14px;
  margin-bottom: 10px;
  color: #667085;
  font-size: 15px;
}

.rule-box .expert-item {
  border-color: #cfe0ff;
}

.rule-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 16px;
}

.prototype-dialog--object .rule-footer {
  padding-top: 10px;
}

.rule-footer__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field-input,
.field-select,
.selector-button {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  font-size: 15px;
}

.field-select,
.selector-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-input {
  border: 1px solid #dfe5ef;
  border-radius: 8px;
  outline: none;
}

.field-input::placeholder {
  color: #b0b8c5;
}

.field-select {
  border: 1px solid #cfe0ff;
  border-radius: 8px;
  background: #fff;
}

.field-select__selected {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.field-select__icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  color: #98a2b3;
}

.field-select__icon svg {
  width: 14px;
  height: 14px;
}

.field-select__tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  background: #eaf2ff;
  color: #2f6bff;
  font-size: 15px;
  line-height: 24px;
}

.field-select__tag button {
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
}

.user-panel {
  margin-top: 8px;
  border: 1px solid #edf0f5;
  border-radius: 10px;
  background: #eef5ff;
  padding: 8px;
}

.user-panel__inner {
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(31, 35, 41, 0.06);
  padding: 8px;
}

.search-box--panel {
  width: 100%;
  height: 44px;
  margin-bottom: 8px;
}

.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 8px;
  border-radius: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 22px 22px;
}

.prototype-dialog--quick .dialog-footer {
  margin-top: 12px;
}

.secondary-button,
.primary-button {
  min-width: 76px;
  height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  font-size: 15px;
}

.primary-button {
  border: 0;
  background: #2f6bff;
  color: #fff;
}

.dialog-card__header > span,
.dialog-label,
.rule-box__title {
  letter-spacing: 0;
}

.preview-panel {
  padding: 20px 22px 22px;
}

.prototype-dialog--rule .dialog-body {
  padding-top: 20px;
}

.prototype-dialog--rule .dialog-field {
  margin-bottom: 16px;
}

.prototype-dialog--rule .dialog-card--question {
  padding-bottom: 12px;
}

.prototype-dialog--rule .dialog-card__header--flat {
  padding: 14px 16px 8px;
}

.prototype-dialog--rule .expert-list--card {
  padding: 0 16px 0;
}

.prototype-dialog--rule .expert-item {
  min-height: 36px;
  border-color: #bdd6ff;
}

.prototype-dialog--rule .dialog-footer {
  padding-top: 8px;
}

.preview-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  color: #475467;
  font-size: 15px;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
}

.preview-table th,
.preview-table td {
  border: 1px solid #edf0f5;
  padding: 10px 12px;
  text-align: left;
  font-size: 15px;
}

.preview-table th {
  background: #f8fafc;
  color: #667085;
  font-weight: 500;
}

@media (max-width: 1600px) {
  .prototype-table__header-row,
  .prototype-table__data-row {
    column-gap: 12px;
    padding: 0 14px;
  }
}

@media (max-width: 1440px) {
  .prototype-page__tools {
    gap: 10px;
  }

  .search-box {
    width: 280px;
  }

  .prototype-table__header-row,
  .prototype-table__data-row {
    min-width: 1080px;
    column-gap: 12px;
    padding: 0 12px;
  }

  .prototype-footer {
    padding: 10px 12px;
  }
}

@media (max-width: 1280px) {
  .prototype-page__tools,
  .prototype-footer {
    gap: 10px;
  }

  .search-box {
    width: 260px;
  }

  .prototype-footer__right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
