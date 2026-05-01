<template>
  <div class="starbi-query-page" v-loading="pageLoading">
    <div class="page-aurora"></div>

    <div
      class="query-shell"
      :class="{
        'conversation-mode': isFormalConversation,
        'sidebar-compact': !state.formalSidebarExpanded
      }"
    >
      <aside
        class="local-sidebar"
        :class="{
          formal: true,
          compact: !state.formalSidebarExpanded
        }"
      >
        <div class="assistant-card" :class="{ compact: !state.formalSidebarExpanded }">
          <div class="assistant-card-main">
            <div class="assistant-icon">
              <div class="assistant-icon-inner starbi-svg-icon" v-html="getIconSvg('query')"></div>
            </div>
            <div v-if="showSidebarPanel">
              <div class="assistant-title">智能问数</div>
              <div class="assistant-subtitle">数据分析助手</div>
            </div>
          </div>
          <button class="sidebar-toggle-btn" type="button" @click="toggleFormalSidebar">
            <span
              class="starbi-svg-icon"
              v-html="getIconSvg(state.formalSidebarExpanded ? 'collapse' : 'expand')"
            ></span>
          </button>
        </div>

        <div class="sidebar-group">
          <button
            v-for="item in navItems"
            :key="item.key"
            class="local-nav-item"
            :class="{ active: state.pageView === item.key }"
            :title="item.label"
            @click="handleNavClick(item.key)"
          >
            <span
              class="local-nav-icon starbi-svg-icon"
              :class="item.icon"
              v-html="getIconSvg(item.icon)"
            ></span>
            <span v-if="showSidebarPanel" class="local-nav-label">
              {{ item.label }}
            </span>
          </button>
        </div>

        <div v-if="showSidebarPanel" class="recent-section">
          <div class="recent-title-row">
            <div class="recent-title">最近{{ currentAssistantMode.label }}</div>
          </div>
          <div v-if="recentHistory.length" class="recent-list">
            <button
              v-for="item in recentHistory"
              :key="item.id"
              class="recent-card"
              :class="{ active: state.activeSessionId === item.id && state.pageView === 'home' }"
              @click="handleHistoryClick(item)"
            >
              <div class="recent-card-title">{{ item.title }}</div>
              <div class="recent-card-meta">{{ item.selectionTitle }}</div>
              <div class="recent-card-time">{{ formatTime(item.updatedAt) }}</div>
            </button>
          </div>
          <div v-else class="recent-empty">还没有最近对话</div>
        </div>
      </aside>

      <main class="main-panel" :class="{ 'conversation-active': isFormalConversation }">
        <template v-if="state.pageView === 'home'">
          <template v-if="!state.started">
            <div class="home-stage">
              <div class="home-hero">
                <div class="home-hero-avatar" :class="`accent-${currentAssistantMode.accent}`">
                  <span
                    class="starbi-svg-icon"
                    v-html="getIconSvg(currentAssistantMode.icon)"
                  ></span>
                </div>
                <div class="home-hero-copy">
                  <div class="home-hero-title">{{ homeGreeting }}</div>
                  <div class="home-hero-subtitle">{{ currentAssistantMode.subtitle }}</div>
                </div>
              </div>

              <div class="assistant-mode-strip">
                <button
                  v-for="item in assistantModes"
                  :key="item.key"
                  class="assistant-mode-tab"
                  :class="[item.accent, { active: state.assistantMode === item.key }]"
                  type="button"
                  @click="handleAssistantModeChange(item.key)"
                >
                  <span
                    class="assistant-mode-icon starbi-svg-icon"
                    v-html="getIconSvg(item.icon)"
                  ></span>
                  <span>{{ item.label }}</span>
                </button>
              </div>

              <div class="entry-shell" :class="`mode-${state.assistantMode}`">
                <div class="entry-card" :class="[`mode-${state.assistantMode}`]">
                  <div class="entry-card-top">
                    <div class="entry-card-status">
                      <div class="entry-card-status-main">
                        <span class="entry-status-pill" :class="currentAssistantMode.accent">
                          <span
                            class="entry-status-icon starbi-svg-icon"
                            v-html="getIconSvg(currentAssistantMode.icon)"
                          ></span>
                          <span>{{ currentAssistantMode.label }}</span>
                        </span>
                        <span class="entry-status-copy">{{ currentAssistantMode.subtitle }}</span>
                      </div>
                    </div>
                    <button class="entry-select-link" type="button" @click="openSelector()">
                      选择数据
                      <span
                        class="entry-select-link-icon starbi-svg-icon"
                        v-html="getIconSvg(state.queryMode === 'file' ? 'file' : 'dataset')"
                      ></span>
                    </button>
                  </div>

                  <div
                    v-if="selectionChips.length"
                    class="entry-selection-track"
                    @click="openSelector()"
                  >
                    <div class="entry-selection-summary">
                      <span class="entry-selection-label">已选数据</span>
                      <span class="entry-selection-title">{{ currentSelectionTitle }}</span>
                      <span v-if="currentSelectionMeta" class="entry-selection-meta">
                        {{ currentSelectionMeta }}
                      </span>
                    </div>
                    <div class="entry-selection-list">
                      <button
                        v-for="chip in visibleSelectionChips"
                        :key="chip.id"
                        class="entry-selection-chip"
                        type="button"
                        @click.stop="chip.type === 'file' ? openFilePreview() : undefined"
                      >
                        <span>{{ chip.label }}</span>
                        <span class="chip-close" @click.stop="removeSelectionChip(chip)">×</span>
                      </button>
                      <button
                        v-if="overflowSelectionChipCount > 0"
                        class="entry-selection-chip more"
                        type="button"
                        @click.stop="openSelector()"
                      >
                        +{{ overflowSelectionChipCount }} 项
                      </button>
                    </div>
                  </div>

                  <div v-if="needsDatasourceSelection" class="entry-datasource-row">
                    <span class="entry-datasource-label">{{ t('starbi.current_datasource') }}</span>
                    <el-select
                      v-model="state.datasetDatasourceId"
                      clearable
                      size="small"
                      :placeholder="t('starbi.select_datasource_placeholder')"
                      @change="handleDatasetDatasourceChange"
                    >
                      <el-option
                        v-for="datasource in datasetDatasourceOptions"
                        :key="String(datasource.id)"
                        :label="datasource.name"
                        :value="String(datasource.id)"
                      />
                    </el-select>
                  </div>

                  <div class="entry-input-shell" :class="`mode-${state.assistantMode}`">
                    <el-input
                      ref="questionInputRef"
                      v-model="state.pendingQuestion"
                      type="textarea"
                      resize="none"
                      :autosize="{ minRows: state.assistantMode === 'report' ? 7 : 6, maxRows: 9 }"
                      :placeholder="questionPlaceholder"
                      @keydown.enter.exact.prevent="submitQuestion"
                    />
                  </div>

                  <div class="entry-card-bottom">
                    <div class="entry-bottom-left">
                      <el-dropdown trigger="click" @command="handleModelChange">
                        <button
                          class="model-switch-btn"
                          type="button"
                          :disabled="noAvailableModels"
                        >
                          <span
                            class="model-switch-icon starbi-svg-icon"
                            v-html="getIconSvg('magic')"
                          ></span>
                          <span>{{ currentModelOption.name }}</span>
                          <span class="model-switch-arrow">▾</span>
                        </button>
                        <template #dropdown>
                          <el-dropdown-menu class="model-switch-menu">
                            <el-dropdown-item
                              v-for="item in modelOptions"
                              :key="item.id"
                              :command="item.id"
                              :class="{ active: item.id === state.modelId }"
                            >
                              <span>{{ item.name }}</span>
                              <span v-if="item.badge" class="model-option-badge">{{
                                item.badge
                              }}</span>
                            </el-dropdown-item>
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                      <span class="entry-mode-badge">
                        {{ state.queryMode === 'file' ? '文件问数' : '数据集问数' }}
                      </span>
                      <button
                        v-if="state.queryMode === 'file' && currentFileDatasource"
                        class="ghost-action-btn"
                        type="button"
                        @click="openFilePreview()"
                      >
                        预览文件
                      </button>
                    </div>

                    <div class="entry-bottom-right">
                      <button
                        class="composer-send-btn"
                        :class="currentAssistantMode.accent"
                        type="button"
                        :disabled="!canStart || sqlbotChatLoading"
                        @click="submitQuestion"
                      >
                        <span class="send-arrow starbi-svg-icon" v-html="getIconSvg('send')"></span>
                      </button>
                    </div>
                  </div>

                  <div v-if="modelUnavailableHint" class="entry-model-empty">
                    {{ modelUnavailableHint }}
                  </div>
                </div>
              </div>

              <div v-if="state.assistantMode === 'report'" class="home-recommend-section report">
                <div class="home-recommend-head">
                  <span>快捷报告模板</span>
                </div>

                <div class="report-template-grid">
                  <button
                    v-for="item in reportTemplateCards"
                    :key="item.title"
                    class="report-template-card"
                    type="button"
                    @click="state.pendingQuestion = item.prompt"
                  >
                    <div class="report-template-card-head">
                      <span
                        class="report-template-icon starbi-svg-icon"
                        v-html="getIconSvg('report')"
                      ></span>
                      <span class="report-template-title">{{ item.title }}</span>
                    </div>
                    <div class="report-template-desc">{{ item.description }}</div>
                  </button>
                </div>
              </div>
              <div
                v-else-if="state.assistantMode === 'build'"
                class="home-recommend-section report"
              >
                <div class="home-recommend-head">
                  <span>搭建蓝图</span>
                </div>

                <div class="mode-template-grid">
                  <button
                    v-for="item in buildStarterCards"
                    :key="item.title"
                    class="mode-template-card build"
                    type="button"
                    @click="state.pendingQuestion = item.prompt"
                  >
                    <div class="mode-template-kicker">搭建占位</div>
                    <div class="report-template-card-head">
                      <span
                        class="report-template-icon starbi-svg-icon"
                        v-html="getIconSvg('build')"
                      ></span>
                      <span class="report-template-title">{{ item.title }}</span>
                    </div>
                    <div class="report-template-desc">{{ item.description }}</div>
                  </button>
                </div>
              </div>

              <div
                v-else-if="state.assistantMode === 'search'"
                class="home-recommend-section report"
              >
                <div class="home-recommend-head">
                  <span>搜索入口</span>
                </div>

                <div class="mode-template-grid">
                  <button
                    v-for="item in searchStarterCards"
                    :key="item.title"
                    class="mode-template-card search"
                    type="button"
                    @click="state.pendingQuestion = item.prompt"
                  >
                    <div class="mode-template-kicker">搜索占位</div>
                    <div class="report-template-card-head">
                      <span
                        class="report-template-icon starbi-svg-icon"
                        v-html="getIconSvg('search')"
                      ></span>
                      <span class="report-template-title">{{ item.title }}</span>
                    </div>
                    <div class="report-template-desc">{{ item.description }}</div>
                  </button>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="conversation-stage">
              <div class="conversation-shell" :style="conversationShellStyle">
                <div class="conversation-stream-surface">
                  <div class="conversation-message-wrap calicat">
                    <div ref="conversationListRef" class="conversation-message-scroll">
                      <div v-if="conversationMessages.length" class="conversation-message-list">
                        <div
                          v-for="message in conversationMessages"
                          :key="message.key"
                          class="conversation-message-row"
                          :class="message.role"
                        >
                          <template v-if="message.role === 'user'">
                            <div class="conversation-user-stack">
                              <div class="conversation-user-bubble">
                                {{ message.record.question }}
                              </div>
                            </div>
                          </template>

                          <template v-else>
                            <div class="conversation-ai-stack">
                              <StarbiResultCard
                                :record="message.record"
                                :reasoning-expanded="isReasoningExpanded(message.record)"
                                @toggle-reasoning="toggleReasoning(message.record.localId)"
                                @interpret="requestRecordAnalysis(message.record)"
                                @followup="primeFollowUpQuestion(message.record, 'followup')"
                                @change-chart-type="
                                  handleRecordChartTypeChange(message.record, $event)
                                "
                              />
                            </div>
                          </template>
                        </div>
                      </div>

                      <div v-else class="conversation-empty-state">
                        <div class="conversation-empty-badge">
                          <span
                            class="starbi-svg-icon"
                            v-html="getIconSvg(currentAssistantMode.icon)"
                          ></span>
                          <span>{{ currentAssistantMode.label }}</span>
                        </div>
                        <div class="conversation-empty-title">已进入会话，开始你的第一个问题吧</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div ref="conversationDockRef" class="conversation-bottom-dock">
                  <div
                    v-if="conversationRecommendedQuestions.length"
                    class="conversation-recommend-strip"
                  >
                    <div class="conversation-recommend-kicker">
                      针对已选数据，为您推荐如下问题：
                    </div>
                    <div class="conversation-recommend-list">
                      <button
                        v-for="item in conversationRecommendedQuestions"
                        :key="item"
                        class="conversation-recommend-chip"
                        type="button"
                        @click="handleRecommendedQuestion(item)"
                      >
                        {{ item }}
                      </button>
                    </div>
                  </div>

                  <div class="conversation-composer-card">
                    <div class="conversation-composer-top">
                      <div class="conversation-composer-scope">
                        <button
                          class="conversation-select-btn"
                          type="button"
                          @click="openSelector()"
                        >
                          选择数据
                        </button>
                        <div
                          v-if="selectionChips.length"
                          class="conversation-selection-inline compact"
                        >
                          <button
                            v-for="chip in visibleSelectionChips"
                            :key="chip.id"
                            class="conversation-inline-chip"
                            type="button"
                            @click="chip.type === 'file' ? openFilePreview() : undefined"
                          >
                            <span>{{ chip.label }}</span>
                            <span class="chip-close" @click.stop="removeSelectionChip(chip)">
                              ×
                            </span>
                          </button>
                          <button
                            v-if="overflowSelectionChipCount > 0"
                            class="conversation-inline-chip more"
                            type="button"
                            @click="openSelector()"
                          >
                            +{{ overflowSelectionChipCount }}
                          </button>
                        </div>
                        <div v-else class="conversation-selection-empty compact">
                          请选择数据集或文件后继续问数
                        </div>
                        <button
                          v-if="state.queryMode === 'file' && currentFileDatasource"
                          class="conversation-select-btn subtle"
                          type="button"
                          @click="openFilePreview()"
                        >
                          预览文件
                        </button>
                      </div>

                      <div class="conversation-composer-head-actions">
                        <button
                          class="ghost-action-btn subtle compact"
                          type="button"
                          @click="state.historyVisible = true"
                        >
                          历史
                        </button>
                        <button
                          class="ghost-action-btn subtle compact"
                          type="button"
                          @click="handleCreateNewConversation"
                        >
                          新建对话
                        </button>
                      </div>
                    </div>

                    <div
                      v-if="needsDatasourceSelection"
                      class="conversation-datasource-row compact"
                    >
                      <span class="conversation-datasource-label">
                        {{ t('starbi.current_datasource') }}
                      </span>
                      <el-select
                        v-model="state.datasetDatasourceId"
                        clearable
                        size="small"
                        :placeholder="t('starbi.select_datasource_placeholder')"
                        @change="handleDatasetDatasourceChange"
                      >
                        <el-option
                          v-for="datasource in datasetDatasourceOptions"
                          :key="String(datasource.id)"
                          :label="datasource.name"
                          :value="String(datasource.id)"
                        />
                      </el-select>
                    </div>

                    <div class="conversation-composer-input-shell">
                      <el-input
                        ref="questionInputRef"
                        v-model="state.pendingQuestion"
                        type="textarea"
                        resize="none"
                        :autosize="{ minRows: 3, maxRows: 6 }"
                        :placeholder="questionPlaceholder"
                        @keydown.enter.exact.prevent="submitQuestion"
                      />
                    </div>

                    <div class="conversation-composer-footer">
                      <div class="conversation-composer-footer-left">
                        <el-dropdown trigger="click" @command="handleModelChange">
                          <button
                            class="model-switch-btn conversation-model-switch"
                            type="button"
                            :disabled="noAvailableModels"
                          >
                            <span
                              class="model-switch-icon starbi-svg-icon"
                              v-html="getIconSvg('magic')"
                            ></span>
                            <span>{{ currentModelOption.name }}</span>
                            <span class="model-switch-arrow">▾</span>
                          </button>
                          <template #dropdown>
                            <el-dropdown-menu class="model-switch-menu">
                              <el-dropdown-item
                                v-for="item in modelOptions"
                                :key="item.id"
                                :command="item.id"
                                :class="{ active: item.id === state.modelId }"
                              >
                                <span>{{ item.name }}</span>
                                <span v-if="item.badge" class="model-option-badge">{{
                                  item.badge
                                }}</span>
                              </el-dropdown-item>
                            </el-dropdown-menu>
                          </template>
                        </el-dropdown>

                        <span class="entry-mode-badge">
                          {{ state.queryMode === 'file' ? '文件问数' : '数据集问数' }}
                        </span>
                      </div>

                      <div class="conversation-composer-footer-right">
                        <button
                          class="composer-send-btn"
                          :class="currentAssistantMode.accent"
                          type="button"
                          :disabled="!canStart || sqlbotChatLoading"
                          @click="submitQuestion"
                        >
                          <span
                            class="send-arrow starbi-svg-icon"
                            v-html="getIconSvg('send')"
                          ></span>
                        </button>
                      </div>
                    </div>

                    <div v-if="modelUnavailableHint" class="conversation-model-empty">
                      {{ modelUnavailableHint }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>

        <template v-else-if="state.pageView === 'history'">
          <div class="content-page">
            <div class="content-page-title">{{ currentAssistantMode.label }}历史</div>
            <div class="content-page-desc">
              当前 sheet 下的会话会单独沉淀在这里，你可以按相同的数据范围继续操作。
            </div>

            <div v-if="queryHistory.length" class="history-grid">
              <button
                v-for="item in queryHistory"
                :key="item.id"
                class="history-grid-card"
                @click="handleHistoryClick(item)"
              >
                <div class="history-grid-head">
                  <div class="history-grid-title">{{ item.title }}</div>
                  <div class="history-grid-time">{{ formatTime(item.updatedAt) }}</div>
                </div>
                <div class="history-grid-selection">{{ item.selectionTitle }}</div>
                <div class="history-grid-desc">{{ item.lastQuestion || item.selectionMeta }}</div>
              </button>
            </div>
            <empty-background
              v-else
              img-type="none"
              :description="`当前还没有${currentAssistantMode.label}历史，先从首页开始一个新会话吧。`"
            />
          </div>
        </template>

        <template v-else>
          <div class="content-page placeholder-page">
            <div class="content-page-title">
              {{
                placeholderPageCopy[state.pageView as 'favorites' | 'templates' | 'records'].title
              }}
            </div>
            <div class="content-page-desc">
              {{
                placeholderPageCopy[state.pageView as 'favorites' | 'templates' | 'records']
                  .description
              }}
            </div>
          </div>
        </template>
      </main>
    </div>

    <el-drawer
      v-model="state.selectorVisible"
      direction="rtl"
      size="520px"
      :with-header="false"
      modal-class="starbi-selector-mask"
      class="starbi-selector-drawer"
    >
      <div class="drawer-shell">
        <div class="drawer-head">
          <div class="drawer-title-block">
            <div class="drawer-title">选择数据</div>
            <div class="drawer-subtitle">数据集问数 / 文件问数</div>
          </div>
          <button class="dialog-close" @click="state.selectorVisible = false">×</button>
        </div>

        <div class="drawer-tabs">
          <button
            class="drawer-tab"
            :class="{ active: draft.mode === 'dataset' }"
            @click="draft.mode = 'dataset'"
          >
            数据集
          </button>
          <button
            class="drawer-tab"
            :class="{ active: draft.mode === 'file' }"
            @click="draft.mode = 'file'"
          >
            数据文件
          </button>
        </div>

        <div class="drawer-toolbar">
          <el-input
            v-if="draft.mode === 'dataset'"
            v-model="draft.datasetKeyword"
            clearable
            placeholder="搜索数据集名称"
          />
          <el-input v-else v-model="draft.fileKeyword" clearable placeholder="搜索文件名称" />
          <el-button v-if="draft.mode === 'file'" type="primary" plain @click="goToDatasource">
            上传文件
          </el-button>
        </div>

        <div v-if="draft.mode === 'dataset'" class="drawer-card-list">
          <button
            v-for="(item, index) in filteredDraftDatasetItems"
            :key="item.id"
            class="dataset-card"
            :class="{ active: draft.datasetIds.includes(item.id) }"
            @click="toggleDraftDataset(item.id)"
          >
            <div class="dataset-card-main">
              <div class="dataset-card-head">
                <div class="dataset-card-icon" :class="getDatasetDecor(item, index).tone">
                  <span class="starbi-svg-icon" v-html="getIconSvg('dataset')"></span>
                </div>
                <div class="dataset-card-title-wrap">
                  <div class="dataset-card-title-line">
                    <span
                      v-for="badge in getDatasetDecor(item, index).badges"
                      :key="badge"
                      class="dataset-card-badge"
                      :class="{ success: badge === '常用' }"
                    >
                      {{ badge }}
                    </span>
                    <span class="dataset-card-title">{{ item.name }}</span>
                  </div>
                  <div class="dataset-card-path">{{ item.pathLabel }}</div>
                </div>
              </div>
              <div class="dataset-card-chip-list">
                <span
                  v-for="chip in getDatasetDecor(item, index).chips"
                  :key="chip"
                  class="dataset-card-chip"
                >
                  {{ chip }}
                </span>
              </div>
              <div class="dataset-card-stats">
                <span class="dataset-card-stat">{{
                  getDatasetDecor(item, index).fieldCountText
                }}</span>
                <span class="dataset-card-stat">{{
                  getDatasetDecor(item, index).rowCountText
                }}</span>
                <span class="dataset-card-stat">{{
                  getDatasetDecor(item, index).updatedText
                }}</span>
              </div>
            </div>
            <div class="dataset-card-check" v-if="draft.datasetIds.includes(item.id)">✓</div>
          </button>

          <empty-background
            v-if="!filteredDraftDatasetItems.length"
            img-type="none"
            description="当前没有可选的数据集"
          />
        </div>

        <div v-else class="drawer-card-list">
          <template v-if="filteredDraftFileItems.length">
            <button
              v-for="item in filteredDraftFileItems"
              :key="item.id"
              class="dataset-card"
              :class="{ active: draft.fileDatasourceId === item.id }"
              @click="selectDraftFile(item.id)"
            >
              <div class="dataset-card-main">
                <div class="dataset-card-head">
                  <div class="dataset-card-icon file">
                    <span class="starbi-svg-icon" v-html="getIconSvg('file')"></span>
                  </div>
                  <div class="dataset-card-title-wrap">
                    <div class="dataset-card-title-line">
                      <span class="dataset-card-title">{{ item.name }}</span>
                    </div>
                    <div class="dataset-card-path">{{ item.pathLabel }}</div>
                  </div>
                </div>
                <div class="dataset-card-chip-list">
                  <span class="dataset-card-chip">文件问数</span>
                  <span class="dataset-card-chip">预览数据</span>
                  <span class="dataset-card-chip">上传即用</span>
                </div>
                <div class="dataset-card-stats">
                  <span class="dataset-card-stat">已接入 StarBI 文件问数</span>
                </div>
              </div>
              <div class="dataset-card-check" v-if="draft.fileDatasourceId === item.id">✓</div>
            </button>
          </template>

          <div v-else class="file-empty-state">
            <div class="file-empty-icon">
              <span
                class="file-empty-icon-inner starbi-svg-icon"
                v-html="getIconSvg('file')"
              ></span>
            </div>
            <div class="file-empty-tag">试用</div>
            <div class="file-empty-text">上传本地数据文件，不依赖任何数据库即可问数。</div>
            <el-button type="primary" @click="goToDatasource">上传文件</el-button>
          </div>
        </div>

        <div class="drawer-footer">
          <el-button @click="state.selectorVisible = false">取消</el-button>
          <el-button
            v-if="draft.mode === 'file' && draft.fileDatasourceId"
            @click="previewDraftFile"
          >
            预览文件
          </el-button>
          <el-button type="primary" :disabled="!draftHasSelection" @click="applySelection">
            确定
          </el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="state.previewVisible"
      direction="rtl"
      size="560px"
      :with-header="false"
      modal-class="starbi-preview-mask"
      class="starbi-preview-drawer"
    >
      <div class="drawer-shell preview-shell">
        <div class="drawer-head preview-head">
          <div class="preview-breadcrumb-wrap">
            <div class="preview-breadcrumb">数据文件 / {{ previewFileName }}</div>
            <div class="preview-status">
              {{ state.started && state.queryMode === 'file' ? '提问中' : '可问数' }}
            </div>
          </div>
          <button class="dialog-close" @click="state.previewVisible = false">×</button>
        </div>

        <div class="preview-steps">
          <div class="preview-step done">
            <span class="preview-step-marker">✓</span>
            <span>文件上传</span>
          </div>
          <div class="preview-step-line"></div>
          <div class="preview-step active">
            <span class="preview-step-marker">2</span>
            <span>预览数据</span>
          </div>
        </div>

        <div class="preview-info-card">
          <div class="preview-info-icon">
            <span class="starbi-svg-icon" v-html="getIconSvg('table')"></span>
          </div>
          <div class="preview-info-content">
            <div class="preview-info-name">{{ previewFileName }}</div>
            <div class="preview-info-time">上传时间 {{ previewFileTime }}</div>
          </div>
        </div>

        <div class="preview-card">
          <div class="preview-tabs">
            <button
              class="preview-tab"
              :class="{ active: state.previewTab === 'data' }"
              @click="state.previewTab = 'data'"
            >
              数据预览
            </button>
            <button
              class="preview-tab"
              :class="{ active: state.previewTab === 'fields' }"
              @click="state.previewTab = 'fields'"
            >
              字段详情
            </button>
          </div>

          <div class="preview-summary-bar">
            <div class="preview-summary-item">
              <span class="preview-summary-dot total"></span>
              <span>总字段数 {{ previewFieldStats.total }}</span>
            </div>
            <div class="preview-summary-item">
              <span class="preview-summary-dot text"></span>
              <span>文本 {{ previewFieldStats.text }}</span>
            </div>
            <div class="preview-summary-item">
              <span class="preview-summary-dot date"></span>
              <span>日期 {{ previewFieldStats.date }}</span>
            </div>
            <div class="preview-summary-item">
              <span class="preview-summary-dot number"></span>
              <span>数值 {{ previewFieldStats.number }}</span>
            </div>
          </div>

          <div v-loading="filePreviewLoading" class="preview-body">
            <template v-if="state.previewTab === 'data'">
              <el-table
                v-if="displayedFilePreviewColumns.length && displayedFilePreviewRows.length"
                :data="displayedFilePreviewRows"
                stripe
                height="calc(100vh - 340px)"
                class="preview-table"
              >
                <el-table-column
                  v-for="field in displayedFilePreviewColumns"
                  :key="field.originName"
                  :prop="field.originName"
                  :label="field.name || field.originName"
                  min-width="120"
                  show-overflow-tooltip
                />
              </el-table>
              <empty-background v-else img-type="none" description="当前文件暂无可预览的数据内容" />
            </template>

            <template v-else>
              <div v-if="filePreviewFields.length" class="preview-field-list">
                <div class="preview-field-head">
                  <span>字段名称</span>
                  <span>字段类型</span>
                </div>
                <div
                  v-for="field in filePreviewFields"
                  :key="field.originName"
                  class="preview-field-row"
                >
                  <span>{{ field.name || field.originName }}</span>
                  <span class="preview-field-type">
                    <span
                      class="preview-field-type-icon starbi-svg-icon"
                      v-html="getIconSvg('field')"
                    ></span>
                    {{ getFieldTypeBadgeLabel(field.deType) }}
                  </span>
                </div>
              </div>
              <empty-background v-else img-type="none" description="当前文件暂无字段详情可展示" />
            </template>
          </div>
        </div>

        <div class="drawer-footer preview-footer">
          <el-button @click="state.previewVisible = false">关闭</el-button>
          <el-button type="primary" @click="savePreviewAndStart">
            {{ previewPrimaryActionText }}
          </el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="state.historyVisible"
      direction="rtl"
      size="420px"
      :with-header="false"
      class="starbi-history-drawer"
    >
      <div class="drawer-shell history-shell">
        <div class="drawer-head">
          <div class="drawer-title-block">
            <div class="drawer-title">历史对话</div>
            <div class="drawer-subtitle">继续之前的数据集问数或文件问数会话</div>
          </div>
          <button class="dialog-close" type="button" @click="state.historyVisible = false">
            ×
          </button>
        </div>

        <div v-if="queryHistory.length" class="history-drawer-list">
          <button
            v-for="item in queryHistory"
            :key="item.id"
            class="history-drawer-card"
            :class="{ active: item.id === state.activeSessionId }"
            @click="handleHistoryClick(item)"
          >
            <div class="history-drawer-card-head">
              <div class="history-drawer-card-title">{{ item.title }}</div>
              <div class="history-drawer-card-time">{{ formatTime(item.updatedAt) }}</div>
            </div>
            <div class="history-drawer-card-selection">{{ item.selectionTitle }}</div>
            <div class="history-drawer-card-desc">
              {{ item.lastQuestion || item.selectionMeta }}
            </div>
          </button>
        </div>
        <div v-else class="history-drawer-empty">当前还没有可继续的问数会话</div>
      </div>
    </el-drawer>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router_2'
import { ElMessage } from 'element-plus-secondary'
import { useI18n } from '@/hooks/web/useI18n'
import { getDatasetTree } from '@/api/dataset'
import { getById, getDsTree, listDatasourceTables, previewData } from '@/api/datasource'
import {
  getSQLBotEmbedConfig,
  getRuntimeDatasources,
  type RuntimeDatasource
} from '@/api/aiQueryTheme'
import { buildSqlBotCertificate } from '@/views/sqlbot/queryContext'
import { useCache } from '@/hooks/web/useCache'
import { fieldTypeText } from '@/utils/attr'
import StarbiResultCard from '@/views/sqlbot/StarbiResultCard.vue'
import {
  fetchRuntimeModels,
  getSQLBotChatList,
  getSQLBotChatWithData,
  getSQLBotChartData,
  getSQLBotRecommendQuestions,
  getSQLBotRecordUsage,
  startSQLBotAssistantChat,
  streamSQLBotRecordAnalysis,
  streamSQLBotQuestion,
  validateSQLBotAssistant,
  type SQLBotChatDetail,
  type SQLBotChatSummary,
  type SQLBotRequestContext,
  type SQLBotStreamEvent
} from '@/views/sqlbot/sqlbotDirect'

type QueryMode = 'dataset' | 'file'
type PageView = 'home' | 'history'
type AssistantModeKey = 'query' | 'report' | 'build' | 'search'
type IconName =
  | 'query'
  | 'report'
  | 'interpret'
  | 'build'
  | 'search'
  | 'home'
  | 'history'
  | 'favorite'
  | 'template'
  | 'record'
  | 'dataset'
  | 'file'
  | 'mic'
  | 'expand'
  | 'collapse'
  | 'send'
  | 'refresh'
  | 'magic'
  | 'table'
  | 'field'

interface DatasetTreeItem {
  id: string
  name: string
  leaf?: boolean
  children?: DatasetTreeItem[]
}

interface DatasetCardItem {
  id: string
  name: string
  pathLabel: string
}

interface FileDatasourceItem {
  id: string
  name: string
  type: string
  pathLabel: string
}

interface FilePreviewField {
  name: string
  originName: string
  deType: number
}

interface FilePreviewTable {
  value: string
  label: string
}

interface HistoryEntry {
  id: string
  assistantMode: AssistantModeKey
  queryMode: QueryMode
  datasetIds: string[]
  datasetDatasourceId: string
  fileDatasourceId: string
  title: string
  selectionTitle: string
  selectionMeta: string
  lastQuestion: string
  createdAt: number
  updatedAt: number
  backendChatId?: number
}

interface SelectionChip {
  id: string
  label: string
  type: QueryMode
}

interface SidebarItem {
  key: PageView
  label: string
  icon: IconName
}

interface AssistantModeOption {
  key: AssistantModeKey
  label: string
  icon: IconName
  accent: 'blue' | 'pink' | 'green' | 'violet'
  subtitle: string
  placeholder: string
}

interface DatasetCardDecor {
  tone: 'blue' | 'indigo' | 'cyan' | 'orange' | 'violet'
  badges: string[]
  chips: string[]
  fieldCountText: string
  rowCountText: string
  updatedText: string
}

interface QueryModelOption {
  id: string
  name: string
  badge?: string
  provider?: string
  isDefault?: boolean
}

type SQLBotChartDisplayType = 'table' | 'column' | 'bar' | 'line' | 'pie'

interface SQLBotChatRecordDisplayState {
  chartType?: SQLBotChartDisplayType
  showChartSwitcher?: boolean
}

interface SQLBotChatRecord {
  localId: string
  id?: number
  chatId?: number
  datasource?: number
  question: string
  sqlAnswer: string
  chartAnswer: string
  analysis?: string
  analysisThinking?: string
  analysisLoading?: boolean
  analysisError?: string
  analysisRecordId?: number
  analysisDuration?: number
  analysisTotalTokens?: number
  sql?: string
  chart?: string
  data?: Record<string, any>
  error: string
  createTime: number
  finish: boolean
  finishTime?: string | number
  duration?: number
  totalTokens?: number
  regenerateRecordId?: number
  recommendQuestions?: string[]
  display?: SQLBotChatRecordDisplayState
}

interface SQLBotChatSession {
  id?: number
  brief: string
  datasource?: number
  records: SQLBotChatRecord[]
}

interface ConversationMessageItem {
  key: string
  role: 'user' | 'assistant'
  record: SQLBotChatRecord
}

const HISTORY_STORAGE_KEY = 'STARBI-AI-QUERY-HISTORY'
const HISTORY_SESSION_STORAGE_PREFIX = 'STARBI-AI-QUERY-SESSION-'
const ACTIVE_SESSION_STORAGE_KEY = 'STARBI-AI-QUERY-ACTIVE-SESSION'

const { t } = useI18n()
const router = useRouter()
const { wsCache } = useCache('localStorage')

const questionInputRef = ref<any>(null)
const conversationListRef = ref<HTMLDivElement | null>(null)
const conversationDockRef = ref<HTMLDivElement | null>(null)
const pageLoading = ref(true)
const datasetTree = ref<DatasetTreeItem[]>([])
const datasourceTree = ref<any[]>([])
const datasetDatasourceOptions = ref<RuntimeDatasource[]>([])
const historyEntries = ref<HistoryEntry[]>([])
const restoredSelectionChip = ref<SelectionChip | null>(null)
const filePreviewLoading = ref(false)
const filePreviewFields = ref<FilePreviewField[]>([])
const filePreviewRows = ref<Record<string, any>[]>([])
const filePreviewTables = ref<FilePreviewTable[]>([])
const sqlbotAssistantToken = ref('')
const sqlbotChatLoading = ref(false)
const sqlbotChat = ref<SQLBotChatSession | null>(null)
const archivedConversationRecords = ref<SQLBotChatRecord[]>([])
const sqlbotAbortController = ref<AbortController | null>(null)
const sqlbotAnalysisControllerMap = new Map<string, AbortController>()
const reasoningExpandedMap = reactive<Record<string, boolean>>({})
const conversationDockHeight = ref(212)
let conversationDockObserver: ResizeObserver | null = null
const modelOptions = ref<QueryModelOption[]>([])

const draft = reactive({
  mode: 'dataset' as QueryMode,
  datasetIds: [] as string[],
  fileDatasourceId: '',
  datasetKeyword: '',
  fileKeyword: ''
})

const state = reactive({
  domain: '',
  id: '',
  enabled: false,
  valid: false,
  pageView: 'home' as PageView,
  assistantMode: 'query' as AssistantModeKey,
  queryMode: 'dataset' as QueryMode,
  selectorVisible: false,
  previewVisible: false,
  historyVisible: false,
  formalSidebarExpanded: true,
  previewTab: 'data' as 'data' | 'fields',
  started: false,
  pendingQuestion: '',
  modelId: '',
  datasetIds: [] as string[],
  datasetDatasourceId: '',
  fileDatasourceId: '',
  activeFileTable: '',
  activeScopeKey: '',
  iframeKey: '',
  awaitingConversationCreate: false,
  awaitingQuestion: '',
  iframeReady: false,
  activeSessionId: ''
})

const buildHistorySessionKey = (sessionId: string) => {
  return `${HISTORY_SESSION_STORAGE_PREFIX}${sessionId}`
}

const writeHistorySessionSnapshot = (sessionId: string, payload: Record<string, any>) => {
  if (!sessionId) {
    return
  }
  try {
    window.localStorage.setItem(buildHistorySessionKey(sessionId), JSON.stringify(payload))
  } catch (error) {
    console.error('persist SQLBot session snapshot failed', error)
  }
}

const readHistorySessionSnapshot = (sessionId: string) => {
  if (!sessionId) {
    return null
  }
  try {
    const raw = window.localStorage.getItem(buildHistorySessionKey(sessionId))
    return raw ? JSON.parse(raw) : null
  } catch (error) {
    console.error('read SQLBot session snapshot failed', error)
    return null
  }
}

const writeActiveSessionId = (sessionId: string) => {
  try {
    if (!sessionId) {
      window.localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId)
  } catch (error) {
    console.error('persist active SQLBot session id failed', error)
  }
}

const readActiveSessionId = () => {
  try {
    const raw = window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) || ''
    if (!raw) {
      return ''
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && 'v' in parsed) {
        const wrappedValue = JSON.parse(String(parsed.v || '""'))
        return typeof wrappedValue === 'string' ? wrappedValue : ''
      }
    } catch {
      // use raw string fallback
    }
    return raw
  } catch (error) {
    console.error('read active SQLBot session id failed', error)
    return ''
  }
}

