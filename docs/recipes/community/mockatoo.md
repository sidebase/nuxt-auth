# Mockatoo + Provider `authjs`

<RecipeHeader author="tianhuil" :providers="['authjs']" :tags="['testing', 'oauth', 'playwright']" />

This recipe lets you sign in with GitHub during development and in end-to-end tests without registering a GitHub OAuth app. Outside production, the `GithubProvider` points at [Mockatoo](https://mockatoo.globalunderdog.com), a free hosted mock of GitHub, Google and six other OAuth providers, so you sign in through the full OAuth redirect flow with a test account. Production still uses GitHub.

:::tip Disclosure
This recipe is written by the team that builds Mockatoo.
:::

## 1. Point the provider at the mock outside production

```ts
// file: ~/server/api/auth/[...].ts
import GithubProvider from 'next-auth/providers/github'
import { NuxtAuthHandler } from '#auth'

// Outside production, sign in against Mockatoo's mock GitHub instead of github.com
const mock = 'https://app.mockatoo.globalunderdog.com/github'
const github = process.env.NODE_ENV === 'production'
  ? {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }
  : {
      clientId: 'mockatoo',
      clientSecret: 'mockatoo-secret',
      authorization: `${mock}/login/oauth/authorize`,
      token: `${mock}/login/oauth/access_token`,
      userinfo: `${mock}/api/v3/user`,
    }

export default NuxtAuthHandler({
  secret: process.env.AUTH_SECRET,
  providers: [
    // @ts-expect-error Use .default here for it to work during SSR.
    GithubProvider.default(github),
  ],
})
```

- `mockatoo` / `mockatoo-secret` is Mockatoo's shared client. It accepts any `http(s)` callback URL, so `localhost` and preview deployments need no setup.
- Only the URLs change. NextAuth merges them into its own GitHub provider, so the default scopes, the profile mapping and your callbacks stay the same.
- `nuxi build` sets `NODE_ENV` to `production`, so a production build uses your real GitHub app.

## 2. Sign in

Create a free test account at [app.mockatoo.globalunderdog.com](https://app.mockatoo.globalunderdog.com) and copy its email and password from the dashboard. Run `nuxi dev` and call `signIn('github')`: Mockatoo's login page opens on the same paths as GitHub's. Log in, click **Authorize**, and you return to your app signed in. To sign in as another user, add a tag to the email, e.g. `you+alice@example.com`.

## 3. Test sign-in with Playwright

The mock is on only outside production, so run your tests against `nuxi dev` (Playwright's `webServer.command`). This test assumes your page has a "Sign in with GitHub" button that calls `signIn('github')` and shows the user's email once signed in. It skips when the credentials aren't set:

```ts
// file: ~/tests/sign-in.spec.ts
import { expect, test } from '@playwright/test'

const email = process.env.MOCKATOO_TEST_EMAIL
const password = process.env.MOCKATOO_TEST_PASSWORD

test('sign in with GitHub', async ({ page }) => {
  test.skip(!email || !password, 'Set MOCKATOO_TEST_EMAIL and MOCKATOO_TEST_PASSWORD')
  await page.goto('/')
  // Wait for hydration, so the button's click handler is attached
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: 'Sign in with GitHub' }).click()
  await page.locator('#email').fill(email!)
  await page.locator('#password').fill(password!)
  await page.getByRole('button', { name: 'Log in with password' }).click()
  await page.getByRole('button', { name: 'Authorize' }).click()
  await expect(page.getByText(email!, { exact: true })).toBeVisible()
})
```

In CI, store `MOCKATOO_TEST_EMAIL` and `MOCKATOO_TEST_PASSWORD` as secrets.

## Other providers

Mockatoo also mocks Google, Apple, Discord, Facebook, LinkedIn, Microsoft and X. Its [Nuxt guide](https://mockatoo.globalunderdog.com/docs/nuxt) and [Auth.js + Nuxt example](https://github.com/mockatoo/examples/tree/main/authjs-nuxt) cover all eight, but they use Auth.js v5 (`@auth/core`) directly, whose provider options differ from the NextAuth v4 that NuxtAuth uses.
