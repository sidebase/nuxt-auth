# Local provider

This guide is for setting up `@sidebase/nuxt-auth` with the Local Provider, which is best suited for when you already have a backend that accepts username + password as a login or want to build a static application. The Local Provider also supports refresh tokens since `v0.9.0`.

:::warning Breaking change
In `v0.9.0` the `refresh` provider was integrated into the `local` provider. Read the [upgrade guide](/upgrade/version-0.9.0).
:::

## Configuration

The entire configuration for the `local` provider is contained inside the `nuxt.config.ts`. Inside the `auth` options, set your provider to `local`.

```ts
export default defineNuxtConfig({
  modules: ['@sidebase/nuxt-auth'],
  auth: {
    baseURL: '/api/auth',
    provider: {
      type: 'local'
    }
  }
})
```

:::tip
Ensure that your `baseURL` is properly configured to match your backend API. Read more [here](/guide/application-side/configuration#local-and-refresh).
:::

## API endpoints

Afterwards, you can define the endpoints to which the authentication requests will be made:

```ts
export default defineNuxtConfig({
  // ...Previous configuration
  auth: {
    baseURL: '/api/auth',
    provider: {
      type: 'local',
      endpoints: {
        signIn: { path: '/login', method: 'post' },
        signOut: { path: '/logout', method: 'post' },
        signUp: { path: '/register', method: 'post' },
        getSession: { path: '/session', method: 'get' },
      }
    }
  }
})
```

Each endpoint, consists of an object, with a `path` and `method`. When a user triggers an action inside your application a request will be made to each endpoint. When a request is made to the `getSession` endpoint, a token will be sent as a header. You can configure the headers and token below.

In the example above requests would be made to the following URLs:

- **Sign in:** `/api/auth/login` (POST)
- **Sign out** `/api/auth/logout` (POST)
- **Sign up:** `/api/auth/register` (POST)
- **Get Session:** `/api/auth/session` (GET)

:::info
Relative paths starting with a `/` (e.g. `/login`) will be treated as a part of your Nuxt application. If you want to use an external backend, please provide fully-specified URLs instead. Read more [here](#using-an-external-backend).
:::

You can customize each endpoint to fit your needs or disable it by setting it to `false`. For example you may want to disable the `signUp` endpoint.

```ts{7}
export default defineNuxtConfig({
    auth: {
        baseURL: '/api/auth',
        provider: {
            type: 'local',
            endpoints: {
                signUp: false
            }
        }
    }
})
```

:::warning
You cannot disable the `getSession` endpoint, as NuxtAuth internally uses it to determine the authentication status.
:::

### Using an external backend

When using the `local` provider to access an external backend, please consider that the module will attempt to resolve the API endpoints by using internal Nuxt 3 relative URLs or an external call.

To ensure that the module can properly identify that your endpoints point to an external URL, please ensure the following:

1. `auth.baseURL` **includes** a trailing `/` at the end
2. `auth.endpoints` **do not** include a leading `/` at the start

```ts{7}
export default defineNuxtConfig({
    auth: {
        baseURL: 'https://external-api.com', // [!code --]
        baseURL: 'https://external-api.com/', // [!code ++]
        provider: {
            type: 'local',
            endpoints: {
                signIn: { path: '/login', method: 'post' }, // [!code --]
                signIn: { path: 'login', method: 'post' }, // [!code ++]
                getSession: { path: '/session', method: 'get' }, // [!code --]
                getSession: { path: 'session', method: 'get' }, // [!code ++]
            }
        }
    }
})
```

You can read more about the path resolving logic in `@sidebase/nuxt-auth` [here](https://github.com/sidebase/nuxt-auth/issues/782#issuecomment-2223861422).

## Token

The `local` and `refresh` providers are both based on exchanging access tokens with your backend. NuxtAuth expects an access token to be provided by the `signIn` endpoint, which will then be saved into the session to authenticate further requests to e.g. `getSession`.

The configuration of the `token` properties depend on how your backend accepts and returns data. The options are designed to be as adaptable as possible, to account for many different types of backends.

```ts
export default defineNuxtConfig({
  // Previous configuration
  auth: {
    provider: {
      type: 'local',
      token: {
        signInResponseTokenPointer: '/token',
        type: 'Bearer',
        cookieName: 'auth.token',
        headerName: 'Authorization',
        maxAgeInSeconds: 1800,
        sameSiteAttribute: 'lax',
        cookieDomain: 'sidebase.io',
        secureCookieAttribute: false,
        httpOnlyCookieAttribute: false,
      }
    }
  }
})
```

### `signInResponseTokenPointer`

- **Type:** `string`
- **Default:** `'/token'`

How to extract the authentication-token from the sign-in response.

For example, if you have a response object like `{ token: { bearer: 'THE_AUTH_TOKEN' }, timestamp: '2023' }`, using `signInResponseTokenPointer: '/token/bearer'` will result in `nuxt-auth` extracting and storing `THE_AUTH_TOKEN`.

This follows the JSON Pointer standard, see it's RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901

### `type`

Header type to be used in requests. This in combination with `headerName` is used to construct the final authentication-header `nuxt-auth` uses, e.g. for requests via `getSession`.

- **Type:** `string`
- **Default:** `'Bearer'`

### `cookieName`

Refers to the name of the property when it is stored in a cookie.

- **Type:** `string`
- **Default:** `'auth.token'`

### `headerName`

Header name to be used in requests that need to be authenticated, e.g., to be used in the `getSession` request.

- **Type:** `string`
- **Default:** `'Authorization'`

### `maxAgeInSeconds`

Maximum age to store the authentication token for. After the expiry time the token is automatically deleted on the application side, i.e. in the user's browser.

Note: Your backend may reject / expire the token earlier / differently.

- **Type:** `number`
- **Default:** `1800`

### `sameSiteAttribute`

The cookie sameSite policy. Can be used as a form of CSRF protection. If set to `strict`, the cookie will only be passed with requests to the same 'site'. Typically, this includes subdomains. So, a `sameSite: strict` cookie set by app.mysite.com will be passed to api.mysite.com, but not api.othersite.com.

See the specification here: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7

- **Type:** `boolean | 'lax' | 'strict' | 'none' | undefined`
- **Default:** `'lax'`

### `cookieDomain`

The cookie domain. See the specification here: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.3

- **Type:** `string`
- **Default:** `''`

### `secureCookieAttribute`

If set, the cookie will be only sent through `HTTPS` protocol. See the specification here : https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.5

-   **Type:** `boolean`
-   **Default:** `'false'`

### `httpOnlyCookieAttribute`

If set, the cookie will not be accessible from JavaScript. See the specification here : https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.6

-   **Type:** `boolean`
-   **Default:** `'false'`

## Refresh

A seperate `refresh` configuration can also be passed to configure how the refresh token is handled.

```ts
export default defineNuxtConfig({
  auth: {
    provider: {
      type: 'local',
      refresh: {
        isEnabled: true,
        endpoint: { path: '/refresh', method: 'POST' },
        refreshOnlyToken: true,
        token: {
          signInResponseRefreshTokenPointer: '/refresh-token',
          refreshResponseTokenPointer: '',
          refreshRequestTokenPointer: '/refresh-token',
          cookieName: 'auth.token',
          maxAgeInSeconds: 1800,
          sameSiteAttribute: 'lax',
          secureCookieAttribute: false,
          cookieDomain: 'sidebase.io',
          httpOnlyCookieAttribute: false,
        }
      },
    }
  }
})
```

### `isEnabled`

- **Type:** `boolean`
- **Default:** `false`

If the local provider should make automatic `refresh` requests to retrieve a new new `token`. If `isEnabled` is set to:

- `false`: The provider will behave like the `local` provider prior to `v0.9.0`
- `true`: The provider will behave like the `refresh` provider prior to`v0.9.0`

### `endpoint`

- **Type:** `boolean`
- **Default:** `{ path: '/refresh', method: 'post' }`

The endpoint to which `refresh` requests are made. The configuration of the `refresh` endpoint matches the configuration of the other endpoints. Read more [here](#api-endpoints).

```ts
export default defineNuxtConfig({
  auth: {
    provider: {
      type: 'local',
      refresh: {
        endpoint: {
          path: '/refresh',
          method: 'POST'
        }
      }
    }
  }
})
```

### `refreshOnlyToken`

- **Type:** `boolean`
- **Default:** `true`

When refreshOnlyToken is set, only the `token` will be refreshed and the `refreshToken` will stay the same. (This is helpful when only the `login` endpoint returns a `refreshToken`)

### `token`

#### `signInResponseRefreshTokenPointer`

- **Type:** `string`
- **Default:** `'/refreshToken'`

How to extract the authentication-refreshToken from the sign-in response.

E.g., setting this to `/token/refreshToken` and returning an object like `{ token: { refreshToken: 'THE_REFRESH__TOKEN' }, timestamp: '2023' }` from the `signIn` endpoint will result in `nuxt-auth` extracting and storing `THE_REFRESH__TOKEN`.

This follows the JSON Pointer standard, see its RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901

#### `refreshResponseTokenPointer`

- **Type:** `string`
- **Default:** `'/token'`

How to extract the authentication-token from the refresh response.

E.g., setting this to `/token/bearer` and returning an object like `{ token: { bearer: 'THE_AUTH_TOKEN' }, timestamp: '2023' }` from the `refresh` endpoint will result in `nuxt-auth` extracting and storing `THE_AUTH_TOKEN`.

This follows the JSON Pointer standard, see its RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901

#### `refreshRequestTokenPointer`

- **Type:** `string`
- **Default:** `'/refreshToken'`

How to do a fetch for the refresh token. This is especially useful when you have an external backend signing tokens. Refer to this issue to get more information: https://github.com/sidebase/nuxt-auth/issues/635.

#### `cookieName`

- **Type:** `string`
- **Default:** `'auth.refresh-token'`

It refers to the name of the property when it is stored in a cookie.

#### `maxAgeInSeconds`

- **Type:** `number`
- **Default:** `1800`

Maximum age to store the authentication token for. After the expiry time the token is automatically deleted on the application side, i.e. in the user's browser.

Note: Your backend may reject / expire the refreshToken earlier / differently.

#### `cookieDomain`

- **Type:** `string`
- **Default:** `''`

The cookie domain. See the specification here: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.3

#### `secureCookieAttribute`

If set, the cookie will be only sent through `HTTPS` protocol. See the specification here : https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.5

-   **Type:** `boolean`
-   **Default:** `'false'`

#### `httpOnlyCookieAttribute`

If set, the cookie will not be accessible from JavaScript. See the specification here : https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.6

-   **Type:** `boolean`
-   **Default:** `'false'`

## Pages

Configure the path of the login-page that the user should be redirected to, when they try to access a protected page without being logged in. This page will also not be blocked by the global middleware.

```ts
export default defineNuxtConfig({
  // previous configuration
  auth: {
    provider: {
      type: 'local',
      pages: {
        login: '/login'
      }
    }
  }
})
```