const filePreviewInfo = reactive({
  fileName: '',
  createTime: '' as string | number
})

const iconSvgs: Record<IconName, string> = {
  query: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3.5l1.8 4.2 4.2 1.8-4.2 1.8-1.8 4.2-1.8-4.2-4.2-1.8 4.2-1.8L12 3.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M18.5 4.2l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7.7-1.7Z" fill="currentColor"/>
    </svg>
  `,
  report: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 4.5h6l3 3V18A1.5 1.5 0 0 1 15 19.5H7.5A1.5 1.5 0 0 1 6 18V6A1.5 1.5 0 0 1 7.5 4.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M13.5 4.8V8h3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9 12h6M9 15.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  interpret: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 17.5h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M6.5 15V9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M12 15V6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M17.5 15V11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  build: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="2" stroke="currentColor" stroke-width="1.8"/>
      <rect x="13" y="4.5" width="6.5" height="6.5" rx="2" stroke="currentColor" stroke-width="1.8"/>
      <rect x="8.75" y="13" width="6.5" height="6.5" rx="2" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  search: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" stroke="currentColor" stroke-width="1.8"/>
      <path d="m15 15 4.2 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  home: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 10.5 12 4l7.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4.5 19v-8.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M9.5 20.5v-5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  history: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M4.5 6.5v4h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 8.5v4l2.8 1.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  favorite: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m12 4.2 2.2 4.4 4.8.7-3.5 3.4.8 4.8-4.3-2.2-4.3 2.2.8-4.8-3.5-3.4 4.8-.7L12 4.2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `,
  template: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="5" width="15" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
      <path d="M9 5v14M15 10H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  record: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="15" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
      <path d="M9 9h6M9 12.5h6M9 16h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  dataset: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <ellipse cx="12" cy="6.5" rx="6.5" ry="2.8" stroke="currentColor" stroke-width="1.8"/>
      <path d="M5.5 6.5v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5" stroke="currentColor" stroke-width="1.8"/>
      <path d="M5.5 11.5v5c0 1.5 2.9 2.8 6.5 2.8s6.5-1.3 6.5-2.8v-5" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  file: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4.5h6l4 4V18A1.5 1.5 0 0 1 16.5 19.5h-8A1.5 1.5 0 0 1 7 18V6A1.5 1.5 0 0 1 8.5 4.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M14 4.8V9h4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.5 13h5M9.5 16h3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  mic: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="4.5" width="6" height="10" rx="3" stroke="currentColor" stroke-width="1.8"/>
      <path d="M6.8 11.5a5.2 5.2 0 0 0 10.4 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M12 16.7v3.3M9 20h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  expand: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6.5h8M8 12h8M8 17.5h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="m13 4.5 3 3-3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  collapse: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6.5h8M8 12h8M8 17.5h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="m11 4.5-3 3 3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  send: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 11.7 18.6 5.4c.8-.4 1.6.4 1.2 1.2l-6.3 14.1c-.4.9-1.7.8-2-.1l-1.2-4.1-4.1-1.2c-.9-.3-1-.1.7-2Z" fill="currentColor"/>
      <path d="M10.2 16.4 19.1 7.5" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
  `,
  refresh: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18.5 8.5V4.8h-3.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M5.5 15.5v3.7h3.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M18 9A7 7 0 0 0 6.3 6.5M6 15a7 7 0 0 0 11.7 2.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  magic: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 18.5 18.5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="m14 4.5.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3ZM8 12.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8.8-1.7Z" fill="currentColor"/>
    </svg>
  `,
  table: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4.5" y="5" width="15" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
      <path d="M4.5 10h15M9.5 10v9M14.5 10v9" stroke="currentColor" stroke-width="1.8"/>
    </svg>
  `,
  field: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 7.5h12M6 12h12M6 16.5h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="17.5" cy="16.5" r="1.5" fill="currentColor"/>
    </svg>
  `
}

