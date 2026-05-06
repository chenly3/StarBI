# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scheduled-reports.spec.ts >> Scheduled Reports - E2E Acceptance >> should display the task list page with expected elements
- Location: e2e/scheduled-reports.spec.ts:212:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.system-setting-page__title, h1, .report-page__title').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('.system-setting-page__title, h1, .report-page__title').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - button "StarBI" [ref=e6] [cursor=pointer]:
      - generic [ref=e13]: StarBI
    - menubar [ref=e15]:
      - menuitem "工作台" [ref=e16] [cursor=pointer]:
        - generic [ref=e17]: 工作台
      - menuitem "智能问数" [ref=e18] [cursor=pointer]:
        - generic [ref=e19]: 智能问数
      - menuitem "仪表板" [ref=e20] [cursor=pointer]:
        - generic [ref=e21]: 仪表板
      - menuitem "数据大屏" [ref=e22] [cursor=pointer]:
        - generic [ref=e23]: 数据大屏
      - menuitem "数据准备" [ref=e24]:
        - generic [ref=e25] [cursor=pointer]:
          - generic [ref=e26]: 数据准备
          - img [ref=e28]
    - generic [ref=e30]:
      - img [ref=e32] [cursor=pointer]
      - img [ref=e41] [cursor=pointer]
      - img [ref=e45] [cursor=pointer]
      - img [ref=e49] [cursor=pointer]
      - generic [ref=e51] [cursor=pointer]:
        - img [ref=e53]
        - generic [ref=e58]: 管理员
        - img [ref=e60]
      - generic:
        - generic:
          - img [ref=e63] [cursor=pointer]
          - img [ref=e66] [cursor=pointer]
          - iframe
  - main [ref=e69]:
    - generic [ref=e70]:
      - generic [ref=e71]:
        - generic [ref=e72]:
          - img [ref=e74]
          - generic [ref=e79]:
            - generic "管理员" [ref=e81]
            - generic [ref=e83]: "ID: 1"
          - generic [ref=e84]:
            - generic [ref=e85]: 仪表板
            - generic [ref=e86]: "1"
          - generic [ref=e87]:
            - generic [ref=e88]: 数据大屏
            - generic [ref=e89]: "0"
          - generic [ref=e90]:
            - generic [ref=e91]: 数据集
            - generic [ref=e92]: "4"
        - generic [ref=e93]:
          - text: 快速创建
          - generic [ref=e94]:
            - generic [ref=e95] [cursor=pointer]:
              - img [ref=e97]
              - generic [ref=e99]: 仪表板
            - generic [ref=e100] [cursor=pointer]:
              - img [ref=e102]
              - generic [ref=e106]: 数据大屏
            - generic [ref=e107] [cursor=pointer]:
              - img [ref=e109]
              - generic [ref=e111]: 数据集
            - generic [ref=e112] [cursor=pointer]:
              - img [ref=e114]
              - generic [ref=e116]: 数据源
            - generic [ref=e117] [cursor=pointer]:
              - img [ref=e119]
              - generic [ref=e125]: 使用模板新建
      - generic [ref=e126]:
        - generic [ref=e127]:
          - generic [ref=e128]:
            - text: 模板中心
            - generic [ref=e129]:
              - button "查看全部" [ref=e130] [cursor=pointer]
              - separator [ref=e131]
              - button "收起" [ref=e132] [cursor=pointer]
          - generic [ref=e133]:
            - generic [ref=e134] [cursor=pointer]: 推荐仪表板
            - generic [ref=e135] [cursor=pointer]: 数据大屏
          - generic [ref=e136]:
            - generic "年度销售总结报表" [ref=e141]
            - generic "某电商平台商品运营看板" [ref=e146]
            - generic "连锁茶饮销售看板" [ref=e151]
        - generic [ref=e152]:
          - generic [ref=e153]:
            - generic:
              - tabpanel "我的收藏"
            - tablist [ref=e157]:
              - tab "我的收藏" [selected] [ref=e159]:
                - generic [ref=e160]: 我的收藏
              - tab "最近使用" [ref=e161]:
                - generic [ref=e162]: 最近使用
              - tab "我的分享" [ref=e163]:
                - generic [ref=e164]: 我的分享
          - generic [ref=e165]:
            - generic [ref=e168] [cursor=pointer]:
              - generic:
                - combobox [ref=e170]
                - generic [ref=e171]: 全部类型
              - img [ref=e174]
            - generic [ref=e178]:
              - img [ref=e181]
              - textbox "搜索关键词" [ref=e183]
          - generic [ref=e187]:
            - table [ref=e189]:
              - rowgroup [ref=e197]:
                - row "名称 类型 创建人 最近编辑人 最近编辑时间 操作" [ref=e198]:
                  - columnheader "名称" [ref=e199]:
                    - generic [ref=e200]: 名称
                  - columnheader "类型" [ref=e201]:
                    - generic [ref=e202]: 类型
                  - columnheader "创建人" [ref=e203]:
                    - generic [ref=e204]: 创建人
                  - columnheader "最近编辑人" [ref=e205]:
                    - generic [ref=e206]: 最近编辑人
                  - columnheader "最近编辑时间" [ref=e207] [cursor=pointer]:
                    - generic [ref=e208]: 最近编辑时间
                  - columnheader "操作" [ref=e212]:
                    - generic [ref=e213]: 操作
            - generic [ref=e217]:
              - table:
                - rowgroup
              - generic [ref=e220]:
                - img [ref=e222]
                - paragraph [ref=e224]: 暂无收藏
