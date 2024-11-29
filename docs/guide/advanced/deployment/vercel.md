# Deploying on Vercel

When deploying on Vercel ensure all required environment variables are set. Read more about general deployment [here](/guide/advanced/deployment/self-hosted).

## Differences to Self hosted deployments

Vercel can automatically assign domain names for your application. If you would like to access the generated domain through your environment variables you can access the [system environment variable `VERCEL_URL`](https://vercel.com/docs/projects/environment-variables/system-environment-variables).

This variable is avalible at both build and run-time. Therefore you can references this variable inside your `nuxt.config.ts` to set the dynamic url for vercel deployments:

```ts
export default defineNuxtConfig({
  modules: ['@sidebase/nuxt-auth'],
  auth: {
    baseURL: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/auth` : undefined
  }
})
```

At build time this will check if your application is running inside a Vercel environment (using `process.env.VERCEL_URL`). If this environment variable is set the `baseURL` is infered by combining the `schema`, `host` and `path` together.

::: warning
Securing a preview deployment (with an OAuth provider) comes with some critical obstacles. Most OAuth providers only allow a single redirect/callback URL, or at least a set of full static URLs. Meaning you cannot set the value before publishing the site and you cannot use wildcard subdomains in the callback URL settings of your OAuth provider. To avoid this, AuthJS has a few suggestions you can find [here](https://next-auth.js.org/deployment#securing-a-preview-deployment).
:::
