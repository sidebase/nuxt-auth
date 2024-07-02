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

|                                                           	|                               authjs 	 | local 	| refresh
|-----------------------------------------------------------	|-------------------------------------:	 |------:	| ------:
| OAuth                                                        	|                    ✅ (>50 providers)  |     ❌ 	| ❌
| Magic URLs                                                	|                                    ✅ 	|     ❌ 	| ❌
| Credentials / Username + Password flow                     	| 🚧 (if possible: use `local` instead)  |     ✅ 	 | ✅
| Refresh tokens                                                |                                    ✅ 	|     ❌ 	| ✅

### Features

|                                                           	|                               authjs 	 | local 	| refresh
|-----------------------------------------------------------	|-------------------------------------:	 |------:	| ------:
| app `useAuth`-composable to sign-in, sign-out, ...        	|                                    ✅ 	|     ✅ 	| ✅
| session-management: auto-refresh, refresh on refocus, ... 	| ✅                                    	| ✅     	| ✅
| static apps ("nuxi generate")                             	| ❌                                    	| ✅     	| ✅
| guest mode                                                	| ✅                                    	| ✅     	| ✅
| app-side middleware                                       	| ✅                                    	| ✅     	| ✅
| server-side middleware                                    	| ✅                                    	| ✅     	| ✅
| pre-made login-page                                       	| ✅ (impacts bundle-size)              	| ❌     	| ❌
| database-adapters, server-side callback-hooks             	| ✅                                    	| ❌     	| ❌

::: tip Still unsure what is best for you?
Join our [Discord](https://discord.gg/VzABbVsqAc) and share your use case!
:::
