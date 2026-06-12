import { createPage, setup } from '@nuxt/test-utils/e2e'
import { expect as playwrightExpect } from '@nuxt/test-utils/playwright'
import { describe, it } from 'vitest'

const STATUS_AUTHENTICATED = 'authenticated'
const STATUS_UNAUTHENTICATED = 'unauthenticated'

const BASE_URL = 'http://127.0.0.1:3000'

describe('authjs Provider', async () => {
  await setup({
    runner: 'vitest',
    browser: true,
    port: 3000,
    env: {
      AUTH_ORIGIN: `${BASE_URL}/api/auth`,
    },
  })

  it('load, sign in, reload, refresh, sign out', async () => {
    const page = await createPage('/', { baseURL: BASE_URL })

    // Locators
    const [
      signInButton,
      status,
      signoutButton,
      refreshRequiredFalseButton,
      refreshRequiredTrueButton
    ] = await Promise.all([
      page.getByTestId('signin'),
      page.getByTestId('status'),
      page.getByTestId('signout'),
      page.getByTestId('refresh-required-false'),
      page.getByTestId('refresh-required-true')
    ])

    // Unauthenticated at first
    await playwrightExpect(status).toHaveText(STATUS_UNAUTHENTICATED)

    // Trigger normal signin page
    await signInButton.click()
    await playwrightExpect(page).toHaveURL(toUrl('/api/auth/signin?callbackUrl=%2F'))

    // Fill username and password, submit
    await page.getByPlaceholder('(hint: jsmith)').fill('jsmith')
    await page.getByPlaceholder('(hint: hunter2)').fill('hunter2')
    await page.getByRole('button', { name: 'Sign in with Credentials' }).click()

    await playwrightExpect(page).toHaveURL(toUrl('/'))
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
  }, 30000)
})

function toUrl(path: string): string {
  return new URL(path, BASE_URL).href
}
