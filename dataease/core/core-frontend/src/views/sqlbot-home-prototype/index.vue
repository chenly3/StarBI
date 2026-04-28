<script setup lang="ts">
type TopNav = {
  label: string
  active?: boolean
}

type SideNav = {
  key: string
  label: string
  icon: 'home' | 'report' | 'build' | 'history'
  active?: boolean
}

type ThemeTab = {
  label: string
  active?: boolean
}

type SourceTab = {
  label: string
  active?: boolean
  tone?: 'trial'
}

type DatasetCard = {
  title: string
  tags: string[]
}

type QuestionChip = {
  label: string
}

const topNavs: TopNav[] = [
  { label: '工作台' },
  { label: '智能问数', active: true },
  { label: '仪表板' },
  { label: '数据大屏' },
  { label: '数据准备' }
]

const sideNavs: SideNav[] = [
  { key: 'qa', label: '小星问数', icon: 'home', active: true },
  { key: 'report', label: '小星报告', icon: 'report' },
  { key: 'build', label: '小星搭建', icon: 'build' },
  { key: 'history', label: '历史对话', icon: 'history' }
]

const themeTabs: ThemeTab[] = [
  { label: '全部', active: true },
  { label: '销售分析' },
  { label: '门店分析' },
  { label: '车联网分析' }
]

const sourceTabs: SourceTab[] = [
  { label: '数据集', active: true },
  { label: '数据文件' },
  { label: '试用', tone: 'trial' }
]

const datasetCards: DatasetCard[] = [
  { title: '销售数据集_样例', tags: ['订单数量', '订单金额', '折扣点'] },
  { title: '车联网_持续时间分析', tags: ['持续时间（秒）', '开始时间'] },
  { title: '车联网_功能使用次数分析', tags: ['季度', '功能使用次数', '日期_统计'] },
  { title: '用户行为分析数据集', tags: ['用户ID', '访问时间', '停留时长'] },
  { title: '门店_销售数据分析', tags: ['门店名称', '销售额', '毛利'] }
]

const historyItems = [
  { title: '各店铺订单费用占比', time: '2026-04-15 09:56', primary: true },
  { title: '茶饮原料费用', time: '2026-04-14 16:32' },
  { title: '月度销售趋势分析', time: '2026-04-13 14:17' }
]

const questionChips: QuestionChip[] = [
  { label: '本月销售额环比增长多少？' },
  { label: '各区域用户消费TOP10' },
  { label: '库存周转率分析' },
  { label: '用户留存率趋势' }
]
</script>