const getIconSvg = (name: IconName) => iconSvgs[name] || iconSvgs.query

const navItems: SidebarItem[] = [
  { key: 'home', label: '问数首页', icon: 'home' },
  { key: 'history', label: '历史对话', icon: 'history' }
]

const assistantModes: AssistantModeOption[] = [
  {
    key: 'query',
    label: '问数',
    icon: 'query',
    accent: 'blue',
    subtitle: '为您回答',
    placeholder: '直接提问，或点击「选择数据」后开始分析'
  },
  {
    key: 'report',
    label: '报告',
    icon: 'report',
    accent: 'pink',
    subtitle: '智能成稿',
    placeholder: '请描述需要生成的报告内容，必要时先选择数据'
  },
  {
    key: 'build',
    label: '搭建',
    icon: 'build',
    accent: 'green',
    subtitle: '辅助搭建',
    placeholder: '描述你要搭建的分析页面、指标卡或看板布局'
  },
  {
    key: 'search',
    label: '搜索',
    icon: 'search',
    accent: 'violet',
    subtitle: '资料搜索',
    placeholder: '输入你想搜索的业务问题、行业信息或外部资料'
  }
]

const placeholderPageCopy: Record<
  Exclude<PageView, 'home' | 'history'>,
  { title: string; description: string }
> = {
  favorites: {
    title: '我的收藏',
    description: '常用问法、收藏结果和高频分析入口会逐步沉淀在这里。'
  },
  templates: {
    title: '问数模板',
    description: '后续将提供常用分析模版和标准问法，本期先保留入口布局。'
  },
  records: {
    title: '查询记录',
    description: '后续将补齐查询流水、执行记录和结果追踪能力。'
  }
}

const normalizeTree = (nodes: any[] = []) => {
  const normalized = nodes.map(node => ({
    ...node,
    id: String(node.id),
    name: String(node.name || ''),
    children: node.children?.length ? normalizeTree(node.children) : []
  }))

  if (normalized.length === 1 && normalized[0].id === '0') {
    return normalized[0].children || []
  }

  return normalized
}

const normalizeDatasetTree = (nodes: any[] = []): DatasetTreeItem[] => {
  return normalizeTree(nodes).map(node => ({
    id: String(node.id),
    name: node.name,
    leaf: Boolean(node.leaf),
    children: node.children?.length ? normalizeDatasetTree(node.children) : []
  }))
}

const datasetLookup = computed(() => {
  const lookup = new Map<string, { id: string; name: string }>()
  const walk = (nodes: DatasetTreeItem[] = []) => {
    nodes.forEach(node => {
      if (node.leaf) {
        lookup.set(node.id, { id: node.id, name: node.name })
      }
      if (node.children?.length) {
        walk(node.children)
      }
    })
  }
  walk(datasetTree.value)
  return lookup
})

const datasetItems = computed<DatasetCardItem[]>(() => {
  const bucket: DatasetCardItem[] = []
  const walk = (nodes: DatasetTreeItem[] = [], parents: string[] = []) => {
    nodes.forEach(node => {
      if (node.leaf) {
        bucket.push({
          id: node.id,
          name: node.name,
          pathLabel: parents.length ? parents.join(' / ') : '根目录'
        })
        return
      }
      const nextParents = node.name ? [...parents, node.name] : parents
      if (node.children?.length) {
        walk(node.children, nextParents)
      }
    })
  }
  walk(datasetTree.value)
  return bucket
})

const fileDatasourceItems = computed<FileDatasourceItem[]>(() => {
  const bucket: FileDatasourceItem[] = []
  const walk = (nodes: any[] = [], parents: string[] = []) => {
    nodes.forEach(node => {
      const nodeName = String(node.name || '')
      const nextParents = nodeName ? [...parents, nodeName] : parents
      if (node.leaf && String(node.type || '').startsWith('Excel')) {
        bucket.push({
          id: String(node.id),
          name: nodeName,
          type: String(node.type || ''),
          pathLabel: parents.join(' / ') || '根目录'
        })
      }
      if (node.children?.length) {
        walk(node.children, nextParents)
      }
    })
  }
  walk(datasourceTree.value)
  return bucket
})

const stableHash = (text: string) => {
  return Array.from(text).reduce((seed, char, index) => {
    return (seed + char.charCodeAt(0) * (index + 3)) % 100000
  }, 17)
}

const formatApproxRowCount = (seed: number) => {
  const total = ((seed % 540) + 18) * 1000
  if (total >= 100000) {
    return `${(total / 10000).toFixed(1)}万条数据`
  }
  return `${total.toLocaleString()}条数据`
}

const inferDatasetDecor = (item: DatasetCardItem, index: number): DatasetCardDecor => {
  const seed = stableHash(`${item.id}-${item.name}-${index}`)
  const lowerName = item.name.toLowerCase()
  const pathTokens = item.pathLabel
    .split('/')
    .map(token => token.trim())
    .filter(token => token && token !== '根目录')
  const toneSequence: DatasetCardDecor['tone'][] = ['blue', 'indigo', 'cyan', 'orange', 'violet']

  const presets = [
    {
      keywords: ['销售', 'sale'],
      chips: ['销售额', '利润', '订单日期', '客户'],
      tone: 'blue' as const
    },
    {
      keywords: ['库存', 'stock'],
      chips: ['商品编码', '库存数量', '入库时间', '仓库'],
      tone: 'orange' as const
    },
    {
      keywords: ['财务', 'finance', '交易'],
      chips: ['交易金额', '交易时间', '部门', '账户'],
      tone: 'indigo' as const
    },
    {
      keywords: ['gdp', '地区', '省份'],
      chips: ['地区生产总值', '年份', '地区', '增速'],
      tone: 'cyan' as const
    }
  ]

  const matchedPreset = presets.find(preset =>
    preset.keywords.some(keyword => lowerName.includes(keyword))
  )

  const fallbackChips = [...pathTokens.slice(-2), '智能问数'].filter(Boolean)

  return {
    tone: matchedPreset?.tone || toneSequence[index % toneSequence.length],
    badges: [index === 0 ? '样例' : '', index < 2 ? '常用' : ''].filter(Boolean),
    chips: (matchedPreset?.chips || fallbackChips).slice(0, 4),
    fieldCountText: `${12 + (seed % 16)}个字段`,
    rowCountText: formatApproxRowCount(seed),
    updatedText: ['更新于2小时前', '更新于1小时前', '更新于今天', '更新于昨天'][seed % 4]
  }
}

const getDatasetDecor = (item: DatasetCardItem, index: number) => inferDatasetDecor(item, index)

const selectedDatasets = computed(() => {
  return state.datasetIds
    .map(id => datasetLookup.value.get(id))
    .filter((item): item is { id: string; name: string } => Boolean(item))
})

const currentFileDatasource = computed(() => {
  return fileDatasourceItems.value.find(item => item.id === state.fileDatasourceId)
})

const filteredDraftDatasetItems = computed(() => {
  const keyword = draft.datasetKeyword.trim().toLowerCase()
  if (!keyword) {
    return datasetItems.value
  }
  return datasetItems.value.filter(item => {
    return (
      item.name.toLowerCase().includes(keyword) || item.pathLabel.toLowerCase().includes(keyword)
    )
  })
})

const filteredDraftFileItems = computed(() => {
  const keyword = draft.fileKeyword.trim().toLowerCase()
  if (!keyword) {
    return fileDatasourceItems.value
  }
  return fileDatasourceItems.value.filter(item => {
    return (
      item.name.toLowerCase().includes(keyword) || item.pathLabel.toLowerCase().includes(keyword)
    )
  })
})

const embedAvailable = computed(() => {
  return Boolean(state.domain && state.id && state.enabled && state.valid)
})

const needsDatasourceSelection = computed(() => {
  return (
    state.queryMode === 'dataset' &&
    state.datasetIds.length > 0 &&
    datasetDatasourceOptions.value.length > 1
  )
})

const currentDatasetDatasourceName = computed(() => {
  return (
    datasetDatasourceOptions.value.find(item => String(item.id) === state.datasetDatasourceId)
      ?.name || ''
  )
})

const currentQuestionDatasourceId = computed(() => {
  if (state.queryMode === 'file') {
    return normalizeOptionalId(state.fileDatasourceId)
  }
  return normalizeOptionalId(state.datasetDatasourceId)
})

const hasValidSelection = computed(() => {
  if (restoredSelectionChip.value && currentQuestionDatasourceId.value) {
    return true
  }
  if (state.queryMode === 'file') {
    return Boolean(state.fileDatasourceId)
  }
  return state.datasetIds.length > 0
})

const canStart = computed(() => {
  if (!embedAvailable.value || !hasValidSelection.value || noAvailableModels.value) {
    return false
  }
  if (
    state.queryMode === 'dataset' &&
    needsDatasourceSelection.value &&
    !state.datasetDatasourceId
  ) {
    return false
  }
  return true
})

const modelUnavailableHint = computed(() => {
  if (!noAvailableModels.value) {
    return ''
  }
  return '请先在系统设置中完成 AI 模型配置'
})

const currentScopeKey = computed(() => {
  return [
    state.queryMode,
    state.datasetIds.join(','),
    state.datasetDatasourceId,
    state.fileDatasourceId
  ].join('|')
})

const currentAssistantMode = computed(() => {
  return assistantModes.find(item => item.key === state.assistantMode) || assistantModes[0]
})

const homeGreeting = computed(() => {
  const titleMap: Record<AssistantModeKey, string> = {
    query: '今天想分析什么？',
    report: '今天想生成什么报告？',
    build: '今天想搭建什么？',
    search: '今天想搜索什么？'
  }
  return titleMap[state.assistantMode]
})

const questionPlaceholder = computed(() => {
  return currentAssistantMode.value.placeholder
})

const currentSelectionTitle = computed(() => {
  if (
    restoredSelectionChip.value &&
    !selectedDatasets.value.length &&
    !currentFileDatasource.value
  ) {
    return restoredSelectionChip.value.label
  }
  if (state.queryMode === 'file') {
    return currentFileDatasource.value?.name || '请选择数据文件'
  }

  if (!selectedDatasets.value.length) {
    return '请选择数据集'
  }

  if (selectedDatasets.value.length === 1) {
    return selectedDatasets.value[0].name
  }

  return `已选择 ${selectedDatasets.value.length} 个数据集`
})

const normalizeDisplayText = (value?: string) => {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

const currentSelectionMeta = computed(() => {
  if (
    restoredSelectionChip.value &&
    !selectedDatasets.value.length &&
    !currentFileDatasource.value
  ) {
    return state.queryMode === 'dataset'
      ? `数据源：${currentDatasetDatasourceName.value || restoredSelectionChip.value.label}`
      : ''
  }
  if (state.queryMode === 'file') {
    if (!currentFileDatasource.value) {
      return '当前还没有选择数据文件'
    }
    return currentFileDatasource.value.pathLabel
  }

  if (!selectedDatasets.value.length) {
    return '当前还没有选择数据集'
  }

  if (currentDatasetDatasourceName.value) {
    return `数据源：${currentDatasetDatasourceName.value}`
  }

  if (needsDatasourceSelection.value) {
    return t('starbi.smart_query_datasource_hint')
  }

  const mergedDatasetNames = selectedDatasets.value.map(item => item.name).join(' / ')
  if (
    selectedDatasets.value.length === 1 ||
    normalizeDisplayText(mergedDatasetNames) === normalizeDisplayText(currentSelectionTitle.value)
  ) {
    return ''
  }

  return mergedDatasetNames
})

const selectionChips = computed<SelectionChip[]>(() => {
  if (state.queryMode === 'file') {
    const fileChips: SelectionChip[] = currentFileDatasource.value
      ? [
          {
            id: currentFileDatasource.value.id,
            label: currentFileDatasource.value.name,
            type: 'file' as QueryMode
          }
        ]
      : []
    const fallbackChips = restoredSelectionChip.value ? [restoredSelectionChip.value] : []
    return fileChips.length ? fileChips : fallbackChips
  }

  const datasetChips: SelectionChip[] = selectedDatasets.value.map(item => ({
    id: item.id,
    label: item.name,
    type: 'dataset' as QueryMode
  }))
  const fallbackChips = restoredSelectionChip.value ? [restoredSelectionChip.value] : []
  return datasetChips.length ? datasetChips : fallbackChips
})

const fallbackModelOption: QueryModelOption = {
  id: '',
  name: '请先配置模型'
}

const noAvailableModels = computed(() => modelOptions.value.length === 0)

const currentModelOption = computed(() => {
  return (
    modelOptions.value.find(item => item.id === state.modelId) ||
    modelOptions.value[0] ||
    fallbackModelOption
  )
})

const visibleSelectionChips = computed(() => selectionChips.value.slice(0, 2))

const overflowSelectionChipCount = computed(() => {
  return Math.max(0, selectionChips.value.length - visibleSelectionChips.value.length)
})

const displayedConversationRecords = computed(() => {
  return [...archivedConversationRecords.value, ...(sqlbotChat.value?.records || [])]
})

const latestSuccessfulChartRecord = computed(() => {
  const records = sqlbotChat.value?.records || []
  return (
    [...records]
      .reverse()
      .find(record => record.finish && !record.error && record.chart && record.data) || null
  )
})

const reportTemplateCards = computed(() => {
  return [
    {
      title: '销售数据分析报告',
      prompt: '生成一份销售数据分析报告，包含趋势、区域对比和产品排行。',
      description: '基于销售明细生成月度销售报告，包含趋势、区域对比和产品排行。'
    },
    {
      title: '运营活动效果报告',
      prompt: '生成一份运营活动效果报告，输出流量、转化、营收和 ROI 等核心指标结论。',
      description: '分析活动效果，输出流量、转化、营收和 ROI 等核心指标结论。'
    }
  ]
})

const buildStarterCards = computed(() => {
  return [
    {
      title: '经营驾驶舱搭建',
      prompt: '帮我搭建一个经营驾驶舱，包含核心指标、趋势分析和区域对比布局。',
      description: '先占位承载搭建思路，后续会把页面结构规划、组件编排和看板布局能力补齐。'
    },
    {
      title: '销售专题分析页',
      prompt: '帮我规划一个销售专题分析页，包含趋势、排行、贡献度和明细区域。',
      description: '适合沉淀分析页面骨架、图表分区和指标模块，当前版本先保留布局入口。'
    }
  ]
})

const searchStarterCards = computed(() => {
  return [
    {
      title: '业务问题搜索',
      prompt: '搜索茶饮行业关于门店经营分析的常用指标与分析框架。',
      description: '后续用于搜索业务知识、行业资料和外部参考信息，当前版本先保留产品入口。'
    },
    {
      title: '行业资料搜索',
      prompt: '搜索零售行业常见的区域经营分析方法与可视化呈现方式。',
      description: '会逐步接入行业资料、公开信息和知识搜索能力，当前版本先展示布局。'
    }
  ]
})

const queryHistory = computed(() => {
  return [...historyEntries.value]
    .filter(item => item.assistantMode === state.assistantMode)
    .sort((left, right) => right.updatedAt - left.updatedAt)
})

const recentHistory = computed(() => queryHistory.value.slice(0, 4))
const isFormalConversation = computed(() => state.pageView === 'home' && state.started)
const showSidebarPanel = computed(() => true)

const conversationShellStyle = computed(() => {
  return {
    '--starbi-conversation-column-width': '900px',
    '--starbi-conversation-gap': '24px',
    '--starbi-conversation-dock-offset': '0px'
  }
})

const latestConversationRecord = computed(() => {
  const records = sqlbotChat.value?.records || []
  return records.length ? records[records.length - 1] : null
})

const conversationMessages = computed<ConversationMessageItem[]>(() => {
  if (!displayedConversationRecords.value.length) {
    return []
  }

  return displayedConversationRecords.value.flatMap(record => {
    return [
      {
        key: `${record.localId}-user`,
        role: 'user' as const,
        record
      },
      {
        key: `${record.localId}-assistant`,
        role: 'assistant' as const,
        record
      }
    ]
  })
})

const conversationRecommendedQuestions = computed(() => {
  if (
    !state.started ||
    sqlbotChatLoading.value ||
    !latestConversationRecord.value?.finish ||
    latestConversationRecord.value?.error
  ) {
    return []
  }
  return (latestConversationRecord.value.recommendQuestions || []).slice(0, 4)
})

const draftHasSelection = computed(() => {
  if (draft.mode === 'file') {
    return Boolean(draft.fileDatasourceId)
  }
  return draft.datasetIds.length > 0
})

const displayedFilePreviewColumns = computed(() => filePreviewFields.value.slice(0, 10))
const displayedFilePreviewRows = computed(() => filePreviewRows.value.slice(0, 16))
const previewFileName = computed(() => {
  return currentFileDatasource.value?.name || filePreviewInfo.fileName || '未命名文件'
})
const previewFileTime = computed(() => {
  return filePreviewInfo.createTime ? formatTime(filePreviewInfo.createTime) : '--'
})
const previewFieldStats = computed(() => {
  return filePreviewFields.value.reduce(
    (stats, field) => {
      const label = getFieldTypeLabel(field.deType)
      const normalizedLabel = String(label).toLowerCase()
      stats.total += 1
      if (
        normalizedLabel.includes('时间') ||
        normalizedLabel.includes('日期') ||
        normalizedLabel.includes('date')
      ) {
        stats.date += 1
      } else if (
        normalizedLabel.includes('数') ||
        normalizedLabel.includes('金额') ||
        normalizedLabel.includes('int') ||
        normalizedLabel.includes('float') ||
        normalizedLabel.includes('decimal')
      ) {
        stats.number += 1
      } else {
        stats.text += 1
      }
      return stats
    },
    { total: 0, text: 0, date: 0, number: 0 }
  )
})

const previewPrimaryActionText = computed(() => {
  return state.started && state.queryMode === 'file' ? '继续当前问数' : '保存并开始问数'
})

const toggleReasoning = (localId: string) => {
  reasoningExpandedMap[localId] = !reasoningExpandedMap[localId]
}

const isReasoningExpanded = (record: SQLBotChatRecord) => {
  return Boolean(reasoningExpandedMap[record.localId])
}

const arraysEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false
  }
  return [...left].sort().join(',') === [...right].sort().join(',')
}

