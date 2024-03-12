import { describe, test } from 'vitest'
import { setup, createPage } from '@nuxt/test-utils/e2e'
import { expect as playwrightExpect } from '@playwright/test'

const STATUS_AUTHENTICATED = 'authenticated'
const STATUS_UNAUTHENTICATED = 'unauthenticated'

describe('Refresh Provider', async () => {
  await setup({
    runner: 'vitest',
    browser: true
  })

  test('load, sign in, reload, refresh, sign out', async () => {
    const page = await createPage('/')
    const [
      usernameInput,
      passwordInput,
      submitButton,
      status,
      signoutButton,
      refreshRequiredFalseButton,
      refreshRequiredTrueButton
    ] = await Promise.all([
      page.getByTestId('username'),
      page.getByTestId('password'),
      page.getByTestId('submit'),
      page.getByTestId('status'),
      page.getByTestId('signout'),
      page.getByTestId('refresh-required-false'),
      page.getByTestId('refresh-required-true')
    ])

    await playwrightExpect(status).toHaveText(STATUS_UNAUTHENTICATED)

    await usernameInput.fill('hunter')
    await passwordInput.fill('hunter2')

    // Click button and wait for API to finish
    const responsePromise = page.waitForResponse(/\/api\/auth\/login/)
    await submitButton.click()
    await responsePromise

    await playwrightExpect(status).toHaveText(STATUS_AUTHENTICATED)

    // Ensure that we are still authenticated after page refresh
    await page.reload()
    await playwrightExpect(status).toHaveText(STATUS_AUTHENTICATED)

    // Refresh (required: false), status should not change
    await refreshRequiredFalseButton.click()
    await playwrightExpect(status).toHaveText(STATUS_AUTHENTICATED)

    // Refresh (required: true), status should not change
    await refreshRequiredTrueButton.click()
    await playwrightExpect(status).toHaveText(STATUS_AUTHENTICATED)

    // Sign out, status should change
    await signoutButton.click()
    await playwrightExpect(status).toHaveText(STATUS_UNAUTHENTICATED)
  })
})