<template>
  <div class="sqlbot-home-prototype-page">
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">
          <span class="brand-bar bar-1"></span>
          <span class="brand-bar bar-2"></span>
          <span class="brand-bar bar-3"></span>
        </span>
        <span class="brand-text">StarBI</span>
      </div>

      <nav class="topbar-nav" aria-label="主导航">
        <button
          v-for="item in topNavs"
          :key="item.label"
          class="topbar-nav-item"
          :class="{ 'is-active': item.active }"
          type="button"
        >
          {{ item.label }}
        </button>
      </nav>

      <div class="topbar-right">
        <button class="icon-button is-download" type="button" aria-label="下载"></button>
        <button class="icon-button is-bell" type="button" aria-label="通知"></button>
        <button class="user-button" type="button">
          <span class="user-avatar">管</span>
          <span class="user-name">管理员</span>
          <span class="user-caret"></span>
        </button>
      </div>
    </header>

    <div class="page-body">
      <aside class="sidebar">
        <section class="product-entry">
          <div class="product-entry-card">
            <span class="assistant-icon">
              <span class="assistant-head"></span>
            </span>
            <div class="product-copy">
              <h2>智能问数</h2>
              <p>数据分析助手</p>
              <span class="new-badge">新</span>
            </div>
          </div>
        </section>

        <section class="side-menu">
          <button
            v-for="item in sideNavs"
            :key="item.key"
            class="side-menu-item"
            :class="{ 'is-active': item.active }"
            type="button"
          >
            <span class="menu-icon" :class="`icon-${item.icon}`"></span>
            <span class="menu-label">{{ item.label }}</span>
          </button>
        </section>

        <section class="history-panel">
          <h3>最近问数</h3>
          <div class="history-list">
            <article
              v-for="item in historyItems"
              :key="item.title"
              class="history-card"
              :class="{ 'is-primary': item.primary }"
            >
              <h4>{{ item.title }}</h4>
              <p>{{ item.time }}</p>
            </article>
          </div>
        </section>
      </aside>

      <main class="main-area">
        <section class="hero-block">
          <div class="hero-icon">
            <span class="hero-lamp"></span>
          </div>
          <h1>今天想分析什么？</h1>
          <p>直接提问，或者选择数据源后开始查询</p>
        </section>

        <section class="dataset-section">
          <div class="dataset-header-row">
            <div class="theme-tabs">
              <button
                v-for="item in themeTabs"
                :key="item.label"
                class="theme-tab"
                :class="{ 'is-active': item.active }"
                type="button"
              >
                {{ item.label }}
              </button>
            </div>

            <div class="source-tabs">
              <button
                v-for="item in sourceTabs"
                :key="item.label"
                class="source-tab"
                :class="{
                  'is-active': item.active,
                  'is-trial': item.tone === 'trial'
                }"
                type="button"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div class="dataset-grid">
            <article v-for="item in datasetCards" :key="item.title" class="dataset-card">
              <h3>{{ item.title }}</h3>
              <div class="dataset-tags">
                <span v-for="tag in item.tags" :key="tag" class="dataset-tag">{{ tag }}</span>
              </div>
            </article>

            <article class="dataset-card dataset-card-more">
              <strong>查看全部可用数据</strong>
            </article>
          </div>
        </section>

        <section class="ask-card">
          <div class="ask-card-header">
            <div class="ask-status">
              <span class="ask-status-icon"></span>
              <span>问数</span>
            </div>
            <button class="choose-data-button" type="button">
              <span>选择数据</span>
              <span class="choose-arrow"></span>
            </button>
          </div>

          <p class="ask-hint">直接提问，或点击「选择数据」后开始分析</p>

          <div class="ask-bottom">
            <div class="ask-source">
              <button class="ask-select" type="button">
                <span>test</span>
                <span class="select-caret"></span>
              </button>
              <span class="ask-tag">数据集问数</span>
            </div>

            <button class="send-button" type="button" aria-label="发送">
              <span class="send-arrow"></span>
            </button>
          </div>
        </section>

        <section class="questions-section">
          <h3>推荐问题</h3>
          <div class="question-list">
            <button
              v-for="item in questionChips"
              :key="item.label"
              class="question-chip"
              type="button"
            >
              {{ item.label }}
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style scoped lang="less">
.sqlbot-home-prototype-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #eff6ff 0%, #ffffff 100%);
  color: #1e293b;
  font-family: 'Source Han Sans CN', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

button {
  border: 0;
  background: none;
  padding: 0;
  font: inherit;
}

.topbar {
  height: 56px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #1e5af2;
}

.brand,
.topbar-nav,
.topbar-right {
  display: flex;
  align-items: center;
}

.brand {
  min-width: 140px;
  gap: 12px;
}

.brand-mark {
  width: 26px;
  height: 24px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
}

.brand-bar {
  width: 6px;
  border-radius: 1px 1px 0 0;
  background: #ffffff;
}

.bar-1 {
  height: 11px;
}

.bar-2 {
  height: 18px;
}

.bar-3 {
  height: 15px;
}

.brand-text {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.topbar-nav {
  gap: 24px;
}

.topbar-nav-item {
  height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  color: #dfe7ff;
  font-size: 14px;
  font-weight: 500;
  cursor: default;
}

.topbar-nav-item.is-active {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  font-weight: 600;
}

.topbar-right {
  min-width: 180px;
  justify-content: flex-end;
  gap: 18px;
}

.icon-button {
  position: relative;
  width: 20px;
  height: 20px;
  cursor: default;
}

.icon-button::before,
.icon-button::after,
.user-caret::before,
.choose-arrow::before,
.select-caret::before,
.menu-icon::before,
.menu-icon::after,
.ask-status-icon::before,
.ask-status-icon::after,
.send-arrow::before {
  content: '';
  position: absolute;
  box-sizing: border-box;
}

.is-download::before {
  left: 8px;
  top: 2px;
  width: 2px;
  height: 11px;
  background: #fff;
}

.is-download::after {
  left: 5px;
  top: 10px;
  width: 8px;
  height: 8px;
  border-right: 2px solid #fff;
  border-bottom: 2px solid #fff;
  transform: rotate(45deg);
}

.is-bell::before {
  left: 4px;
  top: 2px;
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-bottom: 0;
  border-radius: 8px 8px 0 0;
}

.is-bell::after {
  left: 6px;
  top: 13px;
  width: 8px;
  height: 2px;
  background: #fff;
  border-radius: 2px;
  box-shadow: 3px 4px 0 -1px #fff;
}

.user-button {
  height: 32px;
  padding: 4px 12px 4px 4px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: default;
}

.user-avatar {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #fff;
  color: #1e5af2;
  font-size: 12px;
  font-weight: 700;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
}

.user-caret {
  position: relative;
  width: 10px;
  height: 10px;
}

.user-caret::before,
.choose-arrow::before,
.select-caret::before {
  left: 2px;
  top: 1px;
  width: 6px;
  height: 6px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
}

.page-body {
  min-height: calc(100vh - 56px);
  display: flex;
}

.sidebar {
  width: 280px;
  padding: 16px 8px 16px 16px;
  background: #fff;
}

.product-entry-card {
  min-height: 88px;
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-radius: 12px;
  background: #eff6ff;
}

.assistant-icon {
  position: relative;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 8px;
  background: #1e5af2;
}

.assistant-icon::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 11px;
  width: 18px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 4px;
}

