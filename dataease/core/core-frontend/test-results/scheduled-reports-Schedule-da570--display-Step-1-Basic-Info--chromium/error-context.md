# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scheduled-reports.spec.ts >> Scheduled Reports - E2E Acceptance >> should open create wizard and display Step 1 (Basic Info)
- Location: e2e/scheduled-reports.spec.ts:290:7

# Error details

```
Error: Vue app did not mount within 15s. Likely cause: backend is not running or returning 500 errors. Ensure the Spring Boot backend is running on port 8100 before running E2E tests.
```

# Test source

```ts
  1   | import { test, expect, Page, request } from '@playwright/test'
  2   | 
  3   | // ---------------------------------------------------------------------------
  4   | // Constants
  5   | // ---------------------------------------------------------------------------
  6   | 
  7   | const BASE_URL = 'http://localhost:8080'
  8   | const LOGIN_URL = `${BASE_URL}/#/login`
  9   | const REPORT_URL = `${BASE_URL}/#/sys-setting/report`
  10  | const BACKEND_URL = 'http://localhost:8100'
  11  | 
  12  | // Default test credentials -- adjust to match your local dev environment
  13  | const TEST_USERNAME = process.env.E2E_USERNAME ?? 'admin'
  14  | const TEST_PASSWORD = process.env.E2E_PASSWORD ?? 'DataEase@123456'
  15  | 
  16  | const SCREENSHOTS_DIR = 'test-results/screenshots'
  17  | 
  18  | // ---------------------------------------------------------------------------
  19  | // Helpers
  20  | // ---------------------------------------------------------------------------
  21  | 
  22  | async function takeScreenshot(page: Page, name: string) {
  23  |   const path = `${SCREENSHOTS_DIR}/${name}.png`
  24  |   await page.screenshot({ path, fullPage: true })
  25  |   console.log(`[screenshot] saved ${path}`)
  26  | }
  27  | 
  28  | /**
  29  |  * Check if the backend API is reachable.
  30  |  */
  31  | async function isBackendHealthy(): Promise<boolean> {
  32  |   try {
  33  |     const resp = await fetch(`${BACKEND_URL}/de2api/sysParameter/requestTimeOut`, {
  34  |       method: 'GET',
  35  |       signal: AbortSignal.timeout(5000)
  36  |     })
  37  |     return resp.status < 500
  38  |   } catch {
  39  |     return false
  40  |   }
  41  | }
  42  | 
  43  | /**
  44  |  * Log into the application.
  45  |  *
  46  |  * The login page has a "preheat" phase controlled by XpackComponent plugins.
  47  |  * In environments without xpack, preheat stays true indefinitely.
  48  |  * We detect this and force-bypass the overlay.
  49  |  */
  50  | async function login(page: Page) {
  51  |   // Collect console errors for debugging
  52  |   const pageErrors: string[] = []
  53  |   page.on('pageerror', err => pageErrors.push(err.message))
  54  |   page.on('console', msg => {
  55  |     if (msg.type() === 'error') pageErrors.push(`[console] ${msg.text()}`)
  56  |   })
  57  | 
  58  |   await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' })
  59  | 
  60  |   // Wait for the Vue app to mount -- either the preheat container or the form
  61  |   try {
  62  |     await page.waitForSelector('.preheat-container, .login-form-content', { timeout: 15_000 })
  63  |   } catch {
  64  |     const htmlLen = (await page.content()).length
  65  |     console.error('[E2E] App did not mount. Errors:', pageErrors.slice(0, 10))
  66  |     console.error('[E2E] HTML length:', htmlLen)
> 67  |     throw new Error(
      |           ^ Error: Vue app did not mount within 15s. Likely cause: backend is not running or returning 500 errors. Ensure the Spring Boot backend is running on port 8100 before running E2E tests.
  68  |       'Vue app did not mount within 15s. ' +
  69  |         'Likely cause: backend is not running or returning 500 errors. ' +
  70  |         'Ensure the Spring Boot backend is running on port 8100 before running E2E tests.'
  71  |     )
  72  |   }
  73  | 
  74  |   // If preheat container is present, force-bypass it (xpack not available)
  75  |   const hasPreheat = await page
  76  |     .locator('.preheat-container')
  77  |     .isVisible()
  78  |     .catch(() => false)
  79  |   if (hasPreheat) {
  80  |     await page.evaluate(() => {
  81  |       const preheat = document.querySelector('.preheat-container')
  82  |       if (preheat) preheat.remove()
  83  | 
  84  |       const bg = document.querySelector('.login-background')
  85  |       if (bg) {
  86  |         const el = bg as HTMLElement
  87  |         el.style.display = 'block'
  88  |         el.style.visibility = 'visible'
  89  |         el.style.opacity = '1'
  90  |       }
  91  | 
  92  |       const content = document.querySelector('.login-form-content')
  93  |       if (content) {
  94  |         const el = content as HTMLElement
  95  |         el.style.display = 'block'
  96  |         el.style.visibility = 'visible'
  97  |       }
  98  | 
  99  |       const form = document.querySelector('.login-form .el-form')
  100 |       if (form) {
  101 |         ;(form as HTMLElement).removeAttribute('disabled')
  102 |         form.classList.remove('is-disabled')
  103 |         form.querySelectorAll('.el-form-item').forEach(item => {
  104 |           item.classList.remove('is-disabled')
  105 |         })
  106 |       }
  107 |     })
  108 |     await page.waitForTimeout(500)
  109 |   }
  110 | 
  111 |   // Wait for the login form content to become visible
  112 |   await page.locator('.login-form-content').waitFor({ state: 'visible', timeout: 10_000 })
  113 | 
  114 |   // Fill username
  115 |   const usernameInput = page.locator('.login-input-module input').first()
  116 |   await usernameInput.waitFor({ state: 'visible', timeout: 10_000 })
  117 |   await usernameInput.click()
  118 |   await usernameInput.fill(TEST_USERNAME)
  119 | 
  120 |   // Fill password (CustomPassword renders el-input with type=password)
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
  153 |   // CRITICAL: Check for permission error dialog first
  154 |   // The dialog appears with text "当前页面仅对 admin 开放"
  155 |   const permissionDialog = page
  156 |     .locator('.el-message-box, .el-dialog')
  157 |     .filter({ hasText: /admin|开放/ })
  158 |   const hasPermissionDialog = (await permissionDialog.count()) > 0
  159 | 
  160 |   if (hasPermissionDialog) {
  161 |     const finalUrl = page.url()
  162 |     console.error('[E2E] ❌ PERMISSION ERROR: Admin-only dialog detected!')
  163 |     console.error(`[E2E] Current URL: ${finalUrl}`)
  164 |     await page.screenshot({
  165 |       path: 'test-results/screenshots/error-permission-denied.png',
  166 |       fullPage: true
  167 |     })
```