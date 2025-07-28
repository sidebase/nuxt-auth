# Self Hosting

This guide will explain how you can self-host a Nuxt 4 application running NuxtAuth.

## Authjs Provider

When deploying the Auth.JS provider, the application must be informed what URL it is running at. This is to properly determine callback urls when navigating users to external OAuth providers. Depending on your setup, NuxtAuth allows you to set this value at either [**Runtime**](https://nuxt.com/docs/guide/going-further/hooks#app-hooks-runtime) or [**Buildtime**](https://nuxt.com/docs/guide/going-further/hooks#nuxt-hooks-build-time).

- **Runtime:** Set the `NUXT_AUTH_ORIGIN` environment variable.
- **Buildtime:** Set the `baseURL`-config key inside the `nuxt.config.ts`

The origin consists out of:

- **scheme:** http / https
- **host:** e.g., localhost, example.org, google.com
- **port:** empty (implies `:80` for http and `:443` for https), :3000, :8888

An example of the `NUXT_AUTH_ORIGIN` would be: `https://my-awesome-app.com`

:::info Origin Order
When [attempting to determine the server origin](https://github.com/sidebase/nuxt-auth/blob/main/src/runtime/server/services/utils.ts#L11), NuxtAuth checks the available options in the following order:
- **Prio 1**: Using `NUXT_AUTH_ORIGIN`
- **Prio 2**: Using `baseURL`-config key from inside the `nuxt.config.ts`
- **Prio 3**: Infer the origin _(Only in development)_
:::

:::tip
We recommend setting the `NUXT_AUTH_ORIGIN` during runtime and leaving the `baseURL`-config key empty, to avoid using a potentially incorrect ORIGIN.
:::

In addition to verifying that the origin is correctly set, also ensure that you have a secure [`secret` set in the NuxtAuthHandler](/guide/authjs/nuxt-auth-handler#secret).

## Local Provider

When deploying a Local provider based app, you will only need to set the correct `baseURL` to your authentication backend.

This path can either be:

- **Relative**: Pointing at a path inside your own application (e.g. `/api/auth`)
- **Absolute**: Pointing at a path inside an external application (e.g. `https://my-auth-backend/api`)

:::warning
For the `local` provider, this value will need to be set at build time. This is required to support static applications.

For this, ensure that you either directly set the `baseURL` inside the `nuxt.config.ts`, or provide a build-time environment variable that overwrites the value inside the `nuxt.config.ts`.
:::
