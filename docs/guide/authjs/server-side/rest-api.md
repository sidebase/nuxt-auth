---
aside: false
---

# REST API

All endpoints that NextAuth.js supports are also supported by `nuxt-auth`:

| Endpoint                          | Request      | Description                                                    |
|-----------------------------------|:-------------|:---------------------------------------------------------------|
| `${basePath}/signin`              | `GET`        | Displays the built-in/unbranded sign-in                        |
| `${basePath}/signin/:provider`    | `POST`       | Starts a provider-specific sign-in                             |
| `${basePath}/callback/:provider`  | `GET` `POST` | Handles returning requests from OAuth services during sign-in  |
| `${basePath}/signout`             | `GET` `POST` | Displays the built-in/unbranded sign out                       |
| `${basePath}/session`             | `GET`        | Returns client-safe session object                             |
| `${basePath}/csrf`                | `GET`        | Returns object containing CSRF                                 |
| `${basePath}/providers`           | `GET`        | Returns a list of configured OAuth providers                   |

The `basePath` is `/api/auth` per default and can be configured in the `nuxt.config.ts`.

You can directly interact with these API endpoints if you wish to, it's probably a better idea to use `useAuth` where possible though. [See the full rest API documentation of NextAuth.js here](https://next-auth.js.org/getting-started/rest-api).