const normalizeOptionalId = (value: unknown) => {
  const normalized = String(value ?? '').trim()
  if (!normalized || normalized === 'null' || normalized === 'undefined') {
    return ''
  }
  return normalized
}

const focusQuestionInput = async () => {
  await nextTick()
  const inputInstance = questionInputRef.value as any
  inputInstance?.focus?.()
  inputInstance?.textarea?.focus?.()
}

const updateConversationDockHeight = () => {
  const dock = conversationDockRef.value
  if (!dock) {
    conversationDockHeight.value = 148
    return
  }
  conversationDockHeight.value = Math.max(148, Math.ceil(dock.getBoundingClientRect().height))
}

const bindConversationDockObserver = async () => {
  await nextTick()
  conversationDockObserver?.disconnect()
  conversationDockObserver = null
  updateConversationDockHeight()
  if (typeof ResizeObserver === 'undefined' || !conversationDockRef.value) {
    return
  }
  conversationDockObserver = new ResizeObserver(() => {
    updateConversationDockHeight()
  })
  conversationDockObserver.observe(conversationDockRef.value)
}

const scrollConversationToBottom = async () => {
  await nextTick()
  const el = conversationListRef.value
  if (!el) {
    return
  }
  el.scrollTop = el.scrollHeight
}

const scrollConversationToLatestResult = async () => {
  await nextTick()
  const el = conversationListRef.value
  if (!el) {
    return
  }
  const assistantRows = [
    ...el.querySelectorAll('.conversation-message-row.assistant')
  ] as HTMLElement[]
  if (!assistantRows.length) {
    el.scrollTop = 0
    return
  }
  const latestRow = assistantRows[assistantRows.length - 1]
  if (!latestRow) {
    return
  }
  const topGap = 12
  const bottomGap = 24
  const availableHeight = Math.max(el.clientHeight - bottomGap - topGap, 0)
  if (availableHeight <= 0 || latestRow.offsetHeight > availableHeight) {
    el.scrollTop = Math.max(0, latestRow.offsetTop - topGap)
    return
  }
  const historyPeek = Math.min(88, Math.max(24, (availableHeight - latestRow.offsetHeight) / 2))
  el.scrollTop = Math.max(0, latestRow.offsetTop - historyPeek)
}

const queueLatestResultScroll = async () => {
  await nextTick()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      void scrollConversationToLatestResult()
    })
  })
}

const buildSQLBotRequestContext = (): SQLBotRequestContext => {
  return {
    domain: state.domain,
    assistantId: String(state.id),
    assistantToken: sqlbotAssistantToken.value,
    certificate: buildEmbeddedCertificate(),
    hostOrigin: window.location.origin,
    locale: String(wsCache.get('lang') || 'zh-CN')
  }
}

const resetSQLBotConversation = () => {
  sqlbotAbortController.value?.abort()
  sqlbotAbortController.value = null
  sqlbotAnalysisControllerMap.forEach(controller => controller.abort())
  sqlbotAnalysisControllerMap.clear()
  sqlbotChatLoading.value = false
  sqlbotChat.value = null
  Object.keys(reasoningExpandedMap).forEach(key => {
    delete reasoningExpandedMap[key]
  })
}

const ensureSQLBotAssistantToken = async () => {
  if (sqlbotAssistantToken.value) {
    return sqlbotAssistantToken.value
  }

  const validator = await validateSQLBotAssistant(state.domain, String(state.id))
  const nextToken = String(validator?.token || '')
  if (!nextToken) {
    throw new Error('SQLBot assistant token is empty')
  }
  sqlbotAssistantToken.value = nextToken
  return nextToken
}

const createLocalChatRecord = (question: string): SQLBotChatRecord =>
  reactive({
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    question,
    sqlAnswer: '',
    chartAnswer: '',
    analysis: '',
    analysisThinking: '',
    analysisLoading: false,
    analysisError: '',
    error: '',
    createTime: Date.now(),
    finish: false,
    recommendQuestions: [],
    display: {
      showChartSwitcher: false
    }
  }) as SQLBotChatRecord

const appendCurrentConversationToArchive = () => {
  if (!sqlbotChat.value?.records?.length) {
    sqlbotChat.value = null
    return
  }
  archivedConversationRecords.value = [
    ...archivedConversationRecords.value,
    ...sqlbotChat.value.records.map(record => normalizeSQLBotChatRecord(record))
  ]
  sqlbotChat.value = null
}

const clearArchivedConversation = () => {
  archivedConversationRecords.value = []
}

const clearRestoredSelectionChip = () => {
  restoredSelectionChip.value = null
}

const ensureSQLBotChatSession = async () => {
  await ensureSQLBotAssistantToken()

  if (sqlbotChat.value?.id) {
    return sqlbotChat.value
  }

  const context = buildSQLBotRequestContext()
  const response = await startSQLBotAssistantChat(context, {
    origin: 2,
    datasource: currentQuestionDatasourceId.value
      ? Number(currentQuestionDatasourceId.value)
      : undefined
  })
  const existingRecords = sqlbotChat.value?.records || []

  sqlbotChat.value = {
    id: Number(response?.id),
    brief: String(response?.brief || currentSelectionTitle.value),
    datasource: response?.datasource ? Number(response.datasource) : undefined,
    records: existingRecords
  }
  state.activeSessionId = String(response?.id || '')
  writeActiveSessionId(state.activeSessionId)

  return sqlbotChat.value
}

const hydrateSQLBotUsage = async (record: SQLBotChatRecord) => {
  if (!record.id) {
    return
  }
  try {
    const usage = await getSQLBotRecordUsage(buildSQLBotRequestContext(), record.id)
    record.finishTime = usage?.finish_time
    record.duration = usage?.duration
    record.totalTokens = usage?.total_tokens
  } catch (error) {
    console.error('load SQLBot usage failed', error)
  }
}

const hydrateSQLBotAnalysisUsage = async (record: SQLBotChatRecord) => {
  if (!record.analysisRecordId) {
    return
  }
  try {
    const usage = await getSQLBotRecordUsage(buildSQLBotRequestContext(), record.analysisRecordId)
    record.analysisDuration = usage?.duration
    record.analysisTotalTokens = usage?.total_tokens
  } catch (error) {
    console.error('load SQLBot analysis usage failed', error)
  }
}

const hydrateSQLBotChartData = async (record: SQLBotChatRecord) => {
  if (!record.id) {
    return
  }
  try {
    record.data = await getSQLBotChartData(buildSQLBotRequestContext(), record.id)
    await queueLatestResultScroll()
  } catch (error) {
    console.error('load SQLBot chart data failed', error)
  }
}

const loadSQLBotRecommendQuestions = async (record: SQLBotChatRecord) => {
  if (!record.id || record.error) {
    return
  }

  try {
    record.recommendQuestions = await getSQLBotRecommendQuestions(
      buildSQLBotRequestContext(),
      record.id
    )
    persistCurrentSQLBotSession()
  } catch (error) {
    console.error('load SQLBot recommend questions failed', error)
  }
}

const applySQLBotStreamEvent = async (record: SQLBotChatRecord, event: SQLBotStreamEvent) => {
  switch (event.type) {
    case 'id':
      record.id = Number(event.id)
      record.chatId = sqlbotChat.value?.id
      break
    case 'regenerate_record_id':
      record.regenerateRecordId = Number(event.regenerate_record_id)
      break
    case 'question':
      record.question = String(event.question || record.question)
      break
    case 'brief':
      if (sqlbotChat.value) {
        sqlbotChat.value.brief = String(event.brief || sqlbotChat.value.brief)
      }
      break
    case 'datasource':
      if (event.id && sqlbotChat.value) {
        sqlbotChat.value.datasource = Number(event.id)
        record.datasource = Number(event.id)
      }
      break
    case 'sql-result':
      record.sqlAnswer += String(event.reasoning_content || '')
      break
    case 'sql':
      record.sql = String(event.content || '')
      break
    case 'sql-data':
      await hydrateSQLBotChartData(record)
      break
    case 'chart-result':
      record.chartAnswer += String(event.reasoning_content || '')
      break
    case 'chart':
      record.chart = String(event.content || '')
      break
    case 'error':
      record.error = String(event.content || 'SQLBot 执行失败')
      record.finish = true
      delete reasoningExpandedMap[record.localId]
      await hydrateSQLBotUsage(record)
      break
    case 'finish':
      record.finish = true
      delete reasoningExpandedMap[record.localId]
      await hydrateSQLBotUsage(record)
      await loadSQLBotRecommendQuestions(record)
      await queueLatestResultScroll()
      break
    default:
      break
  }
  persistCurrentSQLBotSession()
  await scrollConversationToBottom()
}

const applySQLBotAnalysisEvent = async (record: SQLBotChatRecord, event: SQLBotStreamEvent) => {
  if (event.code && event.code !== 200 && event.code !== 0) {
    record.analysisError = String(event.msg || event.message || '数据解读失败')
    record.analysisLoading = false
    await scrollConversationToBottom()
    return
  }

  switch (event.type) {
    case 'id':
      record.analysisRecordId = Number(event.id)
      break
    case 'analysis-result':
      record.analysis += String(event.content || '')
      record.analysisThinking += String(event.reasoning_content || '')
      break
    case 'error':
      record.analysisError = String(event.content || '数据解读失败')
      record.analysisLoading = false
      await hydrateSQLBotAnalysisUsage(record)
      break
    case 'analysis_finish':
      record.analysisLoading = false
      await hydrateSQLBotAnalysisUsage(record)
      await queueLatestResultScroll()
      break
    default:
      break
  }

  persistCurrentSQLBotSession()
  await scrollConversationToBottom()
}

const sendQuestionToSQLBot = async (question: string) => {
  if (state.assistantMode !== 'query') {
    ElMessage.info('当前版本暂时只支持问数')
    return false
  }

  if (noAvailableModels.value) {
    ElMessage.warning(modelUnavailableHint.value)
    return false
  }

  if (sqlbotChatLoading.value) {
    return false
  }

  const normalizedQuestion = question.trim()
  if (!normalizedQuestion) {
    return false
  }

  const record = createLocalChatRecord(normalizedQuestion)
  if (!sqlbotChat.value) {
    sqlbotChat.value = {
      brief: currentSelectionTitle.value,
      datasource: undefined,
      records: []
    }
  }
  sqlbotChat.value.records.push(record)
  persistCurrentSQLBotSession()
  sqlbotChatLoading.value = true
  await scrollConversationToBottom()

  const controller = new AbortController()
  sqlbotAbortController.value = controller

  try {
    const chat = await ensureSQLBotChatSession()
    record.chatId = chat.id
    touchHistoryEntry(normalizedQuestion, chat.id)

    await streamSQLBotQuestion(
      buildSQLBotRequestContext(),
      {
        question: normalizedQuestion,
        chat_id: chat.id,
        datasource_id: currentQuestionDatasourceId.value
          ? Number(currentQuestionDatasourceId.value)
          : undefined,
        ai_modal_id: state.modelId ? Number(state.modelId) || undefined : undefined,
        ai_modal_name: currentModelOption.value.name
      },
      {
        signal: controller.signal,
        onEvent: event => {
          void applySQLBotStreamEvent(record, event)
        }
      }
    )
  } catch (error) {
    console.error('stream SQLBot question failed', error)
    record.error = error instanceof Error ? error.message : '智能问数执行失败'
    record.finish = true
    await hydrateSQLBotUsage(record)
  } finally {
    sqlbotAbortController.value = null
    sqlbotChatLoading.value = false
    await scrollConversationToBottom()
  }

  return true
}

const requestRecordAnalysis = async (record: SQLBotChatRecord) => {
  if (state.assistantMode !== 'query') {
    ElMessage.info('当前版本暂时只支持问数解读')
    return
  }

  if (!record.id) {
    ElMessage.warning('当前结果尚未完成，暂时不能解读')
    return
  }

  if (record.analysisLoading) {
    return
  }

  let requestContext: SQLBotRequestContext
  try {
    await ensureSQLBotAssistantToken()
    requestContext = buildSQLBotRequestContext()
  } catch (error) {
    console.error('prepare SQLBot analysis failed', error)
    ElMessage.error(error instanceof Error ? error.message : '数据解读准备失败')
    return
  }

  record.analysis = ''
  record.analysisThinking = ''
  record.analysisError = ''
  record.analysisLoading = true
  record.analysisRecordId = undefined
  record.analysisDuration = undefined
  record.analysisTotalTokens = undefined
  await scrollConversationToBottom()

  const controller = new AbortController()
  sqlbotAnalysisControllerMap.set(record.localId, controller)

  try {
    await streamSQLBotRecordAnalysis(requestContext, record.id, {
      signal: controller.signal,
      onEvent: event => {
        void applySQLBotAnalysisEvent(record, event)
      }
    })
  } catch (error) {
    if (controller.signal.aborted) {
      return
    }
    console.error('stream SQLBot analysis failed', error)
    record.analysisError = error instanceof Error ? error.message : '数据解读执行失败'
  } finally {
    record.analysisLoading = false
    sqlbotAnalysisControllerMap.delete(record.localId)
    await scrollConversationToBottom()
  }
}

const persistSelectionState = () => {
  wsCache.set('STARBI-QUERY-MODE', state.queryMode)
  wsCache.set('STARBI-QUERY-MODEL-ID', state.modelId)
  wsCache.set('STARBI-QUERY-DATASET-IDS', [...state.datasetIds])
  wsCache.set('STARBI-QUERY-DATASET-DSID', state.datasetDatasourceId)
  wsCache.set('STARBI-QUERY-FILE-DSID', state.fileDatasourceId)
  writeActiveSessionId(state.activeSessionId || '')
}

const persistHistoryEntries = () => {
  const lightweightEntries = historyEntries.value.map(item => ({
    id: item.id,
    backendChatId: item.backendChatId,
    assistantMode: item.assistantMode,
    queryMode: item.queryMode,
    datasetIds: item.datasetIds,
    datasetDatasourceId: item.datasetDatasourceId,
    fileDatasourceId: item.fileDatasourceId,
    title: item.title,
    selectionTitle: item.selectionTitle,
    selectionMeta: item.selectionMeta,
    lastQuestion: item.lastQuestion,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }))
  wsCache.set(HISTORY_STORAGE_KEY, lightweightEntries)
}

const buildHistoryResourceSnapshot = () => {
  return {
    assistantMode: state.assistantMode,
    queryMode: state.queryMode,
    datasetIds: [...state.datasetIds],
    datasetDatasourceId: state.datasetDatasourceId,
    fileDatasourceId: state.fileDatasourceId,
    selectionTitle: currentSelectionTitle.value,
    selectionMeta: currentSelectionMeta.value
  }
}

