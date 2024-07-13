---
aside: false
---

# Which Provider should I pick?

To pick a provider you will first have to take into consideration the requirements of your use-case. In general one can say that picking:

- `authjs` is best suited for plug-and-play OAuth for established oauth-providers or magic-url based sign-ins
- `local` is best when you already have a backend that accepts username + password as a login or want to build a static application
- `refresh` if you would need to extend the functionality of the `local` provider, with a refresh token

If you are still unsure, below are some tables to help you pick:

### Authentication Methods

|                                                               | authjs                    | local     | refresh
|-------------------------------------------------------------- |------------------------:  |---------: | -------:
| OAuth                                                         | ✅ (>50 providers)         | ❌        | ❌
| Magic URLs                                                    | ✅                         | ❌        | ❌
| Credentials / Username + Password flow                        | 🚧 (use `local` instead)   | ✅        | ✅
| Refresh tokens                                                | ✅                         | ❌        | ✅

### Features

|                                                                                                | authjs | local | refresh
|----------------------------------------------------------------------------------------------- |------: |-----: | ------:
| [`useAuth`-composable](/guide/application-side/session-access) to sign in/out, refresh a session, etc. | ✅ | ✅ | ✅
| Session-management: auto-refresh, refresh on refocus, ...                                      | ✅      | ✅    | ✅
| Static apps ("nuxi generate")                                                                  | ❌      | ✅    | ✅
| [Guest mode](/guide/application-side/protecting-pages#guest-mode)                              | ✅      | ✅    | ✅
| [App-side middleware](/guide/application-side/protecting-pages)                                | ✅      | ✅    | ✅
| [Server-side middleware](/guide/authjs/server-side/session-access#endpoint-protection)         | ✅      | ✅    | ✅
| Pre-made login-page                                                                            | ✅      | ❌    | ❌
| Database-adapters, server-side callback-hooks                                                  | ✅      | ❌    | ❌

::: tip Still unsure what is best for you?
Join our [Discord](https://discord.gg/VzABbVsqAc) and share your use case!
:::
