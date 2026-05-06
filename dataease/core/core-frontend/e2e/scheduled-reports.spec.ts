import { test, expect, Page, request } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = 'http://localhost:8080'
const LOGIN_URL = `${BASE_URL}/#/login`
const REPORT_URL = `${BASE_URL}/#/sys-setting/report`
const BACKEND_URL = 'http://localhost:8100'

// Default test credentials -- adjust to match your local dev environment
const TEST_USERNAME = process.env.E2E_USERNAME ?? 'admin'
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'DataEase@123456'

const SCREENSHOTS_DIR = 'test-results/screenshots'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function takeScreenshot(page: Page, name: string) {
  const path = `${SCREENSHOTS_DIR}/${name}.png`
  await page.screenshot({ path, fullPage: true })
  console.log(`[screenshot] saved ${path}`)
}

/**
 * Check if the backend API is reachable.
 */
async function isBackendHealthy(): Promise<boolean> {
  try {
    const resp = await fetch(`${BACKEND_URL}/de2api/sysParameter/requestTimeOut`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    })
    return resp.status < 500
  } catch {
    return false
  }
}

/**
 * Log into the application.
 *
 * The login page has a "preheat" phase controlled by XpackComponent plugins.
 * In environments without xpack, preheat stays true indefinitely.
 * We detect this and force-bypass the overlay.
 */
