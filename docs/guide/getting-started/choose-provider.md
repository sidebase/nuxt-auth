---
title: Choosing a Provider
group: Getting Started
---

# Which Provider should I pick?

To pick a provider you will first have to take into consideration the
requirements of your use-case. In general one can say that picking:

- `authjs` is best suited for plug-and-play OAuth for established oauth-providers
  or magic-url based sign-ins.
- `local` is best when you already have a backend that accepts username +
  password as a login or want to build a static application. The Local Provider
  also supports refresh tokens since `v0.9.0`.

> **Note:** In `v0.9.0` the `refresh` provider was integrated into the `local`
> provider. Read the upgrade guide for details.

If you are still unsure, below are some tables to help you pick:

### Authentication Methods

| Feature                                    | authjs provider      | local provider |
| ------------------------------------------ | -------------------: | -------------: |
| OAuth                                      | Yes (>50 providers)  | No             |
| Magic URLs                                 | Yes                  | No             |
| Credentials / Username + Password flow     | Partial (prefer local) | Yes          |
| Refresh tokens                             | Yes                  | Yes            |

### Features

| Feature                                    | authjs provider      | local provider |
| ------------------------------------------ | -------------------: | -------------: |
| `useAuth` composable                       | Yes                  | Yes            |
| Session-management (auto-refresh, etc.)    | Yes                  | Yes            |
| Static apps ("nuxi generate")              | No                   | Yes            |
| Guest mode                                 | Yes                  | Yes            |
| App-side middleware                        | Yes                  | Yes            |
| Server-side middleware                     | Yes                  | No             |
| Pre-made login-page                        | Yes (impacts bundle) | No             |
| Database-adapters, server-side callbacks   | Yes                  | No             |

> **Tip:** Still unsure what is best for you? Open an issue on GitHub to
> discuss your use case!