const normalizeNumericValue = (...values: unknown[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue
    }
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

const buildHistoryEntryFromBackend = (
  chat: SQLBotChatSummary,
  localEntry?: HistoryEntry
): HistoryEntry => {
  const updatedAt = chat.create_time ? new Date(chat.create_time).getTime() : Date.now()
  const backendChatId = Number(chat.id)
  const sessionSnapshot = readHistorySessionSnapshot(String(backendChatId)) || {}
  const sessionDatasetIds = Array.isArray(sessionSnapshot.datasetIds)
    ? sessionSnapshot.datasetIds.map((item: string) => String(item)).slice(0, 1)
    : []
  return {
    id: String(backendChatId),
    backendChatId,
    assistantMode: localEntry?.assistantMode || sessionSnapshot.assistantMode || 'query',
    queryMode: localEntry?.queryMode || sessionSnapshot.queryMode || 'dataset',
    datasetIds: localEntry?.datasetIds?.length ? localEntry.datasetIds : sessionDatasetIds,
    datasetDatasourceId:
      localEntry?.datasetDatasourceId || normalizeOptionalId(sessionSnapshot.datasetDatasourceId),
    fileDatasourceId:
      localEntry?.fileDatasourceId || normalizeOptionalId(sessionSnapshot.fileDatasourceId),
    title: String(chat.brief || localEntry?.title || ''),
    selectionTitle:
      localEntry?.selectionTitle || String(sessionSnapshot.selectionTitle || chat.brief || ''),
    selectionMeta: localEntry?.selectionMeta || String(sessionSnapshot.selectionMeta || ''),
    lastQuestion: localEntry?.lastQuestion || '',
    createdAt: localEntry?.createdAt || updatedAt,
    updatedAt
  }
}

const loadHistoryEntries = async () => {
  const cachedEntries = wsCache.get(HISTORY_STORAGE_KEY)
  const localEntries = Array.isArray(cachedEntries) ? cachedEntries : []
  const localMap = new Map(
    localEntries
      .filter(item => item?.id)
      .map(item => [String(item.backendChatId || item.id), item as HistoryEntry])
  )

  if (!embedAvailable.value) {
    historyEntries.value = localEntries as HistoryEntry[]
    return
  }

  try {
    await ensureSQLBotAssistantToken()
    const chats = await getSQLBotChatList(buildSQLBotRequestContext())
    historyEntries.value = chats.map(chat =>
      buildHistoryEntryFromBackend(chat, localMap.get(String(chat.id)))
    )
    persistHistoryEntries()
  } catch (error) {
    console.error('load SQLBot history failed', error)
    historyEntries.value = localEntries
  }
}

const normalizeSQLBotChatRecord = (record: any): SQLBotChatRecord => {
  let recommendedQuestions: string[] = []
  if (Array.isArray(record?.recommendQuestions)) {
    recommendedQuestions = record.recommendQuestions.map((item: string) => String(item))
  } else if (Array.isArray(record?.recommended_question)) {
    recommendedQuestions = record.recommended_question.map((item: string) => String(item))
  } else if (
    typeof record?.recommended_question === 'string' &&
    record.recommended_question.trim()
  ) {
    try {
      const parsed = JSON.parse(record.recommended_question)
      recommendedQuestions = Array.isArray(parsed) ? parsed.map((item: string) => String(item)) : []
    } catch (error) {
      console.error('parse SQLBot recommended questions failed', error)
    }
  }

  return {
    localId: String(record?.localId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
    id: normalizeNumericValue(record?.id),
    chatId: normalizeNumericValue(record?.chatId, record?.chat_id),
    datasource: normalizeNumericValue(record?.datasource),
    question: String(record?.question || ''),
    sqlAnswer: String(record?.sqlAnswer || record?.sql_answer || ''),
    chartAnswer: String(record?.chartAnswer || record?.chart_answer || ''),
    analysis: String(record?.analysis || ''),
    analysisThinking: String(record?.analysisThinking || record?.analysis_thinking || ''),
    analysisLoading: false,
    analysisError: String(record?.analysisError || ''),
    analysisRecordId: normalizeNumericValue(record?.analysisRecordId, record?.analysis_record_id),
    analysisDuration: normalizeNumericValue(record?.analysisDuration),
    analysisTotalTokens: normalizeNumericValue(record?.analysisTotalTokens),
    sql: record?.sql ? String(record.sql) : undefined,
    chart: record?.chart ? String(record.chart) : undefined,
    data: record?.data || undefined,
    error: String(record?.error || ''),
    createTime: Number(record?.createTime || new Date(record?.create_time || Date.now()).getTime()),
    finish: record?.finish !== false,
    finishTime: record?.finishTime || record?.finish_time,
    duration: normalizeNumericValue(record?.duration),
    totalTokens: normalizeNumericValue(record?.totalTokens),
    regenerateRecordId: normalizeNumericValue(
      record?.regenerateRecordId,
      record?.regenerate_record_id
    ),
    recommendQuestions: recommendedQuestions,
    display: {
      chartType: record?.display?.chartType,
      showChartSwitcher: false
    }
  }
}

const normalizeSQLBotChatSession = (
  chat: SQLBotChatDetail | Record<string, any>
): SQLBotChatSession => {
  const rawRecords = Array.isArray(chat?.records) ? chat.records : []
  return {
    id: normalizeNumericValue(chat?.id),
    brief: String(chat?.brief || currentSelectionTitle.value),
    datasource: normalizeNumericValue(chat?.datasource),
    records: rawRecords.map(item => normalizeSQLBotChatRecord(item))
  }
}

const handleRecordChartTypeChange = (
  record: SQLBotChatRecord,
  chartType: SQLBotChartDisplayType
) => {
  record.display = {
    ...(record.display || {}),
    chartType,
    showChartSwitcher: false
  }
  persistCurrentSQLBotSession()
}

const persistCurrentSQLBotSession = () => {
  if (!state.activeSessionId || !sqlbotChat.value) {
    return
  }

  const snapshot = {
    id: sqlbotChat.value.id,
    brief: sqlbotChat.value.brief,
    datasource: sqlbotChat.value.datasource,
    records: sqlbotChat.value.records.map(record => ({
      ...record,
      analysisLoading: false
    }))
  }

  writeHistorySessionSnapshot(state.activeSessionId, snapshot)
}

const loadPersistedSQLBotSession = (sessionId: string): SQLBotChatSession | null => {
  if (!sessionId) {
    return null
  }
  const raw = readHistorySessionSnapshot(sessionId)
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const records = Array.isArray((raw as any).records)
    ? (raw as any).records.map((item: any) => normalizeSQLBotChatRecord(item))
    : []

  return {
    id: (raw as any).id ? Number((raw as any).id) : undefined,
    brief: String((raw as any).brief || currentSelectionTitle.value),
    datasource: (raw as any).datasource ? Number((raw as any).datasource) : undefined,
    records
  }
}

const clearFilePreview = () => {
  filePreviewFields.value = []
  filePreviewRows.value = []
  filePreviewTables.value = []
  filePreviewInfo.fileName = ''
  filePreviewInfo.createTime = ''
  state.activeFileTable = ''
}

const loadFilePreviewTable = async (
  tableName = state.activeFileTable,
  datasourceId = state.fileDatasourceId
) => {
  if (!datasourceId || !tableName) {
    return
  }

  filePreviewLoading.value = true
  try {
    state.activeFileTable = tableName
    const previewRes: any = await previewData({
      table: tableName,
      id: datasourceId
    })
    filePreviewFields.value = (previewRes?.data?.fields || []) as FilePreviewField[]
    filePreviewRows.value = (previewRes?.data?.data || []) as Record<string, any>[]
  } catch (error) {
    console.error(error)
    filePreviewFields.value = []
    filePreviewRows.value = []
  } finally {
    filePreviewLoading.value = false
  }
}

const loadFilePreview = async (datasourceId: string) => {
  clearFilePreview()
  if (!datasourceId) {
    return
  }

  filePreviewLoading.value = true
  try {
    const [detailRes, tablesRes]: any[] = await Promise.all([
      getById(datasourceId as unknown as number),
      listDatasourceTables({ datasourceId })
    ])

    const detail = detailRes?.data || {}
    filePreviewInfo.fileName = detail.fileName || detail.name || ''
    filePreviewInfo.createTime = detail.createTime || detail.lastSyncTime || ''
    filePreviewTables.value = (tablesRes?.data || []).map((item: any) => ({
      value: item.name,
      label: item.tableName || item.name
    }))

    if (filePreviewTables.value.length) {
      state.activeFileTable = filePreviewTables.value[0].value
      await loadFilePreviewTable(state.activeFileTable, datasourceId)
    }
  } catch (error) {
    console.error(error)
    clearFilePreview()
  } finally {
    filePreviewLoading.value = false
  }
}

const loadDatasources = async () => {
  if (!state.datasetIds.length) {
    datasetDatasourceOptions.value = []
    state.datasetDatasourceId = ''
    return
  }

  try {
    const datasourceList = await getRuntimeDatasources(
      state.datasetIds,
      normalizeOptionalId(state.datasetDatasourceId) || undefined
    )
    datasetDatasourceOptions.value = datasourceList
    if (datasourceList.length === 1) {
      state.datasetDatasourceId = normalizeOptionalId(datasourceList[0].id)
    } else if (
      state.datasetDatasourceId &&
      !datasourceList.some(item => String(item.id) === state.datasetDatasourceId)
    ) {
      state.datasetDatasourceId = ''
    }
  } catch (error) {
    console.error(error)
    datasetDatasourceOptions.value = []
    state.datasetDatasourceId = ''
  }
}

const loadRuntimeModels = async () => {
  try {
    const runtimeModels = await fetchRuntimeModels()
    modelOptions.value = runtimeModels.models.map((model, index) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      isDefault: model.isDefault,
      badge: model.isDefault || index === 0 ? '推荐' : undefined
    }))

    const savedModelId = String(wsCache.get('STARBI-QUERY-MODEL-ID') || '')
    const preferredModelId =
      (savedModelId && modelOptions.value.some(item => item.id === savedModelId) && savedModelId) ||
      runtimeModels.defaultModelId ||
      modelOptions.value[0]?.id ||
      ''
    state.modelId = preferredModelId
  } catch (error) {
    console.error('load runtime models failed', error)
    modelOptions.value = []
    state.modelId = ''
  }
}

const restoreSelectionState = async () => {
  const savedMode = wsCache.get('STARBI-QUERY-MODE')
  state.queryMode = savedMode === 'file' ? 'file' : 'dataset'

  const savedDatasetIds = wsCache.get('STARBI-QUERY-DATASET-IDS')
  state.datasetIds = Array.isArray(savedDatasetIds)
    ? savedDatasetIds
        .map(item => String(item))
        .filter(id => datasetLookup.value.has(id))
        .slice(0, 1)
    : []

  const savedDatasetDatasourceId = normalizeOptionalId(wsCache.get('STARBI-QUERY-DATASET-DSID'))
  state.datasetDatasourceId = savedDatasetDatasourceId

  const savedFileDatasourceId = normalizeOptionalId(wsCache.get('STARBI-QUERY-FILE-DSID'))
  state.fileDatasourceId = fileDatasourceItems.value.some(item => item.id === savedFileDatasourceId)
    ? savedFileDatasourceId
    : ''

  state.activeSessionId = readActiveSessionId()

  await loadDatasources()

  if (state.fileDatasourceId) {
    await loadFilePreview(state.fileDatasourceId)
  }

  if (state.activeSessionId) {
    const persistedSession = loadPersistedSQLBotSession(state.activeSessionId)
    const backendHistoryEntry = historyEntries.value.find(
      item => String(item.backendChatId || item.id) === state.activeSessionId
    )
    if (backendHistoryEntry?.backendChatId) {
      try {
        await ensureSQLBotAssistantToken()
        const detail = await getSQLBotChatWithData(
          buildSQLBotRequestContext(),
          backendHistoryEntry.backendChatId
        )
        sqlbotChat.value = normalizeSQLBotChatSession(detail)
        state.started = true
        if (state.queryMode === 'dataset' && !state.datasetDatasourceId) {
          state.datasetDatasourceId = normalizeOptionalId(detail?.datasource)
        }
        state.activeScopeKey = currentScopeKey.value
        state.pageView = 'home'
        state.pendingQuestion = ''
        persistCurrentSQLBotSession()
        await queueLatestResultScroll()
      } catch (error) {
        console.error('restore SQLBot backend session failed', error)
      }
    } else if (persistedSession?.records?.length) {
      sqlbotChat.value = persistedSession
      state.started = true
      state.activeScopeKey = currentScopeKey.value
      state.pageView = 'home'
      state.pendingQuestion = ''
      await queueLatestResultScroll()
    }
  }

  persistSelectionState()
}

const loadPageData = async () => {
  pageLoading.value = true
  try {
    const [embedConfig, rawDatasetTree, rawDatasourceTree] = await Promise.all([
      getSQLBotEmbedConfig(),
      getDatasetTree({}),
      getDsTree({})
    ])

    state.domain = embedConfig?.domain || ''
    state.id = String(embedConfig?.id || '')
    state.enabled = embedConfig?.enabled !== false
    state.valid = embedConfig?.valid !== false
    datasetTree.value = normalizeDatasetTree(
      Array.isArray(rawDatasetTree) ? rawDatasetTree : rawDatasetTree?.data || []
    )
    datasourceTree.value = normalizeTree(
      Array.isArray(rawDatasourceTree) ? rawDatasourceTree : rawDatasourceTree?.data || []
    )
    await loadRuntimeModels()
    await loadHistoryEntries()
    await restoreSelectionState()
  } catch (error) {
    console.error(error)
    datasetTree.value = []
    datasourceTree.value = []
    datasetDatasourceOptions.value = []
    historyEntries.value = []
    modelOptions.value = []
    state.modelId = ''
  } finally {
    pageLoading.value = false
  }
}

const resetConversationState = (
  options: { keepSession?: boolean; clearQuestion?: boolean; keepArchive?: boolean } = {}
) => {
  resetSQLBotConversation()
  state.started = false
  state.activeScopeKey = ''
  state.iframeKey = ''
  state.awaitingConversationCreate = false
  state.awaitingQuestion = ''
  state.iframeReady = false
  if (!options.keepSession) {
    state.activeSessionId = ''
    writeActiveSessionId('')
  }
  if (!options.keepArchive) {
    clearArchivedConversation()
  }
  if (options.clearQuestion) {
    state.pendingQuestion = ''
  }
}

const touchHistoryEntry = (question = '', backendChatId?: number) => {
  const now = Date.now()
  const nextId = backendChatId ? String(backendChatId) : state.activeSessionId || `query-${now}`
  const previous = historyEntries.value.find(item => item.id === nextId)

  const nextEntry: HistoryEntry = {
    id: nextId,
    assistantMode: state.assistantMode,
    queryMode: state.queryMode,
    datasetIds: [...state.datasetIds],
    datasetDatasourceId: state.datasetDatasourceId,
    fileDatasourceId: state.fileDatasourceId,
    title: question || previous?.title || currentSelectionTitle.value,
    selectionTitle: currentSelectionTitle.value,
    selectionMeta: currentSelectionMeta.value,
    lastQuestion: question || previous?.lastQuestion || '',
    createdAt: previous?.createdAt || now,
    updatedAt: now,
    backendChatId: backendChatId || previous?.backendChatId
  }

  historyEntries.value = [
    nextEntry,
    ...historyEntries.value.filter(item => item.id !== nextEntry.id)
  ]
  state.activeSessionId = nextEntry.id
  persistHistoryEntries()
  writeActiveSessionId(nextEntry.id)
  const sessionSnapshot = sqlbotChat.value || {
    brief: currentSelectionTitle.value,
    datasource: undefined,
    records: []
  }
  writeHistorySessionSnapshot(nextEntry.id, {
    id: sessionSnapshot.id,
    brief: sessionSnapshot.brief,
    datasource: sessionSnapshot.datasource,
    ...buildHistoryResourceSnapshot(),
    records: Array.isArray(sessionSnapshot.records)
      ? sessionSnapshot.records.map(record => ({
          ...record,
          analysisLoading: false
        }))
      : []
  })
}

const openSelector = (mode?: QueryMode) => {
  draft.mode = mode || state.queryMode
  draft.datasetIds = state.datasetIds.slice(0, 1)
  draft.fileDatasourceId = state.fileDatasourceId
  draft.datasetKeyword = ''
  draft.fileKeyword = ''
  state.selectorVisible = true
}

const toggleDraftDataset = (datasetId: string) => {
  draft.datasetIds = draft.datasetIds[0] === datasetId ? [] : [datasetId]
}

const selectDraftFile = (datasourceId: string) => {
  draft.fileDatasourceId = draft.fileDatasourceId === datasourceId ? '' : datasourceId
}

const applySelection = async () => {
  const nextMode = draft.mode
  const nextDatasetIds = nextMode === 'dataset' ? [...draft.datasetIds] : state.datasetIds
  const nextFileDatasourceId = nextMode === 'file' ? draft.fileDatasourceId : state.fileDatasourceId

  const selectionChanged =
    state.queryMode !== nextMode ||
    !arraysEqual(state.datasetIds, nextDatasetIds) ||
    state.fileDatasourceId !== nextFileDatasourceId

  state.queryMode = nextMode
  state.datasetIds = nextDatasetIds
  state.fileDatasourceId = nextFileDatasourceId

  if (state.queryMode === 'dataset') {
    await loadDatasources()
  } else if (state.fileDatasourceId) {
    await loadFilePreview(state.fileDatasourceId)
  } else {
    clearFilePreview()
  }

  state.selectorVisible = false
  state.pageView = 'home'
  persistSelectionState()

  if (selectionChanged) {
    if (state.started) {
      appendCurrentConversationToArchive()
      clearRestoredSelectionChip()
      state.activeSessionId = ''
      state.activeScopeKey = ''
      writeActiveSessionId('')
      state.pendingQuestion = ''
      state.started = true
    } else {
      resetConversationState()
    }
  }

  if (hasValidSelection.value) {
    await focusQuestionInput()
  }
}

const previewDraftFile = async () => {
  if (!draft.fileDatasourceId) {
    return
  }

  state.queryMode = 'file'
  state.fileDatasourceId = draft.fileDatasourceId
  persistSelectionState()
  state.selectorVisible = false
  await loadFilePreview(state.fileDatasourceId)
  state.previewVisible = true
}

const removeSelectionChip = async (chip: SelectionChip) => {
  clearRestoredSelectionChip()
  if (chip.type === 'file') {
    state.fileDatasourceId = ''
    clearFilePreview()
  } else {
    state.datasetIds = state.datasetIds.filter(id => id !== chip.id)
    await loadDatasources()
  }

  resetConversationState()
  persistSelectionState()
}

const handleDatasetDatasourceChange = () => {
  persistSelectionState()
  clearRestoredSelectionChip()
  if (state.started) {
    appendCurrentConversationToArchive()
    state.activeSessionId = ''
    state.activeScopeKey = ''
    writeActiveSessionId('')
  } else {
    resetConversationState()
  }
}

const handleAssistantModeChange = async (mode: AssistantModeKey) => {
  if (state.assistantMode === mode) {
    return
  }
  state.assistantMode = mode
  state.pageView = 'home'
  resetConversationState({ clearQuestion: true })
  await focusQuestionInput()
}

const handleModelChange = (modelId: string) => {
  if (!modelOptions.value.some(item => item.id === modelId)) {
    return
  }
  state.modelId = modelId
  persistSelectionState()
}

const toggleFormalSidebar = () => {
  state.formalSidebarExpanded = true
}

const handleNavClick = (page: PageView) => {
  if (!state.formalSidebarExpanded) {
    state.formalSidebarExpanded = true
    if (page === 'history') {
      if (isFormalConversation.value) {
        state.historyVisible = true
      } else {
        state.pageView = 'history'
      }
    }
    return
  }

  if (page === 'history') {
    if (isFormalConversation.value) {
      state.historyVisible = true
    } else {
      state.pageView = 'history'
    }
    return
  }

  state.pageView = page
  if (page === 'home' && !state.started) {
    focusQuestionInput()
  }
}

const goToDatasource = () => {
  router.push('/data/datasource')
}

const buildEmbeddedCertificate = () => {
  if (state.queryMode === 'file') {
    return buildSqlBotCertificate({
      datasetIds: [],
      datasourceId: normalizeOptionalId(state.fileDatasourceId) || undefined,
      entryScene: 'file_query'
    })
  }

  return buildSqlBotCertificate({
    datasetIds: state.datasetIds,
    datasourceId: normalizeOptionalId(state.datasetDatasourceId) || undefined,
    entryScene: 'dataset_query'
  })
}

const startConversation = (questionOrSilent?: string | boolean, silentFlag = false) => {
  const presetQuestion = typeof questionOrSilent === 'string' ? questionOrSilent.trim() : ''
  const silent = typeof questionOrSilent === 'boolean' ? questionOrSilent : silentFlag

  if (state.assistantMode !== 'query') {
    if (!silent) {
      ElMessage.info(`${currentAssistantMode.value.label}能力正在建设中，当前版本先支持问数`)
    }
    return false
  }

  if (!presetQuestion && state.started && state.activeScopeKey === currentScopeKey.value) {
    return true
  }

  if (!canStart.value) {
    if (!silent) {
      ElMessage.warning(modelUnavailableHint.value || t('starbi.query_scope_invalid'))
    }
    return false
  }

  state.pageView = 'home'
  persistSelectionState()
  if (state.activeScopeKey !== currentScopeKey.value) {
    resetSQLBotConversation()
  }
  state.started = true
  state.activeScopeKey = currentScopeKey.value
  if (!sqlbotChat.value) {
    sqlbotChat.value = {
      brief: currentSelectionTitle.value,
      datasource: undefined,
      records: []
    }
  }
  if (presetQuestion) {
    void sendQuestionToSQLBot(presetQuestion).catch(error => {
      console.error('send SQLBot question failed', error)
      ElMessage.error(error instanceof Error ? error.message : '智能问数发送失败')
      sqlbotChatLoading.value = false
    })
  }
  return true
}