```

# Test source

```ts
  121 |   const passwordInput = page
  122 |     .locator('.login-input-module input[type="password"], .login-form input[type="password"]')
  123 |     .first()
  124 |   await passwordInput.waitFor({ state: 'visible', timeout: 10_000 })
  125 |   await passwordInput.click()
  126 |   await passwordInput.fill(TEST_PASSWORD)
  127 | 
  128 |   // Click submit
  129 |   const submitBtn = page.locator('button.submit')
  130 |   await submitBtn.waitFor({ state: 'visible', timeout: 5_000 })
  131 |   await submitBtn.click()
  132 | 
  133 |   // Wait for navigation away from login
  134 |   await page.waitForURL(/#\/(?!login)/, { timeout: 30_000 })
  135 |   await page.waitForLoadState('networkidle')
  136 | }
  137 | 
  138 | async function navigateToReportPage(page: Page) {
  139 |   // Wait for app to fully stabilize after login
  140 |   await page.waitForTimeout(3000)
  141 | 
  142 |   // Check if we're already on a page that might redirect
  143 |   const currentUrl = page.url()
  144 |   console.log(`[E2E] Current URL before navigation: ${currentUrl}`)
  145 | 
  146 |   // Navigate to report page
  147 |   console.log(`[E2E] Navigating to: ${REPORT_URL}`)
  148 |   await page.goto(REPORT_URL, { waitUntil: 'load', timeout: 30_000 })
  149 | 
  150 |   // Give the Vue router time to process the route change
  151 |   await page.waitForTimeout(2000)
  152 | 
  153 |   // Wait for page to load - use multiple possible selectors
  154 |   try {
  155 |     // Try multiple selectors that indicate the report page loaded
  156 |     await page.waitForSelector(
  157 |       '.system-setting-page, .report-page, .system-setting-page__title, .ed-empty',
  158 |       {
  159 |         timeout: 20_000
  160 |       }
  161 |     )
  162 |     console.log('[E2E] Report page loaded successfully')
  163 |   } catch (e) {
  164 |     // If selector fails, take a screenshot and check URL for debugging
  165 |     const finalUrl = page.url()
  166 |     console.log(`[E2E] Navigation failed. Final URL: ${finalUrl}`)
  167 |     await page.screenshot({
  168 |       path: 'test-results/screenshots/debug-navigation-fail.png',
  169 |       fullPage: true
  170 |     })
  171 | 
  172 |     // Check if we're on a different page (might be permission issue)
  173 |     if (!finalUrl.includes('report')) {
  174 |       console.log('[E2E] Not on report page - might be permission or routing issue')
  175 |     }
  176 |     throw e
  177 |   }
  178 | 
  179 |   // Additional wait for any async components to render
  180 |   await page.waitForTimeout(1000)
  181 | }
  182 | 
  183 | // ---------------------------------------------------------------------------
  184 | // Pre-flight: check backend availability
  185 | // ---------------------------------------------------------------------------
  186 | 
  187 | test.describe('Scheduled Reports - E2E Acceptance', () => {
  188 |   test.describe.configure({ mode: 'serial' })
  189 | 
  190 |   // Skip the entire suite if the backend is not available
  191 |   test.beforeAll(async () => {
  192 |     const healthy = await isBackendHealthy()
  193 |     if (!healthy) {
  194 |       test.skip(true, 'Backend is not running on port 8100. Start the Spring Boot backend first.')
  195 |     }
  196 |   })
  197 | 
  198 |   // -----------------------------------------------------------------------
  199 |   // 1. Login & navigation
  200 |   // -----------------------------------------------------------------------
  201 |   test('should login and navigate to the scheduled reports page', async ({ page }) => {
  202 |     await login(page)
  203 |     await takeScreenshot(page, '01-after-login')
  204 | 
  205 |     await navigateToReportPage(page)
  206 |     await takeScreenshot(page, '02-report-list-page')
  207 |   })
  208 | 
  209 |   // -----------------------------------------------------------------------
  210 |   // 2. Task list page verification
  211 |   // -----------------------------------------------------------------------
  212 |   test('should display the task list page with expected elements', async ({ page }) => {
  213 |     await login(page)
  214 |     await navigateToReportPage(page)
  215 | 
  216 |     // Wait for page to fully render
  217 |     await page.waitForTimeout(2000)
  218 | 
  219 |     // Try multiple possible selectors for title
  220 |     const title = page.locator('.system-setting-page__title, h1, .report-page__title').first()
> 221 |     await expect(title).toBeVisible({ timeout: 10_000 })
      |                         ^ Error: expect(locator).toBeVisible() failed
  222 | 
  223 |     const createBtn = page
  224 |       .locator('button')
  225 |       .filter({ hasText: /Create|创建|新建/ })
  226 |       .first()
  227 |     await expect(createBtn).toBeVisible({ timeout: 10_000 })
  228 | 
  229 |     const searchInput = page.locator('.task-toolbar input, .search-input, input[placeholder*="搜索"]').first()
  230 |     await expect(searchInput).toBeVisible({ timeout: 10_000 })
  231 | 
  232 |     const table = page.locator('.task-table, .el-table, .ed-empty')
  233 |     await expect(table).toBeVisible({ timeout: 10_000 })
  234 | 
  235 |     await takeScreenshot(page, '03-report-list-elements')
  236 |   })
  237 | 
  238 |   // -----------------------------------------------------------------------
  239 |   // 3. Create wizard - open and step 1 (Basic Info)
  240 |   // -----------------------------------------------------------------------
  241 |   test('should open create wizard and display Step 1 (Basic Info)', async ({ page }) => {
  242 |     await login(page)
  243 |     await navigateToReportPage(page)
  244 | 
  245 |     const createBtn = page
  246 |       .locator('button')
  247 |       .filter({ hasText: /Create|创建/ })
  248 |       .first()
  249 |     await createBtn.click()
  250 | 
  251 |     const dialog = page.locator('.el-dialog')
  252 |     await expect(dialog).toBeVisible({ timeout: 10_000 })
  253 | 
  254 |     // Verify 3 step indicators
  255 |     const steps = page.locator('.el-step')
  256 |     await expect(steps).toHaveCount(3)
  257 | 
  258 |     // Verify step 1 form fields
  259 |     await expect(page.locator('.el-radio-group').first()).toBeVisible()
  260 |     await expect(page.locator('.el-tree-select, .el-select').first()).toBeVisible()
  261 |     await expect(page.locator('input[maxlength="100"]')).toBeVisible()
  262 | 
  263 |     await takeScreenshot(page, '04-create-wizard-step1')
  264 | 
  265 |     // Verify form validation on submit without data
  266 |     const nextBtn = page
  267 |       .locator('.wizard-footer button')
  268 |       .filter({ hasText: /Next|下一步/ })
  269 |       .first()
  270 |     await nextBtn.click()
  271 |     await takeScreenshot(page, '05-step1-validation-errors')
  272 |   })
  273 | 
  274 |   // -----------------------------------------------------------------------
  275 |   // 4. Create wizard - step 1 with data -> step 2 (Recipients)
  276 |   // -----------------------------------------------------------------------
  277 |   test('should fill Step 1 and navigate to Step 2 (Recipients)', async ({ page }) => {
  278 |     await login(page)
  279 |     await navigateToReportPage(page)
  280 | 
  281 |     const createBtn = page
  282 |       .locator('button')
  283 |       .filter({ hasText: /Create|创建/ })
  284 |       .first()
  285 |     await createBtn.click()
  286 |     await page.locator('.el-dialog').waitFor({ state: 'visible' })
  287 | 
  288 |     // Fill Step 1
  289 |     const dashboardRadio = page.locator('.el-radio').first()
  290 |     await dashboardRadio.click()
  291 | 
  292 |     const nameInput = page
  293 |       .locator('.wizard-content input[maxlength="100"], .wizard-content input')
  294 |       .first()
  295 |     await nameInput.fill('E2E Test Scheduled Report')
  296 | 
  297 |     const nextBtn = page
  298 |       .locator('.wizard-footer button')
  299 |       .filter({ hasText: /Next|下一步/ })
  300 |       .first()
  301 |     await nextBtn.click()
  302 | 
  303 |     const recipientTabs = page.locator('.recipient-tabs, .el-tabs')
  304 |     await expect(recipientTabs).toBeVisible({ timeout: 10_000 })
  305 | 
  306 |     await takeScreenshot(page, '06-create-wizard-step2')
  307 | 
  308 |     const tabs = page.locator('.el-tab-pane')
  309 |     await expect(tabs.first()).toBeVisible()
  310 | 
  311 |     const addEmailBtn = page
  312 |       .locator('button')
  313 |       .filter({ hasText: /Add|添加/ })
  314 |       .first()
  315 |     await expect(addEmailBtn).toBeVisible()
  316 |   })
  317 | 
  318 |   // -----------------------------------------------------------------------
  319 |   // 5. Create wizard - navigate to Step 3 (Send Settings)
  320 |   // -----------------------------------------------------------------------
  321 |   test('should navigate to Step 3 (Send Settings)', async ({ page }) => {
```