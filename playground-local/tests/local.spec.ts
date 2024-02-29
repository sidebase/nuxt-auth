import { describe, test } from 'vitest'
import { setup, createPage } from '@nuxt/test-utils/e2e'
import { expect as playwrightExpect } from '@playwright/test'

describe('Local Provider', async () => {
  await setup({
    runner: 'vitest',
    browser: true
  })

  test('it works', async () => {
    const page = await createPage('/')
    const [usernameInput, passwordInput, submitButton, status] = await Promise.all([
      page.getByTestId('username'),
      page.getByTestId('password'),
      page.getByTestId('submit'),
      page.getByTestId('status')
    ])

    await playwrightExpect(status).toHaveText('unauthenticated')

    await usernameInput.fill('hunter')
    await passwordInput.fill('hunter2')

    // Click button and wait for API to finish
    const responsePromise = page.waitForResponse(/\/api\/auth\/login/)
    await submitButton.click()
    await responsePromise

    await playwrightExpect(status).toHaveText('authenticated')
  })
})