const resolveChartIntentType = (question: string): SQLBotChartDisplayType | '' => {
  const normalized = question.trim()
  if (!normalized) {
    return ''
  }

  const directChartOnlyMap: Array<[RegExp, SQLBotChartDisplayType]> = [
    [/^(表格|数据表)$/, 'table'],
    [/^(柱状图|柱图)$/, 'column'],
    [/^(条形图|条图)$/, 'bar'],
    [/^(折线图|线图)$/, 'line'],
    [/^(饼图)$/, 'pie']
  ]

  for (const [pattern, type] of directChartOnlyMap) {
    if (pattern.test(normalized)) {
      return type
    }
  }

  if (normalized.length > 24 || /(生成|统计|分析|查询|汇总|排行|趋势)/.test(normalized)) {
    return ''
  }

  if (!/(换成|切换|改成|改为|变成|显示|改看|看看|查看)/.test(normalized)) {
    return ''
  }

  if (/(表格|数据表)/.test(normalized)) {
    return 'table'
  }
  if (/(柱状图|柱图)/.test(normalized)) {
    return 'column'
  }
  if (/(条形图|条图)/.test(normalized)) {
    return 'bar'
  }
  if (/(折线图|线图)/.test(normalized)) {
    return 'line'
  }
  if (/(饼图)/.test(normalized)) {
    return 'pie'
  }
  return ''
}

const tryApplyLocalChartSwitch = async (question: string) => {
  const chartType = resolveChartIntentType(question)
  const targetRecord = latestSuccessfulChartRecord.value
  if (!chartType || !targetRecord) {
    return false
  }

  targetRecord.display = {
    ...(targetRecord.display || {}),
    chartType,
    showChartSwitcher: false
  }
  state.pendingQuestion = ''
  persistCurrentSQLBotSession()
  await queueLatestResultScroll()
  await focusQuestionInput()
  return true
}

const submitQuestion = async () => {
  const question = state.pendingQuestion.trim()
  if (await tryApplyLocalChartSwitch(question)) {
    return
  }
  const success = startConversation(question)
  if (success) {
    state.pendingQuestion = ''
    await scrollConversationToBottom()
  }
}

const handleRecommendedQuestion = (question: string) => {
  if (!hasValidSelection.value) {
    ElMessage.warning('请先选择数据集或数据文件')
    openSelector(state.queryMode)
    return
  }
  startConversation(question)
}

const handleCreateNewConversation = () => {
  state.pageView = 'home'
  state.historyVisible = false
  state.formalSidebarExpanded = true
  clearRestoredSelectionChip()
  resetConversationState({ clearQuestion: true })
  sqlbotAssistantToken.value = ''
  writeActiveSessionId('')
  focusQuestionInput()
}

const primeFollowUpQuestion = async (
  record: SQLBotChatRecord,
  mode: 'interpret' | 'followup' = 'followup'
) => {
  state.pendingQuestion =
    mode === 'interpret'
      ? '请基于上面的分析结果，提炼 3 个业务结论，并指出最值得关注的异常点。'
      : `基于“${record.question}”继续深入分析：`
  await focusQuestionInput()
}

const handleHistoryClick = async (entry: HistoryEntry) => {
  state.pageView = 'home'
  state.historyVisible = false
  state.formalSidebarExpanded = true
  state.activeSessionId = entry.id
  state.assistantMode = entry.assistantMode
  state.queryMode = entry.queryMode || state.queryMode
  state.datasetIds = entry.datasetIds.length
    ? [...entry.datasetIds].slice(0, 1)
    : state.datasetIds.slice(0, 1)
  state.datasetDatasourceId =
    normalizeOptionalId(entry.datasetDatasourceId) || state.datasetDatasourceId
  state.fileDatasourceId = normalizeOptionalId(entry.fileDatasourceId) || state.fileDatasourceId
  state.pendingQuestion = entry.lastQuestion
  resetConversationState({ keepSession: true })
  clearArchivedConversation()
  clearRestoredSelectionChip()

  await loadDatasources()
  if (state.fileDatasourceId) {
    await loadFilePreview(state.fileDatasourceId)
  } else {
    clearFilePreview()
  }

  persistSelectionState()

  const persistedSession = loadPersistedSQLBotSession(entry.id)
  const targetChatId = entry.backendChatId || Number(entry.id)
  if (targetChatId) {
    try {
      await ensureSQLBotAssistantToken()
      const detail = await getSQLBotChatWithData(buildSQLBotRequestContext(), targetChatId)
      sqlbotChat.value = normalizeSQLBotChatSession(detail)
      if (state.queryMode === 'dataset') {
        state.datasetDatasourceId =
          normalizeOptionalId(detail?.datasource) || state.datasetDatasourceId
      }
      if (!selectionChips.value.length && detail?.datasource_name) {
        restoredSelectionChip.value = {
          id: String(detail.datasource || targetChatId),
          label: String(detail.datasource_name),
          type: state.queryMode
        }
      }
      state.started = true
      state.activeScopeKey = currentScopeKey.value
      state.pendingQuestion = ''
      persistCurrentSQLBotSession()
      await queueLatestResultScroll()
      return
    } catch (error) {
      console.error('load SQLBot chat detail failed', error)
    }
  }

  if (persistedSession?.records?.length) {
    sqlbotChat.value = persistedSession
    state.started = true
    state.activeScopeKey = currentScopeKey.value
    state.pendingQuestion = ''
    await queueLatestResultScroll()
    return
  }

  await focusQuestionInput()
}

const openFilePreview = async () => {
  if (!state.fileDatasourceId) {
    ElMessage.warning('请先选择数据文件')
    openSelector('file')
    return
  }

  if (!filePreviewFields.value.length) {
    await loadFilePreview(state.fileDatasourceId)
  }

  state.previewVisible = true
}

const savePreviewAndStart = () => {
  state.previewVisible = false
  state.queryMode = 'file'
  persistSelectionState()
  startConversation()
}

const getFieldTypeBadgeLabel = (deType?: number) => {
  const label = getFieldTypeLabel(deType)
  const normalizedLabel = String(label).toLowerCase()

  if (
    normalizedLabel.includes('时间') ||
    normalizedLabel.includes('日期') ||
    normalizedLabel.includes('date')
  ) {
    return `Date. ${label}`
  }

  if (
    normalizedLabel.includes('数') ||
    normalizedLabel.includes('金额') ||
    normalizedLabel.includes('int') ||
    normalizedLabel.includes('float') ||
    normalizedLabel.includes('decimal')
  ) {
    return `Num. ${label}`
  }

  return `Str. ${label}`
}

const getFieldTypeLabel = (deType?: number) => {
  if (typeof deType !== 'number') {
    return t('commons.text')
  }
  return fieldTypeText[deType] || t('commons.text')
}

const formatTime = (value?: string | number) => {
  if (!value) {
    return '-'
  }
  const date = new Date(typeof value === 'number' ? value : String(value))
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

onMounted(async () => {
  state.formalSidebarExpanded = true
  await loadPageData()
  await bindConversationDockObserver()
})

watch(
  () => `${state.pageView}-${state.started}`,
  () => {
    void bindConversationDockObserver()
  },
  { flush: 'post' }
)

watch(
  () => sqlbotChat.value,
  () => {
    persistCurrentSQLBotSession()
  },
  { deep: true }
)

onBeforeUnmount(() => {
  sqlbotAbortController.value?.abort()
  sqlbotAnalysisControllerMap.forEach(controller => controller.abort())
  sqlbotAnalysisControllerMap.clear()
  conversationDockObserver?.disconnect()
  conversationDockObserver = null
})
</script>

<style lang="less" scoped>
.starbi-query-page {
  position: relative;
  width: 100%;
  min-height: calc(100vh - 56px);
  overflow: hidden;
  background: linear-gradient(180deg, #edf5ff 0%, #f5faff 88px, #f9fbff 220px, #fbfdff 100%);
  font-family: 'PingFang SC', 'Source Han Sans SC', 'Microsoft YaHei', sans-serif;
}

:deep(.starbi-svg-icon svg) {
  display: block;
  width: 1em;
  height: 1em;
}

.page-aurora {
  position: absolute;
  inset: 0;
  background: radial-gradient(
      circle at 12% 10%,
      rgba(68, 129, 255, 0.24) 0,
      rgba(68, 129, 255, 0) 26%
    ),
    radial-gradient(circle at 78% 8%, rgba(72, 184, 255, 0.2) 0, rgba(72, 184, 255, 0) 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.query-shell {
  --starbi-conversation-rail-width: 78px;
  --starbi-conversation-column-width: 900px;
  --starbi-conversation-gap: 24px;
  --starbi-conversation-dock-offset: 0px;
  position: relative;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  width: 100%;
  min-height: calc(100vh - 56px);
}

.query-shell.conversation-mode {
  grid-template-columns: 280px minmax(0, 1fr);
}

.query-shell.sidebar-compact {
  grid-template-columns: 280px minmax(0, 1fr);
}

.local-sidebar {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 12px 12px;
  border-right: 1px solid rgba(31, 35, 41, 0.06);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.68));
  backdrop-filter: blur(16px);
}

.local-sidebar.formal {
  width: 280px;
  transition: width 0.22s ease, padding 0.22s ease, background-color 0.22s ease;
}

.local-sidebar.formal.compact {
  width: 280px;
  padding: 14px 12px 12px;
  align-items: stretch;
}

.assistant-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(255, 255, 255, 0.95)),
    rgba(255, 255, 255, 0.95);
  box-shadow: 0 16px 32px rgba(44, 95, 189, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.92);
  overflow: hidden;
}

.assistant-card.compact {
  min-height: auto;
  width: 100%;
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.12), rgba(255, 255, 255, 0.95)),
    rgba(255, 255, 255, 0.95);
  box-shadow: 0 16px 32px rgba(44, 95, 189, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.assistant-card-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.assistant-card.compact .assistant-card-main {
  flex: initial;
  justify-content: flex-start;
  gap: 12px;
}

.assistant-card.compact .assistant-card-main > div:last-child {
  display: block;
}

.assistant-card.compact .sidebar-toggle-btn {
  display: none;
}

.assistant-card::after {
  content: '';
  position: absolute;
  top: -28px;
  right: -12px;
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.18), rgba(96, 165, 250, 0));
  pointer-events: none;
}

.assistant-card.compact::after {
  display: none;
}

.assistant-icon {
  display: flex;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #4c83ff 0%, #3b6dff 100%);
  box-shadow: 0 10px 20px rgba(61, 109, 255, 0.2);
}

.assistant-card.compact .assistant-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
}

.assistant-icon-inner {
  position: relative;
  z-index: 1;
  width: 20px;
  height: 20px;
  font-size: 20px;
  color: rgba(255, 255, 255, 0.96);
}

.sidebar-toggle-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.78);
  color: #5a6a85;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(210, 223, 245, 0.92);
}

.sidebar-toggle-btn:hover {
  color: #2f67ee;
  background: rgba(239, 246, 255, 0.96);
}

.sidebar-toggle-btn .starbi-svg-icon {
  width: 16px;
  height: 16px;
  font-size: 16px;
}

.assistant-title {
  color: #18243d;
  font-size: clamp(16px, 0.92vw, 18px);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.assistant-subtitle {
  margin-top: 4px;
  color: #72809a;
  font-size: clamp(13px, 0.76vw, 14px);
  line-height: 20px;
}

.sidebar-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.local-sidebar.formal.compact .sidebar-group {
  width: 100%;
  gap: 8px;
}

.sidebar-group-title {
  padding: 0 8px;
  color: #9aa4b4;
  font-size: 12px;
  font-weight: 600;
}

.local-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: #55657d;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: clamp(14px, 0.78vw, 15px);
}

.local-sidebar.formal.compact .local-nav-item {
  justify-content: center;
  min-height: 40px;
  width: 100%;
  padding: 0;
}

.local-nav-item:hover {
  background: rgba(61, 122, 255, 0.06);
}

.local-nav-item.active {
  background: linear-gradient(180deg, rgba(61, 122, 255, 0.14), rgba(61, 122, 255, 0.08));
  color: #3b6dff;
  font-weight: 600;
}

.local-nav-item.disabled {
  color: #98a3b5;
}

.local-nav-label {
  flex: 1;
  text-align: left;
}

.local-nav-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: currentColor;
  opacity: 0.88;
}

.nav-soon {
  color: #98a3b5;
  font-size: 11px;
}

.recent-section {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
  min-height: 0;
}

.recent-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.recent-title {
  color: #5f7090;
  font-size: clamp(13px, 0.74vw, 14px);
  font-weight: 600;
}

.recent-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: auto;
}

.recent-card {
  padding: 12px;
  border: 1px solid rgba(31, 35, 41, 0.06);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.74);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.recent-card:hover,
.recent-card.active {
  border-color: rgba(61, 122, 255, 0.18);
  background: rgba(61, 122, 255, 0.08);
}

.recent-card-title {
  color: #1d2940;
  font-size: clamp(14px, 0.8vw, 15px);
  line-height: 22px;
}

.recent-card-meta {
  margin-top: 4px;
  color: #4d6384;
  font-size: clamp(13px, 0.72vw, 14px);
}

.recent-card-time {
  margin-top: 8px;
  color: #697c9c;
  font-size: 12px;
}

.recent-empty {
  padding: 12px 8px;
  color: #5f7090;
  font-size: 12px;
}

.main-panel {
  padding: 14px 18px 22px;
  overflow: auto;
}

.main-panel.conversation-active {
  height: calc(100vh - 56px);
  overflow: hidden;
  padding: 12px 18px 0;
}

.home-stage {
  display: flex;
  min-height: calc(100vh - 96px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0 40px;
}

.home-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  max-width: 600px;
}

.home-hero-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 999px;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(22, 93, 255, 0.14), 0 16px 32px rgba(22, 93, 255, 0.08);
}

.home-hero-avatar.accent-blue {
  background: linear-gradient(180deg, #60a5fa 0%, #2563eb 100%);
}

.home-hero-avatar.accent-pink {
  background: linear-gradient(180deg, #f472b6 0%, #db2777 100%);
}

.home-hero-avatar.accent-green {
  background: linear-gradient(180deg, #4ade80 0%, #16a34a 100%);
}

.home-hero-avatar.accent-violet {
  background: linear-gradient(180deg, #c084fc 0%, #8b5cf6 100%);
}

.home-hero-avatar .starbi-svg-icon {
  width: 24px;
  height: 24px;
  font-size: 24px;
}

.home-hero-title {
  color: #165dff;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.home-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home-hero-subtitle {
  color: #4a6487;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 400;
}

.assistant-mode-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  width: 100%;
  max-width: 600px;
  margin-top: 32px;
  padding: 4px;
  border: 1px solid rgba(243, 244, 246, 0.96);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.assistant-mode-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 51px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #4e5969;
  font-size: 15px;
  font-weight: 400;
  cursor: pointer;
  transition: all 0.18s ease;
}

.assistant-mode-tab.active {
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.assistant-mode-tab.blue.active {
  color: #165dff;
  box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.92), 0 2px 8px rgba(15, 23, 42, 0.05);
}

.assistant-mode-tab.pink.active {
  color: #ec4899;
  box-shadow: inset 0 0 0 1px rgba(251, 207, 232, 0.96), 0 2px 8px rgba(15, 23, 42, 0.05);
}

.assistant-mode-tab.green.active {
  color: #16a34a;
  box-shadow: inset 0 0 0 1px rgba(187, 247, 208, 0.96), 0 2px 8px rgba(15, 23, 42, 0.05);
}

.assistant-mode-tab.violet.active {
  color: #8b5cf6;
  box-shadow: inset 0 0 0 1px rgba(221, 214, 254, 0.96), 0 2px 8px rgba(15, 23, 42, 0.05);
}

.assistant-mode-icon {
  width: 18px;
  height: 18px;
  font-size: 18px;
}

.entry-shell {
  width: 100%;
  margin-top: 36px;
}

.entry-shell.mode-query,
.entry-shell.mode-build,
.entry-shell.mode-search {
  max-width: 700px;
}

.entry-shell.mode-report {
  max-width: 700px;
}

.entry-card {
  overflow: hidden;
  border: 1px solid rgba(219, 234, 254, 0.94);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 255, 0.98));
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08), 0 6px 16px rgba(59, 130, 246, 0.06);
}

.entry-card.mode-report {
  border-color: rgba(251, 207, 232, 0.96);
  border-radius: 16px;
  box-shadow: 0 8px 10px rgba(236, 72, 153, 0.08), 0 18px 30px rgba(15, 23, 42, 0.08);
}

.entry-card.mode-build {
  border-color: rgba(187, 247, 208, 0.96);
}

.entry-card.mode-search {
  border-color: rgba(221, 214, 254, 0.96);
}

.entry-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 26px 8px;
}

.entry-card-status {
  min-width: 0;
  flex: 1;
}

.entry-card-status-main {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.entry-status-copy {
  color: #425b7e;
  font-size: 14px;
  line-height: 22px;
}

.entry-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 29px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.entry-status-pill.blue {
  background: rgba(239, 246, 255, 1);
  color: #165dff;
}

.entry-status-pill.pink {
  background: rgba(253, 242, 248, 1);
  color: #ec4899;
}

.entry-status-pill.green {
  background: rgba(240, 253, 244, 1);
  color: #16a34a;
}

.entry-status-pill.violet {
  background: rgba(245, 243, 255, 1);
  color: #8b5cf6;
}

.entry-status-icon {
  width: 14px;
  height: 14px;
  font-size: 14px;
}

.entry-select-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #165dff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.entry-select-link-icon {
  width: 14px;
  height: 14px;
  font-size: 14px;
}

.entry-selection-track {
  min-width: 0;
  padding: 10px 26px 0;
  cursor: pointer;
}

.entry-selection-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
}

.entry-selection-label {
  color: #5c7294;
  font-size: 12px;
}

.entry-selection-title {
  color: #1d2940;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.entry-selection-meta {
  min-width: 0;
  color: #5f7595;
  font-size: 12px;
  line-height: 18px;
}

.entry-selection-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.entry-selection-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  padding: 4px 12px;
  border: 1px solid rgba(191, 219, 254, 0.88);
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.96);
  color: #3370ff;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}

.entry-selection-chip > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-selection-chip.more {
  border-style: dashed;
  color: #646a73;
  background: #ffffff;
}

.entry-datasource-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 14px 26px 0;
}

.entry-datasource-label {
  color: #55657d;
  font-size: 12px;
}

.entry-input-shell {
  padding: 18px 26px 0;
}

.entry-input-shell.mode-report {
  padding: 18px 30px 0;
}

.entry-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  padding: 14px 26px 22px;
}

.entry-bottom-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
}