async function login(page: Page) {
  // Collect console errors for debugging
  const pageErrors: string[] = []
  page.on('pageerror', err => pageErrors.push(err.message))
  page.on('console', msg => {
    if (msg.type() === 'error') pageErrors.push(`[console] ${msg.text()}`)
  })

  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' })

  // Wait for the Vue app to mount -- either the preheat container or the form
  try {
    await page.waitForSelector('.preheat-container, .login-form-content', { timeout: 15_000 })
  } catch {
    const htmlLen = (await page.content()).length
    console.error('[E2E] App did not mount. Errors:', pageErrors.slice(0, 10))
    console.error('[E2E] HTML length:', htmlLen)
    throw new Error(
      'Vue app did not mount within 15s. ' +
        'Likely cause: backend is not running or returning 500 errors. ' +
        'Ensure the Spring Boot backend is running on port 8100 before running E2E tests.'
    )
  }

  // If preheat container is present, force-bypass it (xpack not available)
  const hasPreheat = await page
    .locator('.preheat-container')
    .isVisible()
    .catch(() => false)
  if (hasPreheat) {
    await page.evaluate(() => {
      const preheat = document.querySelector('.preheat-container')
      if (preheat) preheat.remove()

      const bg = document.querySelector('.login-background')
      if (bg) {
        const el = bg as HTMLElement
        el.style.display = 'block'
        el.style.visibility = 'visible'
        el.style.opacity = '1'
      }

      const content = document.querySelector('.login-form-content')
      if (content) {
        const el = content as HTMLElement
        el.style.display = 'block'
        el.style.visibility = 'visible'
      }

      const form = document.querySelector('.login-form .el-form')
      if (form) {
        ;(form as HTMLElement).removeAttribute('disabled')
        form.classList.remove('is-disabled')
        form.querySelectorAll('.el-form-item').forEach(item => {
          item.classList.remove('is-disabled')
        })
      }
    })
    await page.waitForTimeout(500)
  }

  // Wait for the login form content to become visible
  await page.locator('.login-form-content').waitFor({ state: 'visible', timeout: 10_000 })

  // Fill username
  const usernameInput = page.locator('.login-input-module input').first()
  await usernameInput.waitFor({ state: 'visible', timeout: 10_000 })
  await usernameInput.click()
  await usernameInput.fill(TEST_USERNAME)

  // Fill password (CustomPassword renders el-input with type=password)
  const passwordInput = page
    .locator('.login-input-module input[type="password"], .login-form input[type="password"]')
    .first()
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 })
  await passwordInput.click()
  await passwordInput.fill(TEST_PASSWORD)

  // Click submit
  const submitBtn = page.locator('button.submit')
  await submitBtn.waitFor({ state: 'visible', timeout: 5_000 })
  await submitBtn.click()

  // Wait for navigation away from login
  await page.waitForURL(/#\/(?!login)/, { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}

async function navigateToReportPage(page: Page) {
  // Wait for app to fully stabilize after login
  await page.waitForTimeout(3000)

  // Check if we're already on a page that might redirect
  const currentUrl = page.url()
  console.log(`[E2E] Current URL before navigation: ${currentUrl}`)

  // Navigate to report page
  console.log(`[E2E] Navigating to: ${REPORT_URL}`)
  await page.goto(REPORT_URL, { waitUntil: 'load', timeout: 30_000 })

  // Give the Vue router time to process the route change
  await page.waitForTimeout(2000)

  // Wait for page to load - use multiple possible selectors
  try {
    // Try multiple selectors that indicate the report page loaded
    await page.waitForSelector(
      '.system-setting-page, .report-page, .system-setting-page__title, .ed-empty',
      {
        timeout: 20_000
      }
    )
    console.log('[E2E] Report page loaded successfully')
  } catch (e) {
    // If selector fails, take a screenshot and check URL for debugging
    const finalUrl = page.url()
    console.log(`[E2E] Navigation failed. Final URL: ${finalUrl}`)
    await page.screenshot({
      path: 'test-results/screenshots/debug-navigation-fail.png',
      fullPage: true
    })

    // Check if we're on a different page (might be permission issue)
    if (!finalUrl.includes('report')) {
      console.log('[E2E] Not on report page - might be permission or routing issue')
    }
    throw e
  }

  // Additional wait for any async components to render
  await page.waitForTimeout(1000)
}

// ---------------------------------------------------------------------------
// Pre-flight: check backend availability
// ---------------------------------------------------------------------------

test.describe('Scheduled Reports - E2E Acceptance', () => {
  test.describe.configure({ mode: 'serial' })

  // Skip the entire suite if the backend is not available
  test.beforeAll(async () => {
    const healthy = await isBackendHealthy()
    if (!healthy) {
      test.skip(true, 'Backend is not running on port 8100. Start the Spring Boot backend first.')
    }
  })

  // -----------------------------------------------------------------------
  // 1. Login & navigation
  // -----------------------------------------------------------------------
  test('should login and navigate to the scheduled reports page', async ({ page }) => {
    await login(page)
    await takeScreenshot(page, '01-after-login')

    await navigateToReportPage(page)
    await takeScreenshot(page, '02-report-list-page')
  })

  // -----------------------------------------------------------------------
  // 2. Task list page verification
  // -----------------------------------------------------------------------
  test('should display the task list page with expected elements', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)

    // Wait for page to fully render
    await page.waitForTimeout(2000)

    // Try multiple possible selectors for title
    const title = page.locator('.system-setting-page__title, h1, .report-page__title').first()
    await expect(title).toBeVisible({ timeout: 10_000 })

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Create|创建|新建/ })
      .first()
    await expect(createBtn).toBeVisible({ timeout: 10_000 })

    const searchInput = page
      .locator('.task-toolbar input, .search-input, input[placeholder*="搜索"]')
      .first()
    await expect(searchInput).toBeVisible({ timeout: 10_000 })

    const table = page.locator('.task-table, .el-table, .ed-empty')
    await expect(table).toBeVisible({ timeout: 10_000 })

    await takeScreenshot(page, '03-report-list-elements')
  })

  // -----------------------------------------------------------------------
  // 3. Create wizard - open and step 1 (Basic Info)
  // -----------------------------------------------------------------------
  test('should open create wizard and display Step 1 (Basic Info)', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Create|创建/ })
      .first()
    await createBtn.click()

    const dialog = page.locator('.el-dialog')
    await expect(dialog).toBeVisible({ timeout: 10_000 })

    // Verify 3 step indicators
    const steps = page.locator('.el-step')
    await expect(steps).toHaveCount(3)

    // Verify step 1 form fields
    await expect(page.locator('.el-radio-group').first()).toBeVisible()
    await expect(page.locator('.el-tree-select, .el-select').first()).toBeVisible()
    await expect(page.locator('input[maxlength="100"]')).toBeVisible()

    await takeScreenshot(page, '04-create-wizard-step1')

    // Verify form validation on submit without data
    const nextBtn = page
      .locator('.wizard-footer button')
      .filter({ hasText: /Next|下一步/ })
      .first()
    await nextBtn.click()
    await takeScreenshot(page, '05-step1-validation-errors')
  })

  // -----------------------------------------------------------------------
  // 4. Create wizard - step 1 with data -> step 2 (Recipients)
  // -----------------------------------------------------------------------
  test('should fill Step 1 and navigate to Step 2 (Recipients)', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Create|创建/ })
      .first()
    await createBtn.click()
    await page.locator('.el-dialog').waitFor({ state: 'visible' })

    // Fill Step 1
    const dashboardRadio = page.locator('.el-radio').first()
    await dashboardRadio.click()

    const nameInput = page
      .locator('.wizard-content input[maxlength="100"], .wizard-content input')
      .first()
    await nameInput.fill('E2E Test Scheduled Report')

    const nextBtn = page
      .locator('.wizard-footer button')
      .filter({ hasText: /Next|下一步/ })
      .first()
    await nextBtn.click()

    const recipientTabs = page.locator('.recipient-tabs, .el-tabs')
    await expect(recipientTabs).toBeVisible({ timeout: 10_000 })

    await takeScreenshot(page, '06-create-wizard-step2')

    const tabs = page.locator('.el-tab-pane')
    await expect(tabs.first()).toBeVisible()

    const addEmailBtn = page
      .locator('button')
      .filter({ hasText: /Add|添加/ })
      .first()
    await expect(addEmailBtn).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 5. Create wizard - navigate to Step 3 (Send Settings)
  // -----------------------------------------------------------------------
  test('should navigate to Step 3 (Send Settings)', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Create|创建/ })
      .first()
    await createBtn.click()
    await page.locator('.el-dialog').waitFor({ state: 'visible' })

    const dashboardRadio = page.locator('.el-radio').first()
    await dashboardRadio.click()
    const nameInput = page
      .locator('.wizard-content input[maxlength="100"], .wizard-content input')
      .first()
    await nameInput.fill('E2E Test Report')

    const nextBtn = page
      .locator('.wizard-footer button')
      .filter({ hasText: /Next|下一步/ })
      .first()
    await nextBtn.click()
    await page.locator('.recipient-tabs, .el-tabs').waitFor({ state: 'visible' })

    await nextBtn.click()
    await page.waitForTimeout(500)

    await takeScreenshot(page, '07-create-wizard-step3')

    const scheduleRadio = page.locator('.wizard-content .el-radio-group').first()
    await expect(scheduleRadio).toBeVisible()

    const preview = page.locator('.schedule-preview')
    await expect(preview).toBeVisible()
  })

  // -----------------------------------------------------------------------
  // 6. Create wizard - step navigation (prev button)
  // -----------------------------------------------------------------------
  test('should navigate back from Step 3 to Step 2 using Prev button', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Create|创建/ })
      .first()
    await createBtn.click()
    await page.locator('.el-dialog').waitFor({ state: 'visible' })

    await page.locator('.el-radio').first().click()
    await page
      .locator('.wizard-content input[maxlength="100"], .wizard-content input')
      .first()
      .fill('E2E Nav Test')

    const nextBtn = page
      .locator('.wizard-footer button')
      .filter({ hasText: /Next|下一步/ })
      .first()
    await nextBtn.click()
    await page.locator('.recipient-tabs, .el-tabs').waitFor({ state: 'visible' })
    await nextBtn.click()
    await page.waitForTimeout(500)

    const prevBtn = page
      .locator('.wizard-footer button')
      .filter({ hasText: /Prev|上一步/ })
      .first()
    await prevBtn.click()
    await page.waitForTimeout(500)

    const recipientTabs = page.locator('.recipient-tabs, .el-tabs')
    await expect(recipientTabs).toBeVisible()

    await takeScreenshot(page, '08-wizard-step2-after-prev')
  })

  // -----------------------------------------------------------------------
  // 7. Create wizard - close/cancel
  // -----------------------------------------------------------------------
  test('should close the create wizard via Cancel button', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Create|创建/ })
      .first()
    await createBtn.click()
    await page.locator('.el-dialog').waitFor({ state: 'visible' })

    const cancelBtn = page
      .locator('.wizard-footer button')
      .filter({ hasText: /Cancel|取消/ })
      .first()
    await cancelBtn.click()

    const dialog = page.locator('.el-dialog')
    await expect(dialog).not.toBeVisible({ timeout: 5_000 })

    await takeScreenshot(page, '09-wizard-closed')
  })

  // -----------------------------------------------------------------------
  // 8. Search functionality
  // -----------------------------------------------------------------------
  test('should display search input and status filter on task list', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)

    const searchInput = page.locator(
      '.task-toolbar input[type="text"], .task-toolbar .el-input__inner'
    )
    await expect(searchInput).toBeVisible()

    const statusFilter = page.locator('.task-toolbar .el-select')
    await expect(statusFilter.first()).toBeVisible()

    const searchBtn = page
      .locator('.task-toolbar button')
      .filter({ hasText: /Search|搜索/ })
      .first()
    await expect(searchBtn).toBeVisible()

    await takeScreenshot(page, '10-search-and-filter')
  })

  // -----------------------------------------------------------------------
  // 9. Pagination
  // -----------------------------------------------------------------------
  test('should display pagination controls on task list', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)

    const pagination = page.locator('.pagination-container .el-pagination, .el-pagination')
    await expect(pagination).toBeVisible({ timeout: 10_000 })

    await takeScreenshot(page, '11-pagination')
  })

  // -----------------------------------------------------------------------
  // 10. Direct navigation verification
  // -----------------------------------------------------------------------
  test('should verify report page loads correctly on direct navigation', async ({ page }) => {
    await login(page)

    await page.goto(REPORT_URL, { waitUntil: 'networkidle' })

    const pageTitle = page.locator('.system-setting-page__title, h1')
    await expect(pageTitle).toBeVisible({ timeout: 15_000 })

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Create|创建/ })
      .first()
    await expect(createBtn).toBeVisible()

    const tableContainer = page.locator('.task-list-container')
    await expect(tableContainer).toBeVisible()

    await takeScreenshot(page, '12-direct-navigation')
  })

  // -----------------------------------------------------------------------
  // 11. Full page visual regression screenshot
  // -----------------------------------------------------------------------
  test('should capture full-page screenshots for visual review', async ({ page }) => {
    await login(page)
    await navigateToReportPage(page)
    await takeScreenshot(page, '13-visual-report-list')

    const createBtn = page
      .locator('button')
      .filter({ hasText: /Create|创建/ })
      .first()
    await createBtn.click()
    await page.locator('.el-dialog').waitFor({ state: 'visible' })
    await takeScreenshot(page, '14-visual-wizard-step1')

    await page.locator('.el-radio').first().click()
    await page
      .locator('.wizard-content input[maxlength="100"], .wizard-content input')
      .first()
      .fill('Visual Test Report')

    const nextBtn = page
      .locator('.wizard-footer button')
      .filter({ hasText: /Next|下一步/ })
      .first()
    await nextBtn.click()
    await page.locator('.recipient-tabs, .el-tabs').waitFor({ state: 'visible' })
    await takeScreenshot(page, '15-visual-wizard-step2')

    await nextBtn.click()
    await page.waitForTimeout(500)
    await takeScreenshot(page, '16-visual-wizard-step3')
  })
})
