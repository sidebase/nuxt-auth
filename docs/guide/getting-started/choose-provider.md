---
aside: false
---

# Which Provider should I pick?

To pick a provider you will first have to take into consideration the requirements of your use-case. In general one can say that picking:

- `authjs` is best suited for plug-and-play OAuth for established oauth-providers or magic-url based sign-ins.
- `local` is best when you already have a backend that accepts username + password as a login or want to build a static application. The Local Provider also supports refresh tokens since `v0.9.0`.

:::warning Breaking change
In `v0.9.0` the `refresh` provider was integrated into the `local` provider. Read the [upgrade guide](/upgrade/version-0.9.0).
:::

If you are still unsure, below are some tables to help you pick:

## Authentication Methods

|                                                               |                      authjs provider   | local provider
|-----------------------------------------------------------    |-------------------------------------:  |---------------:
| OAuth                                                         |                    ✅ (>50 providers)  |     ❌
| Magic URLs                                                    |                                    ✅  |     ❌
| Credentials / Username + Password flow                        | 🚧 (if possible: use `local` instead)  |     ✅
| Refresh tokens                                                |                                    ✅  |     ✅

## Features

|                                                               |                       authjs provider  | local provider
|-----------------------------------------------------------    |-------------------------------------:  |------:
| [`useAuth`-composable](/guide/application-side/session-access) to sign in/out, refresh a session, etc.                                                                | ✅                                  | ✅
| Session-management: auto-refresh, refresh on refocus, ...         | ✅                                  | ✅
| Static apps ("nuxi generate")                                      | ❌                                 | ✅
| [Guest mode](/guide/application-side/protecting-pages#guest-mode) | ✅                                  | ✅
| [App-side middleware](/guide/application-side/protecting-pages)   | ✅                                  | ✅
| [Server-side middleware](/guide/authjs/server-side/session-access#endpoint-protection)                                      | ✅                                  | ❌
| Pre-made login-page                                               | ✅ (impacts bundle-size)            | ❌
| Database-adapters, server-side callback-hooks                     | ✅                                  | ❌

::: tip Still unsure what is best for you?
Join our [Discord](https://discord.gg/VzABbVsqAc) and share your use case!
:::
