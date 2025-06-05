import { createPage, setup } from '@nuxt/test-utils/e2e'
import { expect as playwrightExpect } from '@nuxt/test-utils/playwright'
import { describe, it } from 'vitest'

const STATUS_AUTHENTICATED = 'authenticated'
const STATUS_UNAUTHENTICATED = 'unauthenticated'

describe('local Provider', async () => {
  await setup({
    runner: 'vitest',
    browser: true
  })

  it('load, sign in, reload, refresh, sign out', async () => {
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

  it('should sign up and return signup data when preventLoginFlow: true', async () => {
    const page = await createPage('/register') // Navigate to signup page

    const [
      usernameInput,
      passwordInput,
      submitButton,
      status
    ] = await Promise.all([
      page.getByTestId('register-username'),
      page.getByTestId('register-password'),
      page.getByTestId('register-submit'),
      page.getByTestId('status')
    ])

    await usernameInput.fill('newuser')
    await passwordInput.fill('hunter2')

    // Click button and wait for API to finish
    const responsePromise = page.waitForResponse(/\/api\/auth\/signup/)
    await submitButton.click()
    const response = await responsePromise

    // Expect the response to return signup data
    const responseBody = await response.json() // Parse response
    playwrightExpect(responseBody).toBeDefined() // Ensure data is returned

    // Since we use `preventLoginFlow`, status should be unauthenticated
    await playwrightExpect(status).toHaveText(STATUS_UNAUTHENTICATED)
  })
})