.entry-bottom-hint {
  color: #45607f;
  font-size: 12px;
  line-height: 20px;
}

.entry-bottom-right {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.ghost-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(229, 231, 235, 1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #4b5563;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.ghost-action-btn.subtle {
  background: #f8fafc;
  color: #64748b;
}

.ghost-action-btn:hover {
  border-color: rgba(191, 219, 254, 1);
  color: #3370ff;
  background: rgba(239, 246, 255, 0.9);
}

.ghost-action-btn.compact {
  height: 30px;
  padding: 0 12px;
}

.entry-bottom-right .composer-send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
}

.entry-bottom-right .composer-send-btn {
  box-shadow: 0 12px 24px rgba(51, 112, 255, 0.22);
}

.entry-bottom-right .composer-send-btn.blue {
  background: linear-gradient(135deg, #4d7cff 0%, #2563eb 100%);
}

.entry-bottom-right .composer-send-btn.pink {
  background: linear-gradient(135deg, #fb7185 0%, #ec4899 100%);
  box-shadow: 0 12px 24px rgba(236, 72, 153, 0.22);
}

.entry-bottom-right .composer-send-btn.green {
  background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%);
  box-shadow: 0 12px 24px rgba(22, 163, 74, 0.18);
}

.entry-bottom-right .composer-send-btn.violet {
  background: linear-gradient(135deg, #c084fc 0%, #8b5cf6 100%);
  box-shadow: 0 12px 24px rgba(139, 92, 246, 0.2);
}

.entry-mode-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  background: rgba(236, 244, 255, 0.96);
  color: #40638f;
  font-size: 12px;
}

.entry-model-empty {
  padding: 0 24px 18px;
  color: #5f7595;
  font-size: 12px;
  line-height: 18px;
}

.home-recommend-section {
  width: 100%;
  max-width: 760px;
  margin-top: 32px;
}

.home-recommend-section.report {
  max-width: 780px;
}

.home-recommend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}

.home-recommend-section.report .home-recommend-head {
  justify-content: flex-start;
}

.recommend-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.recommend-chip {
  max-width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(229, 231, 235, 0.96);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #475569;
  font-size: 13px;
  line-height: 20px;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.recommend-chip:hover {
  border-color: rgba(191, 219, 254, 1);
  color: #3370ff;
  background: rgba(239, 246, 255, 0.9);
}

.welcome-block {
  width: 100%;
  max-width: 768px;
  margin: 0 auto;
  text-align: center;
}

.welcome-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0 12px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.92);
  color: #2563eb;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.welcome-title {
  margin-top: 12px;
  color: #1e293b;
  font-size: 30px;
  font-weight: 700;
  font-family: 'PingFang SC', 'Source Han Sans SC', sans-serif;
  line-height: 1.2;
  text-align: center;
  letter-spacing: -0.02em;
}

.welcome-desc {
  max-width: 520px;
  margin: 8px auto 0;
  color: #64748b;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
}

.composer-board {
  position: relative;
  width: 100%;
  max-width: 768px;
  margin: 24px auto 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.composer-board::before {
  display: none;
}

.composer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.select-data-trigger {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid rgba(219, 228, 241, 0.96);
  border-radius: 10px;
  background: #f8fafc;
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.select-data-trigger:hover {
  transform: translateY(-1px);
  border-color: rgba(147, 197, 253, 0.92);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.08);
}

.select-data-icon {
  width: 16px;
  height: 16px;
  font-size: 16px;
}

.select-data-trigger.mini {
  padding: 7px 12px;
  border-radius: 10px;
  font-size: 13px;
}

.query-dialog {
  margin-top: 0;
  border: 1px solid rgba(226, 232, 240, 0.96);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.query-dialog-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px 12px;
}

.query-dialog-scope {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.query-dialog-scope-empty {
  color: #94a3b8;
  font-size: 14px;
  line-height: 22px;
}

.query-dialog-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px 6px;
}

.query-dialog-chip-list {
  display: flex;
  flex: 1;
  min-width: 80px;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0;
}

.query-dialog-chip {
  display: inline-flex;
  max-width: 240px;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: none;
  border-radius: 999px;
  background: rgba(77, 124, 255, 0.09);
  color: #2563eb;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
}

.query-dialog-chip > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.query-dialog-chip.overflow {
  border: 1px solid rgba(226, 232, 240, 0.96);
  background: #f8fafc;
  color: #64748b;
}

.query-dialog-right {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.model-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 8px;
  background: rgba(249, 250, 251, 0.96);
  color: #4b5563;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.model-switch-btn:hover {
  border-color: rgba(191, 219, 254, 0.92);
  background: rgba(239, 246, 255, 0.92);
  color: #2563eb;
}

.model-switch-icon {
  width: 12px;
  height: 12px;
  font-size: 12px;
  color: #5d79f5;
}

.model-switch-arrow {
  color: #6b84a6;
  font-size: 11px;
}

.datasource-bar.compact {
  margin: 0 20px 8px;
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 16px;
  background: rgba(248, 251, 255, 0.92);
}

.query-dialog-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 20px 20px;
  border: none;
  border-radius: 0;
  background: transparent;
}

.query-dialog-textarea-shell {
  padding: 18px 18px 12px;
  border: 1px solid rgba(220, 228, 241, 0.98);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94), 0 1px 2px rgba(15, 23, 42, 0.03);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.query-dialog-textarea-shell:focus-within {
  border-color: rgba(96, 165, 250, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.94), 0 0 0 4px rgba(96, 165, 250, 0.12);
}

.query-dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.query-dialog-footer-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.query-dialog-footer-hint {
  color: #8a96a8;
  font-size: 13px;
  line-height: 20px;
}

.query-dialog-footer-link {
  border: none;
  background: transparent;
  color: #4c7cff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.query-dialog-footer-link:hover {
  color: #2f64f2;
}

.query-dialog-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 0;
}

.datasource-inline-tip {
  color: #d97706;
  font-size: 12px;
  white-space: nowrap;
}

.query-dialog-actions .composer-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: transparent;
  box-shadow: none;
  color: #64748b;
}

.query-dialog-actions .composer-icon-btn.voice:hover {
  background: rgba(148, 163, 184, 0.12);
}

.query-dialog-actions .composer-send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  box-shadow: 0 12px 24px rgba(76, 124, 255, 0.2);
}

.scope-inline {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 4px 10px;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 12px;
  background: rgba(248, 251, 255, 0.85);
}

.scope-inline-label {
  color: #94a3b8;
  font-size: 12px;
  white-space: nowrap;
}

.scope-inline-title {
  min-width: 0;
  color: #162033;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scope-inline-meta {
  grid-column: 2 / 3;
  min-width: 0;
  color: #7b8aa3;
  font-size: 12px;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer-atmosphere {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-top: 16px;
  padding: 18px;
  border-radius: 20px;
  background: radial-gradient(
      circle at left top,
      rgba(96, 165, 250, 0.16),
      rgba(96, 165, 250, 0) 42%
    ),
    linear-gradient(135deg, rgba(239, 246, 255, 0.92), rgba(248, 250, 255, 0.92));
  overflow: hidden;
}

.composer-atmosphere-copy {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.composer-atmosphere-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.composer-atmosphere-badge .starbi-svg-icon {
  width: 12px;
  height: 12px;
  font-size: 12px;
}

.composer-atmosphere-title {
  margin-top: 10px;
  color: #18243d;
  font-size: 20px;
  font-weight: 700;
  line-height: 30px;
}

.composer-atmosphere-desc {
  margin-top: 8px;
  color: #6c7a90;
  font-size: 13px;
  line-height: 22px;
}

.composer-atmosphere-orb {
  position: relative;
  width: 120px;
  height: 96px;
  flex: 0 0 120px;
}

.orb-ring,
.orb-core {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
}

.orb-ring {
  border: 1px solid rgba(96, 165, 250, 0.26);
}

.orb-ring.ring-one {
  width: 96px;
  height: 96px;
}

.orb-ring.ring-two {
  width: 68px;
  height: 68px;
  border-color: rgba(59, 130, 246, 0.2);
}

.orb-core {
  width: 36px;
  height: 36px;
  background: radial-gradient(circle at 30% 30%, #9cd7ff, #3b82f6 70%, #2b5dff);
  box-shadow: 0 0 0 10px rgba(59, 130, 246, 0.08), 0 16px 30px rgba(37, 99, 235, 0.2);
}

.selection-empty-hint {
  margin-top: 8px;
  color: #97a3b4;
  font-size: 12px;
  line-height: 18px;
}

.selected-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.selected-chip-list.compact {
  margin-top: 8px;
}

.selected-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: none;
  border-radius: 10px;
  background: rgba(76, 124, 255, 0.08);
  color: #3f6eff;
  cursor: pointer;
}

.chip-close {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #6d7b90;
  font-size: 12px;
}

.datasource-bar {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.datasource-bar-label {
  color: #8794a8;
  font-size: 12px;
}

.composer-editor-shell {
  position: relative;
  margin-top: 16px;
  padding: 14px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(247, 250, 255, 0.98), rgba(255, 255, 255, 0.98)),
    rgba(255, 255, 255, 0.98);
  box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.72), 0 14px 34px rgba(37, 99, 235, 0.08);
  overflow: hidden;
}

.composer-editor-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at right top,
    rgba(191, 219, 254, 0.3),
    rgba(191, 219, 254, 0) 34%
  );
  pointer-events: none;
}

.composer-editor-shell > * {
  position: relative;
  z-index: 1;
}

.composer-editor-shell.simple {
  margin-top: 10px;
  padding: 12px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.92);
}

.composer-editor-shell.simple::before {
  display: none;
}

.composer-editor-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.composer-editor-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.composer-editor-label.simple {
  display: block;
  margin-bottom: 8px;
  color: #8b99ae;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}

.composer-editor-label-icon {
  width: 16px;
  height: 16px;
  font-size: 16px;
  color: #2563eb;
}

.composer-editor-keytip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.76);
  color: #7b8aa3;
  font-size: 12px;
}

.keytip-slash {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-weight: 700;
}

.composer-prompt-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(219, 234, 254, 0.92);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(239, 246, 255, 0.78));
}

.composer-prompt-avatar {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.96), rgba(79, 70, 229, 0.92));
  box-shadow: 0 12px 24px rgba(76, 124, 255, 0.18);
  color: #ffffff;
}

.composer-prompt-avatar .starbi-svg-icon {
  width: 18px;
  height: 18px;
  font-size: 18px;
}

.composer-prompt-copy {
  min-width: 0;
}

.composer-prompt-title {
  color: #18243d;
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
}

.composer-prompt-desc {
  margin-top: 4px;
  color: #72809a;
  font-size: 12px;
  line-height: 20px;
}

.composer-input-wrap {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: stretch;
  padding: 16px;
  border: 1px solid rgba(219, 234, 254, 0.94);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(241, 246, 255, 0.94));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.composer-input-wrap:focus-within {
  border-color: rgba(96, 165, 250, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92), 0 0 0 4px rgba(96, 165, 250, 0.12);
}

.composer-input-wrap.simple {
  min-height: 152px;
  padding: 14px;
  border-radius: 14px;
  border-color: rgba(226, 232, 240, 0.92);
  background: #ffffff;
  box-shadow: none;
}

.composer-input-main {
  min-width: 0;
}

.composer-input-leading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.composer-input-leading-icon {
  width: 16px;
  height: 16px;
  font-size: 16px;
  color: #4c7cff;
}

.composer-input-leading-text {
  color: #8b9ab0;
  font-size: 12px;
  line-height: 18px;
}

.composer-input-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.composer-input-tag {
  padding: 4px 10px;
  border: 1px solid rgba(191, 219, 254, 0.76);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #6b7c93;
  font-size: 12px;
}

.composer-actions {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
}

.composer-actions.simple {
  flex-direction: row;
  align-items: flex-end;
  justify-content: flex-end;
}

.composer-icon-btn,
.composer-send-btn {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.composer-icon-btn {
  background: rgba(255, 255, 255, 0.88);
  box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.9);
  color: #4c7cff;
}

.composer-send-btn {
  background: linear-gradient(135deg, #5f8fff 0%, #4c7cff 100%);
  box-shadow: 0 10px 20px rgba(76, 124, 255, 0.24);
  color: #ffffff;
}

.composer-icon-btn:hover,
.composer-send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.composer-send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.composer-attach {
  width: 18px;
  height: 18px;
  font-size: 18px;
}

.send-arrow {
  width: 16px;
  height: 16px;
  font-size: 16px;
}

.composer-shortcut-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.composer-shortcut-chip {
  max-width: 100%;
  padding: 7px 12px;
  border: 1px solid rgba(191, 219, 254, 0.7);
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.8);
  color: #2563eb;
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.composer-shortcut-chip:hover {
  border-color: rgba(96, 165, 250, 0.54);
  transform: translateY(-1px);
}

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}

.footer-tag-list {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f5f7fb;
  color: #8894a8;
  font-size: 12px;
}

.footer-tag.active {
  background: rgba(76, 124, 255, 0.12);
  color: #4c7cff;
}

.footer-link {
  border: none;
  background: transparent;
  color: #8c98ab;
  font-size: 12px;
  cursor: pointer;
}

.recommend-section {
  width: 100%;
  max-width: 768px;
  margin: 22px auto 0;
}

.recommend-section.simple {
  margin-top: 22px;
}

.recommend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recommend-head.simple {
  align-items: center;
}

.recommend-head-text {
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}

.switch-recommend-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: #8c98ab;
  cursor: pointer;
  transition: color 0.2s ease;
}

.switch-recommend-btn:hover {
  color: #4c7cff;
}

.switch-recommend-icon {
  transition: transform 0.35s ease;
}

.recommend-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.recommend-list.single-column {
  grid-template-columns: 1fr;
}

.recommend-list-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 84px;
  padding: 14px 16px;
  border: 1px solid rgba(229, 231, 235, 0.96);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  color: #4b596e;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.recommend-list-item:hover {
  border-color: rgba(191, 219, 254, 0.98);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.06);
  transform: translateY(-1px);
}

.recommend-list-item.compact {
  min-height: 56px;
  padding: 12px 16px;
}

.recommend-list-icon-wrap {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(239, 246, 255, 0.96);
}

.recommend-list-icon {
  width: 16px;
  height: 16px;
  font-size: 16px;
  color: #2563eb;
}

.recommend-list-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.recommend-list-title {
  min-width: 0;
  color: #334155;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
}

.recommend-list-meta {
  min-width: 0;
  overflow: hidden;
  color: #94a3b8;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommend-list-arrow {
  color: #cbd5e1;
  font-size: 20px;
}

.recommend-note {
  margin-top: 12px;
  color: #9aa4b4;
  font-size: 12px;
}

.report-template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.mode-template-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  margin-top: 24px;
}

.report-template-card {
  padding: 24px;
  border: 1px solid rgba(243, 244, 246, 1);
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04), 0 8px 18px rgba(15, 23, 42, 0.04);
  transition: all 0.18s ease;
}

.report-template-card:hover {
  border-color: rgba(251, 207, 232, 0.98);
  box-shadow: 0 10px 22px rgba(236, 72, 153, 0.08);
  transform: translateY(-1px);
}

.mode-template-card {
  padding: 24px;
  border: 1px solid rgba(243, 244, 246, 1);
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04), 0 8px 18px rgba(15, 23, 42, 0.04);
  transition: all 0.18s ease;
}

.mode-template-card.build:hover {
  border-color: rgba(187, 247, 208, 0.98);
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.08);
  transform: translateY(-1px);
}

.mode-template-card.search:hover {
  border-color: rgba(221, 214, 254, 0.98);
  box-shadow: 0 10px 22px rgba(139, 92, 246, 0.08);
  transform: translateY(-1px);
}

.mode-template-kicker {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(248, 250, 252, 1);
  color: #7c8798;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.report-template-card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.report-template-icon {
  width: 20px;
  height: 20px;
  font-size: 20px;
  color: #ec4899;
}

.report-template-title {
  color: #1d1f23;
  font-size: 18px;
  font-weight: 600;
}

.report-template-desc {
  margin-top: 12px;
  color: #86909c;
  font-size: 14px;
  line-height: 22px;
}

.tips-section {
  width: 100%;
  max-width: 768px;
  margin-top: 34px;
}

.tips-title {
  color: #526178;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
}

.tips-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.tip-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.tip-card.blue {
  background: rgba(239, 246, 255, 0.78);
}

.tip-card.indigo {
  background: rgba(238, 242, 255, 0.74);
}

.tip-card.violet {
  background: rgba(250, 245, 255, 0.76);
}

.tip-card-title {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: #1d2940;
}

.tip-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tip-card-icon {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border-radius: 10px;
  color: #2563eb;
}

.tip-card.blue .tip-card-icon {
  background: rgba(59, 130, 246, 0.12);
}

.tip-card.indigo .tip-card-icon {
  background: rgba(79, 70, 229, 0.12);
  color: #4f46e5;
}

.tip-card.violet .tip-card-icon {
  background: rgba(147, 51, 234, 0.12);
  color: #9333ea;
}

.tip-card-desc {
  margin-top: 8px;
  color: #6d7b90;
  font-size: 12px;
  line-height: 20px;
}

.conversation-stage,
.content-page {
  min-height: calc(100vh - 78px);
}

.conversation-stage {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  padding-top: 28px;
  overflow: hidden;
}

.conversation-shell {
  display: flex;
  width: 100%;
  max-width: var(--starbi-conversation-column-width);
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 24px;
  margin: 0 auto;
}

.conversation-stream-surface {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 4px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: hidden;
}

.conversation-selection-inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.conversation-inline-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  padding: 3px 10px;
  border: 1px solid rgba(191, 219, 254, 0.84);
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.96);
  color: #3370ff;
  font-size: 12px;
  cursor: pointer;
}

.conversation-inline-chip.large {
  max-width: 240px;
  min-height: 28px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 13px;
}

.conversation-inline-chip > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-inline-chip.more {
  border-style: dashed;
  background: #ffffff;
  color: #64748b;
}

.conversation-message-wrap {
  min-height: 0;
  height: 100%;
  background: transparent;
}

.conversation-message-scroll {
  height: 100%;
  min-height: 0;
  max-height: none;
  padding: 8px var(--starbi-conversation-dock-offset) 8px;
  overflow: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable both-edges;
  scroll-padding-top: 8px;
  scroll-padding-bottom: 8px;
}

.conversation-message-list {
  display: flex;
  flex-direction: column;
  gap: var(--starbi-conversation-gap);
  width: min(100%, var(--starbi-conversation-column-width));
  margin: 0 auto;
  padding-bottom: 18px;
}

.conversation-message-row {
  display: flex;
  width: 100%;
}

.conversation-message-row.user {
  justify-content: flex-end;
  position: relative;
}

.conversation-message-row.assistant {
  justify-content: flex-start;
  position: relative;
}

.conversation-user-stack {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  width: 100%;
}

.conversation-user-bubble {
  max-width: min(82%, 900px);
  margin-left: auto;
  margin-right: 0;
  padding: 18px 22px;
  border: 1px solid rgba(142, 184, 255, 0.68);
  border-radius: 24px 24px 8px 24px;
  background: linear-gradient(180deg, rgba(230, 240, 255, 0.98), rgba(214, 230, 255, 0.96));
  color: #27415f;
  font-size: clamp(15px, 0.86vw, 17px);
  line-height: 1.8;
  box-shadow: 0 14px 32px rgba(42, 102, 255, 0.1);
}