.assistant-icon::after {
  content: '';
  position: absolute;
  left: 17px;
  top: 6px;
  width: 6px;
  height: 4px;
  border: 2px solid #fff;
  border-bottom: 0;
  border-radius: 3px 3px 0 0;
}

.assistant-head {
  position: absolute;
  left: 18px;
  top: 16px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #fff;
  box-shadow: -6px 0 0 #fff, 6px 0 0 #fff;
}

.product-copy {
  min-width: 0;
}

.product-copy h2,
.product-copy p,
.history-card h4,
.history-card p,
.hero-block h1,
.hero-block p,
.dataset-card h3,
.questions-section h3 {
  margin: 0;
}

.product-copy h2 {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}

.product-copy p {
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: #64748b;
}

.new-badge {
  margin-top: 8px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  height: 16px;
  border-radius: 4px;
  background: #dbeafe;
  color: #1e5af2;
  font-size: 10px;
  font-weight: 600;
}

.side-menu {
  margin-top: 16px;
  padding: 8px;
}

.side-menu-item {
  width: 100%;
  height: 44px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 8px;
  color: #334155;
  cursor: default;
}

.side-menu-item + .side-menu-item {
  margin-top: 4px;
}

.side-menu-item.is-active {
  background: #eff6ff;
}

.side-menu-item.is-active .menu-label {
  color: #1e5af2;
  font-weight: 600;
}

.menu-label {
  font-size: 14px;
  line-height: 20px;
}

.menu-icon {
  position: relative;
  width: 20px;
  height: 20px;
  color: #334155;
  flex: 0 0 auto;
}

.side-menu-item.is-active .menu-icon {
  color: #1e5af2;
}

.icon-home::before {
  left: 3px;
  top: 8px;
  width: 14px;
  height: 10px;
  border: 2px solid currentColor;
  border-top: 0;
  border-radius: 0 0 2px 2px;
}

.icon-home::after {
  left: 5px;
  top: 2px;
  width: 10px;
  height: 10px;
  border-left: 2px solid currentColor;
  border-top: 2px solid currentColor;
  transform: rotate(45deg);
}

.icon-report::before {
  left: 5px;
  top: 2px;
  width: 10px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 2px;
}

.icon-report::after {
  left: 8px;
  top: 6px;
  width: 4px;
  height: 1.5px;
  background: currentColor;
  box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
}

.icon-build::before {
  left: 4px;
  top: 3px;
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
}

.icon-build::after {
  left: 10px;
  top: 3px;
  width: 2px;
  height: 12px;
  background: currentColor;
  box-shadow: -6px 6px 0 currentColor;
}

