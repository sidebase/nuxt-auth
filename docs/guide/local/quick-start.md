# Local / Refresh provider

This guide is for setting up `@sidebase/nuxt-auth` with the Local / Refresh Provider, which is best suited for when you already have a backend that accepts username + password as a login or want to build a static application.

The `refresh` provider is based on the `local` provider and extends its functionality by adding support for refresh tokens. 

## Configuration

The entire configuration for the `local` and `refresh` providers is contained inside the `nuxt.config.ts`. Inside the `auth` options, set your provider to either `local` or `refresh`. In this example, we will configure the `local` provider, however the same configuration applies to the `refresh` provider as well.

```ts
export default defineNuxtConfig({
    modules: ['@sidebase/nuxt-auth'],
    auth: {
        baseURL: '/api/auth',
        provider: {
            type: 'local' // or 'refresh'
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
        baseURL: '/api/auth'
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
)}
```

Each endpoint, consists of an object, with a `path` and `method`. When a user triggers an action inside your application a request will be made to each endpoint. When a request is made to the `getSession` endpoint, a token will be sent as a header. You can configure the headers and token below. 

In the example above requests would be made to the following URLs:

- **Sign in:** `/api/auth/login` (POST)
- **Sign out** `/api/auth/logout` (POST)
- **Sign up:** `/api/auth/register` (POST)
- **Get Session:** `/api/auth/session` (GET)

:::info
Relative paths starting with a `/` (e.g. `/login`) will be treated as a part of your Nuxt application. If you want to use an external backend, please provide fully-specified URLs instead.
:::

You can customize each endpoint to fit your needs or disable it by setting it to `false`. For example you may want to disable the `signUp` endpoint.

```ts{7}
{  
    auth: {
        baseURL: '/api/auth',
        provider: {      
            type: 'local',
            endpoints: {        
                signUp: false
            }    
        }  
    }
}
```

:::warning
You cannot disable the `getSession` endpoint, as NuxtAuth internally uses it to determine the authentication status. 
:::

### Refresh provider

If you are using the refresh provider, you can additionally define a `refresh` endpoint, which will be used to refresh the access token upon expiry. 

```ts
endpoints: {
    signIn: { path: '/login', method: 'post' },
    signOut: { path: '/logout', method: 'post' },
    signUp: { path: '/register', method: 'post' },
    getSession: { path: '/session', method: 'get' },
    refresh: { path: '/refresh', method: 'post' } // [!code ++]
}
```

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
                cookieDomain: 'sidebase.io'
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

## Refresh token

:::tip
This section only applies to applications using the `refresh` provider.
:::

If using the `refresh` provider, a seperate `refreshToken` configuration can also be passed to configure how the refresh token is handled.

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
                cookieDomain: 'sidebase.io'
            },
            refreshToken: {
                signInResponseRefreshTokenPointer: '/refresh-token',
                refreshRequestTokenPointer: 'Bearer',
                cookieName: 'auth.token',
                maxAgeInSeconds: 1800,
                cookieDomain: 'sidebase.io'
            }
        }
    }
})
```

### `signInResponseRefreshTokenPointer`

- **Type:** `string`
- **Default:** `'/refreshToken'`

How to extract the authentication-refreshToken from the sign-in response.

E.g., setting this to `/token/refreshToken` and returning an object like `{ token: { refreshToken: 'THE_REFRESH__TOKEN' }, timestamp: '2023' }` from the `signIn` endpoint will result in `nuxt-auth` extracting and storing `THE_REFRESH__TOKEN`.

This follows the JSON Pointer standard, see its RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901

### `refreshRequestTokenPointer`

- **Type:** `string`
- **Default:** `'/refreshToken'`

How to do a fetch for the refresh token. This is especially useful when you have an external backend signing tokens. Refer to this issue to get more information: https://github.com/sidebase/nuxt-auth/issues/635.

### `cookieName`

- **Type:** `string`
- **Default:** `'auth.refresh-token'`

It refers to the name of the property when it is stored in a cookie.

### `maxAgeInSeconds`

- **Type:** `number`
- **Default:** `1800`
  
Maximum age to store the authentication token for. After the expiry time the token is automatically deleted on the application side, i.e. in the user's browser.

Note: Your backend may reject / expire the refreshToken earlier / differently.

### `cookieDomain`

- **Type:** `string`
- **Default:** `''`

The cookie domain. See the specification here: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.3

## `refreshOnlyToken`

:::tip
This section only applies to applications using the `refresh` provider.
:::

- **Type:** `boolean`
- **Default:** `true`

When refreshOnlyToken is set, only the token will be refreshed

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
