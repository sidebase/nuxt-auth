---
aside: false
---

# REST API

All endpoints that NextAuth.js supports are also supported by `nuxt-auth`:

| Endpoint                          | Request      | Description                                                    |
|-----------------------------------|:-------------|:---------------------------------------------------------------|
| `${baseURL}/signin`              | `GET`        | Displays the built-in/unbranded sign-in                        |
| `${baseURL}/signin/:provider`    | `POST`       | Starts a provider-specific sign-in                             |
| `${baseURL}/callback/:provider`  | `GET` `POST` | Handles returning requests from OAuth services during sign-in  |
| `${baseURL}/signout`             | `GET` `POST` | Displays the built-in/unbranded sign out                       |
| `${baseURL}/session`             | `GET`        | Returns client-safe session object                             |
| `${baseURL}/csrf`                | `GET`        | Returns object containing CSRF                                 |
| `${baseURL}/providers`           | `GET`        | Returns a list of configured OAuth providers                   |

The `baseURL` is `/api/auth` per default and [can be configured in the `nuxt.config.ts`](/guide/application-side/configuration#baseurl).

You can directly interact with these API endpoints if you wish to, it's probably a better idea to use `useAuth` where possible though. [See the full rest API documentation of NextAuth.js here](https://next-auth.js.org/getting-started/rest-api).