.icon-history::before {
  left: 3px;
  top: 3px;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.icon-history::after {
  left: 10px;
  top: 7px;
  width: 2px;
  height: 5px;
  background: currentColor;
  box-shadow: 3px 3px 0 -1px currentColor;
}

.history-panel {
  margin-top: 20px;
}

.history-panel h3 {
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  color: #64748b;
}

.history-list {
  margin-top: 12px;
}

.history-card {
  padding: 12px;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  background: #fff;
}

.history-card + .history-card {
  margin-top: 8px;
}

.history-card.is-primary {
  background: #fafafa;
}

.history-card h4 {
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  color: #1e293b;
}

.history-card p {
  margin-top: 4px;
  font-size: 11px;
  line-height: 14px;
  color: #94a3b8;
}

.main-area {
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-block {
  width: 700px;
  text-align: center;
}

.hero-icon {
  position: relative;
  width: 56px;
  height: 56px;
  margin: 14px auto 20px;
  border-radius: 50%;
  background: #2563eb;
}

.hero-lamp {
  position: absolute;
  left: 18px;
  top: 15px;
  width: 20px;
  height: 24px;
}

.hero-lamp::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 1px;
  width: 12px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 8px;
}

.hero-lamp::after {
  content: '';
  position: absolute;
  left: 8px;
  top: 16px;
  width: 4px;
  height: 6px;
  background: #fff;
  box-shadow: -2px 6px 0 0 #fff, 2px 6px 0 0 #fff;
}

.hero-block h1 {
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: #1e293b;
}

.hero-block p {
  margin-top: 12px;
  font-size: 14px;
  line-height: 20px;
  color: #64748b;
}

.dataset-section {
  width: 700px;
  margin-top: 44px;
}

.dataset-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.theme-tabs,
.source-tabs {
  display: flex;
  align-items: center;
}

.theme-tabs {
  gap: 8px;
}

.source-tabs {
  gap: 12px;
}

.theme-tab,
.source-tab {
  height: 32px;
  padding: 0 16px;
  border-radius: 999px;
  color: #64748b;
  font-size: 14px;
  line-height: 20px;
  cursor: default;
}

.theme-tab.is-active {
  background: #eff6ff;
  color: #2563eb;
  font-weight: 600;
}

.source-tab.is-active {
  background: #2563eb;
  color: #fff;
  font-weight: 600;
}

.source-tab.is-trial {
  padding: 0 0 0 4px;
  color: #f59e0b;
  font-weight: 600;
}

.dataset-grid {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(3, 220px);
  gap: 18px 20px;
}

.dataset-card {
  min-height: 80px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.dataset-card h3 {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #1e293b;
}

.dataset-tags {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dataset-tag {
  height: 20px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.dataset-card-more {
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.dataset-card-more strong {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #1e293b;
}

.ask-card {
  width: 700px;
  margin-top: 32px;
  padding: 24px;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 6px rgba(0, 0, 0, 0.08);
}

.ask-card-header,
.ask-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ask-status {
  height: 28px;
  padding: 4px 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
}

.ask-status-icon {
  position: relative;
  width: 16px;
  height: 16px;
}

.ask-status-icon::before {
  left: 3px;
  top: 4px;
  width: 10px;
  height: 8px;
  border: 1.5px solid #2563eb;
  border-radius: 2px;
}

.ask-status-icon::after {
  left: 5px;
  top: 1px;
  width: 6px;
  height: 3px;
  border: 1.5px solid #2563eb;
  border-bottom: 0;
  border-radius: 2px 2px 0 0;
}

.choose-data-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #2563eb;
  font-size: 13px;
  line-height: 18px;
  font-weight: 600;
  cursor: default;
}

.choose-arrow,
.select-caret {
  position: relative;
  width: 10px;
  height: 10px;
  color: currentColor;
}

.choose-arrow::before {
  transform: rotate(-45deg);
  left: 1px;
  top: 2px;
}

.ask-hint {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 20px;
  color: #64748b;
}

.ask-bottom {
  margin-top: 24px;
}

.ask-source {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ask-select {
  height: 26px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #f9fafb;
  color: #334155;
  font-size: 12px;
  line-height: 16px;
  cursor: default;
}

.select-caret::before {
  left: 2px;
  top: 1px;
}

.ask-tag {
  height: 24px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  line-height: 16px;
}

.send-button {
  width: 32px;
  height: 32px;
  position: relative;
  border-radius: 50%;
  background: #2563eb;
  cursor: default;
}

.send-arrow {
  position: absolute;
  inset: 0;
}

.send-arrow::before {
  left: 10px;
  top: 9px;
  width: 10px;
  height: 10px;
  border-top: 2px solid #fff;
  border-right: 2px solid #fff;
  transform: rotate(45deg);
}

.questions-section {
  width: 700px;
  margin-top: 24px;
}

.questions-section h3 {
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
  color: #1e293b;
}

.question-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.question-chip {
  min-height: 36px;
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font-size: 13px;
  line-height: 18px;
  cursor: default;
}

@media (max-width: 1220px) {
  .topbar {
    padding: 0 16px;
  }

  .topbar-nav {
    gap: 12px;
  }

  .page-body {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    padding-right: 16px;
  }

  .main-area {
    padding-top: 8px;
  }
}

@media (max-width: 760px) {
  .topbar {
    height: auto;
    padding: 12px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .topbar-nav {
    width: 100%;
    order: 3;
    flex-wrap: wrap;
    gap: 8px;
  }

  .main-area,
  .dataset-section,
  .hero-block,
  .ask-card,
  .questions-section {
    width: 100%;
  }

  .dataset-header-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .dataset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
