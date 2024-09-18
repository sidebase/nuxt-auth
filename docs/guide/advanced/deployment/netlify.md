# Deploying on Netlify

When deploying on Netlify ensure all required environment variables are set. Read more about general deployment [here](/guide/advanced/deployment/self-hosted).

## Differences to Self hosted deployments

Netlify can automatically assign domain names for your application. If you would like to access the generated domain through your environment variables you can access the [read-only variable `URL` or `DEPLOY_URL`](https://docs.netlify.com/configure-builds/environment-variables/#deploy-urls-and-metadata).

- `URL`: URL representing the main address to your site. It can be either a Netlify subdomain or your own custom domain if you set one (e.g. `https://your-auth-app.netlify.app`)
- `DEPLOY_URL`: URL representing the unique URL for an individual deploy. It starts with a unique ID that identifies the deploy (e.g. `https://5b243e66dd6a547b4fee73ae--your-auth-app.netlify.app`)

Depending on the environment and the use-case, you may want to use one of the two variables.

These variables are avalible at build-time. Therefore you can references this variable inside your `nuxt.config.ts` to set the dynamic url for netlify deployments:

```ts
export default defineNuxtConfig({
  modules: ['@sidebase/nuxt-auth'],
  auth: {
    baseURL: process.env.DEPLOY_URL ? `${DEPLOY_URL}/api/auth` : undefined
  }
})
```

At build time this will check if your application is running inside a Netlify environment (using `process.env.DEPLOY_URL` or `process.env.URL`). If this environment variable is set the `baseURL` is infered by combining the `host` and `path` together.

::: warning
Securing a preview deployment (with an OAuth provider) comes with some critical obstacles. Most OAuth providers only allow a single redirect/callback URL, or at least a set of full static URLs. Meaning you cannot set the value before publishing the site and you cannot use wildcard subdomains in the callback URL settings of your OAuth provider. To avoid this, AuthJS has a few suggestions you can find [here](https://next-auth.js.org/deployment#securing-a-preview-deployment).
:::