.conversation-ai-stack {
  width: 100%;
  max-width: none;
}

.conversation-message-row.user::before,
.conversation-message-row.user::after,
.conversation-message-row.assistant::before,
.conversation-message-row.assistant::after,
.conversation-user-stack::before,
.conversation-user-stack::after,
.conversation-ai-stack::before,
.conversation-ai-stack::after {
  display: none !important;
  content: none !important;
}

.conversation-empty-state {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
}

.conversation-empty-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(239, 246, 255, 1);
  color: #2563eb;
  font-size: 13px;
  font-weight: 600;
}

.conversation-empty-title {
  color: #1d2940;
  font-size: clamp(22px, 1.2vw, 26px);
  font-weight: 600;
}

.conversation-empty-copy {
  max-width: 520px;
  color: #4f627f;
  font-size: clamp(15px, 0.8vw, 16px);
  line-height: 26px;
}

.conversation-bottom-dock {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  width: 100%;
  margin-top: auto;
  padding: 0 var(--starbi-conversation-dock-offset) 14px;
  background: transparent;
}

.conversation-recommend-strip {
  width: min(100%, var(--starbi-conversation-column-width));
  padding: 0 4px;
}

.conversation-recommend-kicker {
  margin-bottom: 8px;
  color: #406289;
  font-size: clamp(12px, 0.72vw, 13px);
  line-height: 18px;
  letter-spacing: 0.01em;
}

.conversation-recommend-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0 2px 4px;
  scrollbar-width: thin;
}

.conversation-recommend-chip {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 16px;
  border: 1px solid rgba(189, 213, 247, 0.96);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 249, 255, 0.96));
  color: #31547e;
  font-size: clamp(13px, 0.74vw, 14px);
  line-height: 20px;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease,
    background-color 0.18s ease;
}

.conversation-recommend-chip:hover {
  border-color: rgba(71, 133, 255, 0.72);
  color: #1f58cf;
  background: rgba(247, 250, 255, 0.98);
  box-shadow: 0 10px 22px rgba(47, 103, 238, 0.12);
}

.conversation-composer-card {
  flex-shrink: 0;
  width: min(100%, var(--starbi-conversation-column-width));
  border: 1px solid rgba(187, 214, 250, 0.9);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(243, 248, 255, 0.98));
  box-shadow: 0 16px 34px rgba(23, 74, 171, 0.08);
  padding: 18px 20px 18px;
  margin-top: -2px;
}

.conversation-composer-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
}

.conversation-composer-scope {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
}

.conversation-composer-head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.conversation-select-btn {
  height: 34px;
  padding: 0 14px;
  border: 1px solid rgba(191, 219, 254, 0.88);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #165dff;
  font-size: clamp(13px, 0.72vw, 14px);
  font-weight: 600;
  cursor: pointer;
}

.conversation-select-btn.subtle {
  border-color: rgba(226, 232, 240, 0.96);
  color: #5c6880;
  background: rgba(248, 250, 252, 0.96);
}

.conversation-selection-inline.compact {
  gap: 6px;
}

.conversation-selection-empty {
  color: #4f627f;
  font-size: clamp(14px, 0.74vw, 15px);
  line-height: 20px;
}

.conversation-selection-empty.compact {
  font-size: clamp(13px, 0.7vw, 14px);
  line-height: 20px;
}

.conversation-datasource-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding-top: 6px;
}

.conversation-datasource-label {
  color: #556987;
  font-size: 12px;
}

.conversation-datasource-row.compact {
  margin-top: 4px;
  padding-top: 0;
}

.conversation-composer-input-shell {
  margin-top: 8px;
  padding: 16px 18px 10px;
  border: 1px solid rgba(192, 215, 248, 0.94);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.98), 0 8px 18px rgba(42, 102, 255, 0.06);
}

.conversation-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}

.conversation-composer-footer-left,
.conversation-composer-footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.conversation-model-switch {
  height: 34px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.98), rgba(240, 246, 255, 0.98));
}

.conversation-model-empty {
  margin-top: 4px;
  color: #556987;
  font-size: 13px;
  line-height: 18px;
}

.content-page-title {
  color: #1d2940;
  font-size: 28px;
  font-weight: 700;
}

.content-page-desc {
  max-width: 720px;
  margin-top: 8px;
  color: #4c607f;
  font-size: clamp(15px, 0.82vw, 16px);
  line-height: 26px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 24px;
}

.history-grid-card {
  padding: 18px;
  border: 1px solid rgba(31, 35, 41, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-grid-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgba(25, 41, 78, 0.05);
}

.history-grid-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.history-grid-title {
  color: #1d2940;
  font-size: clamp(16px, 0.88vw, 17px);
  font-weight: 600;
  line-height: 22px;
}

.history-grid-time {
  color: #677a99;
  font-size: 12px;
}

.history-grid-selection {
  margin-top: 10px;
  color: #4c7cff;
  font-size: 14px;
}

.history-grid-desc {
  margin-top: 8px;
  color: #4d6283;
  font-size: 14px;
  line-height: 22px;
}

.history-shell {
  background: #f9fbff;
}

.history-drawer-list {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  overflow: auto;
}

.history-drawer-card {
  padding: 14px;
  border: 1px solid rgba(219, 228, 241, 0.92);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.history-drawer-card:hover,
.history-drawer-card.active {
  border-color: rgba(96, 165, 250, 0.42);
  box-shadow: 0 12px 24px rgba(44, 95, 189, 0.08);
  transform: translateY(-1px);
}

.history-drawer-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.history-drawer-card-title {
  color: #1d2940;
  font-size: 15px;
  font-weight: 600;
  line-height: 21px;
}

.history-drawer-card-time {
  color: #6b7d9b;
  font-size: 11px;
  white-space: nowrap;
}

.history-drawer-card-selection {
  margin-top: 8px;
  color: #3771ff;
  font-size: 13px;
}

.history-drawer-card-desc {
  margin-top: 6px;
  color: #506381;
  font-size: 13px;
  line-height: 21px;
}

.history-drawer-empty {
  padding: 28px 20px;
  color: #8b99ae;
  font-size: 13px;
  text-align: center;
}

.placeholder-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
}

.drawer-shell {
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 0;
  background: #ffffff;
}

.drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 12px;
  border-bottom: 1px solid rgba(241, 245, 249, 0.96);
}

.drawer-title-block {
  min-width: 0;
}

.drawer-title {
  color: #1e293b;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.drawer-subtitle {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 20px;
}

.drawer-tabs,
.preview-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-tabs {
  margin-top: 0;
  gap: 0;
  padding: 0 16px;
  border-bottom: 1px solid rgba(241, 245, 249, 0.96);
}

.drawer-tab,
.preview-tab {
  padding: 10px 16px;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: #6d7b90;
  font-size: 14px;
  cursor: pointer;
}

.drawer-tab.active,
.preview-tab.active {
  border-bottom-color: #2563eb;
  background: transparent;
  color: #2563eb;
  font-weight: 600;
}

.dialog-close {
  border: none;
  background: transparent;
  color: #6d7b90;
  font-size: 24px;
  cursor: pointer;
}

.drawer-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-top: 0;
  padding: 16px;
}

.drawer-card-list {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
  margin-top: 0;
  padding: 0 16px 16px;
  overflow: auto;
}

.dataset-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px;
  border: 1px solid rgba(229, 231, 235, 0.96);
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dataset-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.06);
}

.dataset-card.active {
  border-color: rgba(147, 197, 253, 0.98);
  background: rgba(239, 246, 255, 0.92);
}

.dataset-card-main {
  min-width: 0;
  flex: 1;
}

.dataset-card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dataset-card-icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(76, 124, 255, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.72);
  color: #2563eb;
}

.dataset-card-icon.blue {
  background: rgba(219, 234, 254, 1);
}

.dataset-card-icon.indigo {
  background: rgba(224, 231, 255, 1);
}

.dataset-card-icon.cyan {
  background: rgba(207, 250, 254, 1);
}

.dataset-card-icon.orange {
  background: rgba(255, 237, 213, 1);
}

.dataset-card-icon.violet {
  background: rgba(243, 232, 255, 1);
}

.dataset-card-icon.file {
  background: rgba(64, 158, 255, 0.12);
}

.dataset-card-icon .starbi-svg-icon {
  width: 18px;
  height: 18px;
  font-size: 18px;
}

.dataset-card-title-wrap {
  min-width: 0;
  flex: 1;
}

.dataset-card-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dataset-card-badge {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(76, 124, 255, 0.12);
  color: #4c7cff;
  font-size: 11px;
  font-weight: 600;
}

.dataset-card-badge.success {
  background: rgba(46, 156, 84, 0.12);
  color: #2e9c54;
}

.dataset-card-title {
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.dataset-card-path {
  margin-top: 6px;
  color: #8d98aa;
  font-size: 12px;
  line-height: 18px;
}

.dataset-card-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.dataset-card-chip {
  padding: 2px 8px;
  border: 1px solid rgba(226, 232, 240, 0.86);
  border-radius: 999px;
  background: rgba(248, 250, 252, 0.95);
  color: #64748b;
  font-size: 12px;
}

.dataset-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
}

.dataset-card-stat {
  color: #94a3b8;
  font-size: 12px;
  line-height: 18px;
}

.dataset-card-check {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #4c7cff;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
}

.file-empty-state {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.file-empty-icon {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(239, 246, 255, 0.92);
  box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.72);
}

.file-empty-icon-inner {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 28px;
  height: 28px;
  font-size: 28px;
  color: #3b82f6;
  transform: translate(-50%, -50%);
}

.file-empty-tag {
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(76, 124, 255, 0.08);
  color: #4c7cff;
  font-size: 12px;
}

.file-empty-text {
  color: #6d7b90;
  font-size: 14px;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid rgba(241, 245, 249, 0.96);
}

.preview-shell {
  padding-top: 0;
}

.preview-head {
  margin-bottom: 0;
}

.preview-breadcrumb-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-breadcrumb {
  color: #6d7b90;
  font-size: 13px;
}

.preview-steps {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 4px;
}

.preview-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-size: 13px;
}

.preview-step.done {
  color: #16a34a;
}

.preview-step.active {
  color: #2563eb;
  font-weight: 600;
}

.preview-step-marker {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #e5e7eb;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
}

.preview-step.done .preview-step-marker {
  background: #dcfce7;
}

.preview-step.active .preview-step-marker {
  background: #2563eb;
  color: #ffffff;
}

.preview-step-line {
  flex: 1;
  height: 1px;
  background: #bfdbfe;
}

.preview-info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 12px 16px;
  padding: 16px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
}

.preview-info-icon {
  display: inline-flex;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.22)),
    rgba(255, 255, 255, 0.96);
  box-shadow: inset 0 0 0 1px rgba(191, 219, 254, 0.78);
  color: #2563eb;
}

.preview-info-name {
  color: #1d2940;
  font-size: 14px;
  font-weight: 700;
  line-height: 22px;
}

.preview-info-time {
  margin-top: 4px;
  color: #94a3b8;
  font-size: 12px;
}

.preview-card {
  display: flex;
  flex: 1;
  min-height: 0;
  margin: 0 16px;
  flex-direction: column;
  border: 1px solid rgba(229, 231, 235, 0.96);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  overflow: hidden;
}

.preview-status {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(219, 234, 254, 0.96);
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}

.preview-tabs {
  gap: 0;
  padding: 12px 16px 0;
  border-bottom: 1px solid rgba(31, 35, 41, 0.06);
}

.preview-summary-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(249, 250, 251, 0.96);
  color: #64748b;
  font-size: 12px;
  border-bottom: 1px solid rgba(31, 35, 41, 0.06);
}

.preview-summary-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.preview-summary-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #2563eb;
}

.preview-summary-dot.text {
  background: #2563eb;
}

.preview-summary-dot.date {
  background: #3b82f6;
}

.preview-summary-dot.number {
  background: #16a34a;
}

.preview-summary-dot.total {
  background: #64748b;
}

.preview-body {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow: auto;
}

.preview-table {
  width: 100%;
}

.preview-field-list {
  border: 1px solid rgba(31, 35, 41, 0.08);
  border-radius: 14px;
  overflow: hidden;
}

.preview-field-head,
.preview-field-row {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 12px;
  padding: 13px 16px;
}

.preview-field-head {
  background: #f6f8fc;
  color: #55657d;
  font-size: 13px;
  font-weight: 600;
}

.preview-field-row {
  border-top: 1px solid rgba(31, 35, 41, 0.06);
  color: #1d2940;
  font-size: 13px;
}

.preview-field-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: end;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(239, 246, 255, 0.96);
  color: #2563eb;
  font-size: 12px;
}

.preview-field-type-icon {
  width: 14px;
  height: 14px;
  font-size: 14px;
}

.preview-footer {
  padding: 16px;
}

:deep(.composer-input-wrap .ed-textarea__inner),
:deep(.composer-input-wrap .el-textarea__inner) {
  min-height: 104px !important;
  padding: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  color: #1e293b;
  font-size: 15px;
  line-height: 26px;
}

:deep(.composer-input-wrap.simple .ed-textarea__inner),
:deep(.composer-input-wrap.simple .el-textarea__inner) {
  min-height: 132px !important;
}

:deep(.entry-input-shell .ed-textarea__inner),
:deep(.entry-input-shell .el-textarea__inner) {
  min-height: 132px !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: #1f2329 !important;
  font-size: 16px !important;
  line-height: 28px !important;
}

:deep(.entry-input-shell.mode-report .ed-textarea__inner),
:deep(.entry-input-shell.mode-report .el-textarea__inner) {
  min-height: 160px !important;
}

:deep(.conversation-composer-input-shell .ed-textarea__inner),
:deep(.conversation-composer-input-shell .el-textarea__inner) {
  min-height: 96px !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: #1f2329 !important;
  font-size: clamp(16px, 0.88vw, 18px) !important;
  line-height: 30px !important;
}

:deep(.query-dialog-input .ed-textarea__inner),
:deep(.query-dialog-input .el-textarea__inner) {
  min-height: 208px !important;
  padding: 0;
  border: none;
  box-shadow: none;
  background: transparent;
  color: #1e293b;
  font-size: 15px;
  line-height: 26px;
}

:deep(.composer-input-wrap .ed-textarea__inner::placeholder),
:deep(.composer-input-wrap .el-textarea__inner::placeholder) {
  color: #6a84a8;
}

:deep(.entry-input-shell .ed-textarea__inner::placeholder),
:deep(.entry-input-shell .el-textarea__inner::placeholder) {
  color: #6a84a8;
}

:deep(.conversation-composer-input-shell .ed-textarea__inner::placeholder),
:deep(.conversation-composer-input-shell .el-textarea__inner::placeholder) {
  color: #6a84a8;
}

:deep(.query-dialog-input .ed-textarea__inner::placeholder),
:deep(.query-dialog-input .el-textarea__inner::placeholder) {
  color: #6a84a8;
}

:deep(.drawer-toolbar .el-input__wrapper) {
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.92);
}

:deep(.datasource-bar .el-select) {
  width: 100%;
}

:deep(.preview-table .el-table__header-wrapper th) {
  background: #f8fafc;
}

@media (max-width: 1280px) {
  .query-shell {
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .history-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 960px) {
  .query-shell {
    grid-template-columns: 1fr;
  }

  .local-sidebar {
    border-right: none;
    border-bottom: 1px solid rgba(31, 35, 41, 0.06);
  }

  .main-panel {
    padding: 18px 16px 28px;
  }

  .home-stage {
    padding-top: 32px;
  }

  .home-hero {
    flex-direction: column;
    text-align: center;
  }

  .home-hero-title {
    font-size: 28px;
  }

  .assistant-mode-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .entry-card-top,
  .drawer-toolbar {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .entry-card-bottom,
  .home-recommend-head {
    flex-direction: column;
    align-items: stretch;
  }

  .entry-scope-divider {
    display: none;
  }

  .entry-selection-list {
    width: 100%;
  }

  .report-template-grid,
  .mode-template-grid,
  .recommend-list {
    grid-template-columns: 1fr;
  }

  .entry-datasource-row,
  .datasource-bar,
  .conversation-datasource-row {
    grid-template-columns: 1fr;
  }

  .entry-top-actions,
  .entry-bottom-right,
  .conversation-composer-footer-right {
    justify-content: flex-start;
  }

  .conversation-shell {
    gap: 10px;
    max-width: 100%;
  }

  .conversation-stream-surface {
    border-radius: 22px;
  }

  .conversation-bottom-dock {
    position: static;
    margin-top: 10px;
    padding: 0;
    background: transparent;
  }

  .conversation-recommend-strip,
  .conversation-composer-card {
    width: 100%;
  }

  .conversation-message-wrap.calicat,
  .conversation-message-scroll {
    min-height: clamp(280px, calc(100vh - 620px), 420px);
    max-height: clamp(280px, calc(100vh - 620px), 420px);
    padding-bottom: 20px;
  }

  .conversation-composer-card {
    padding: 14px;
  }

  .conversation-composer-top,
  .conversation-composer-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .conversation-message-row.assistant {
    gap: 10px;
  }

  .conversation-user-bubble {
    max-width: min(78%, 100%);
  }

  .recommend-chip-list {
    gap: 8px;
  }

  .preview-breadcrumb-wrap {
    display: flex;
    flex-wrap: wrap;
  }

  .composer-input-wrap {
    grid-template-columns: 1fr;
  }
}
</style>

<style lang="less">
.starbi-selector-mask,
.starbi-preview-mask {
  background: rgba(8, 17, 35, 0.14);
  backdrop-filter: blur(2px);
}

.starbi-selector-drawer,
.starbi-preview-drawer,
.starbi-history-drawer {
  .ed-drawer__header {
    display: none;
  }

  .ed-drawer__body {
    padding: 0;
  }
}

.entry-input-shell .ed-textarea__inner,
.entry-input-shell .el-textarea__inner {
  min-height: 132px !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: #1f2329 !important;
  font-size: 16px !important;
  line-height: 28px !important;
}

.entry-input-shell.mode-report .ed-textarea__inner,
.entry-input-shell.mode-report .el-textarea__inner {
  min-height: 160px !important;
}

.entry-input-shell .ed-textarea__inner:focus,
.entry-input-shell .el-textarea__inner:focus {
  box-shadow: none !important;
}

.query-dialog-input .ed-textarea__inner,
.query-dialog-input .el-textarea__inner {
  min-height: 208px !important;
  padding: 0 !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: #1e293b !important;
  font-size: 15px !important;
  line-height: 26px !important;
}

.query-dialog-input .ed-textarea__inner:focus,
.query-dialog-input .el-textarea__inner:focus {
  box-shadow: none !important;
}

.model-switch-menu {
  min-width: 180px;
}

.model-switch-menu .el-dropdown-menu__item,
.model-switch-menu .ed-dropdown-menu__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.model-switch-menu .el-dropdown-menu__item.active,
.model-switch-menu .ed-dropdown-menu__item.active {
  color: #2f64f2;
  background: rgba(59, 130, 246, 0.1);
}

.model-option-badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
  font-size: 11px;
}
</style>
