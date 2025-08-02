# Pathing logic in NuxtAuth

This page is here to clarify how the pathing logic works in `@sidebase/nuxt-auth`.
You can find a full overview of how URLs are handled [in the issue comment](https://github.com/sidebase/nuxt-auth/pull/913#issuecomment-2359137989) and in spec files for [`authjs` provider](https://github.com/sidebase/nuxt-auth/blob/main/tests/authjs.url.spec.ts) and [`local` provider](https://github.com/sidebase/nuxt-auth/blob/main/tests/local.url.spec.ts).

## `baseURL` is a prefix

It will be prepended to a path before making a call. For example,

```ts
export default defineNuxtConfig({
  auth: {
    baseURL: "https://example.com/api/auth",

    provider: {
      type: "local",
      endpoints: {
        // The call would be made to `https://example.com/api/auth/login`
        signIn: { path: "/login", method: "post" },
      },
    },
  },
});
```

## Use URL provided in `endpoints` if it is fully specified

If you provide a full URL to `endpoints`, it will be used when making calls to an endpoint:

```ts {9}
export default defineNuxtConfig({
  auth: {
    baseURL: "https://your.website/api",

    provider: {
      type: "local",
      endpoints: {
        // This will call `https://example.com/user`
        getSession: { path: "https://example.com/user" },

        // This will call `https://your.website/api/login`
        signIn: { path: "/login", method: "post" },
      },
    },
  },
});
```

## `runtimeConfig`

Value of `baseURL` is always located at `runtimeConfig.public.auth.baseURL`. You cannot change it directly as of the moment of writing, but you can read the value in your application:

```ts
const runtimeConfig = useRuntimeConfig();
const baseURL = runtimeConfig.public.auth.baseURL;
```

This value is generally the [source of truth](https://github.com/sidebase/nuxt-auth/blob/b5af548c1fc390ae00496e19ad7a91d308af9b12/src/runtime/utils/url.ts#L37-L38). It is being [set in the plugin](https://github.com/sidebase/nuxt-auth/blob/b5af548c1fc390ae00496e19ad7a91d308af9b12/src/runtime/plugin.ts#L20-L24) to also be available on the client.

## Changing `baseURL`

Read next to understand how it can be changed.

### 1. Environment variables

You have multiple ways of changing the `baseURL` via env variables:

- use `NUXT_PUBLIC_AUTH_BASE_URL`;
- use `AUTH_ORIGIN` if `originEnvKey` is not set;
- use the environment variable name set in [`originEnvKey`](/guide/application-side/configuration#originenvkey)

Environment variables should work in both build-time and runtime.

### 2. `baseURL`

If you didn't set an environment variable, NuxtAuth will look for [`auth.baseURL`](/guide/application-side/configuration#baseurl) inside the `nuxt.config.ts`.

Note that this variable is always **static**, will only be set during build and can still be overriden in runtime using env variables.

Not setting `baseURL` will default to `/api/auth`.

### 3. `authjs` only: determine origin automatically from the incoming `HTTP` request

When the server is running in **development mode**, NuxtAuth can automatically infer `baseURL` from the incoming request.

---

We recommend the following setup to configure your `AUTH_ORIGIN` or `baseURL`:

::: code-group

```ts diff [nuxt.config.ts]
export default defineNuxtConfig({
  // ... other configuration
  auth: {
    baseUrl: "https://my-backend.com/api/auth", // [!code --]
    // This is technically not needed as it is the default, but it's here for illustrative purposes
    originEnvKey: "AUTH_ORIGIN", // [!code ++]
  },
});
```

```env diff [.env]
AUTH_ORIGIN="https://my-backend.com/api/auth" // [!code ++]
```

:::
