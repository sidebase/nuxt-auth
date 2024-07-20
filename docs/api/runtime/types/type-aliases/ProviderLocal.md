[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / ProviderLocal

# ProviderLocal

```ts
type ProviderLocal: object;
```

Configuration for the `local`-provider.

## Type declaration

### endpoints?

```ts
optional endpoints: object;
```

Endpoints to use for the different methods. `nuxt-auth` will use this and the root-level `baseURL` to create the final request. E.g.:
- `baseURL=/api/auth`, `path=/login` will result in a request to `/api/auth/login`
- `baseURL=http://localhost:5000/_authenticate`, `path=/sign-in` will result in a request to `http://localhost:5000/_authenticate/sign-in`

### endpoints.getSession?

```ts
optional getSession: object;
```

What method and path to call to fetch user / session data from. `nuxt-auth` will send the token received upon sign-in as a header along this request to authenticate.

Refer to the `token` configuration to configure how `nuxt-auth` uses the token in this request. By default it will be send as a bearer-authentication header like so: `Authentication: Bearer eyNDSNJDASNMDSA....`

#### Default

```ts
{ path: '/session', method: 'get' }
```

#### Example

```ts
{ path: '/user', method: 'get' }
```

### endpoints.getSession.method?

```ts
optional method: RouterMethod;
```

### endpoints.getSession.path?

```ts
optional path: string;
```

### endpoints.signIn?

```ts
optional signIn: object;
```

What method and path to call to perform the sign-in. This endpoint must return a token that can be used to authenticate subsequent requests.

#### Default

```ts
{ path: '/login', method: 'post' }
```

### endpoints.signIn.method?

```ts
optional method: RouterMethod;
```

### endpoints.signIn.path?

```ts
optional path: string;
```

### endpoints.signOut?

```ts
optional signOut: object | false;
```

What method and path to call to perform the sign-out. Set to false to disable.

#### Default

```ts
{ path: '/logout', method: 'post' }
```

### endpoints.signUp?

```ts
optional signUp: object;
```

What method and path to call to perform the sign-up.

#### Default

```ts
{ path: '/register', method: 'post' }
```

### endpoints.signUp.method?

```ts
optional method: RouterMethod;
```

### endpoints.signUp.path?

```ts
optional path: string;
```

### pages?

```ts
optional pages: object;
```

Pages that `nuxt-auth` needs to know the location off for redirects.

### pages.login?

```ts
optional login: string;
```

Path of the login-page that the user should be redirected to, when they try to access a protected page without being logged in.

#### Default

```ts
'/login'
```

### session?

```ts
optional session: object;
```

Settings for the session-data that `nuxt-auth` receives from the `getSession` endpoint.

### session.dataResponsePointer?

```ts
optional dataResponsePointer: string;
```

How to extract the session-data from the session response.

E.g., setting this to `/data/user` and returning an object like `{ data: { user: { id:number, name: string } }, status: 'ok' }` from the `getSession` endpoint will
storing the 'User' object typed as the type created via the 'dataType' prop.

This follows the JSON Pointer standard, see it's RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901

#### Default

```ts
/ Access the root of the session response object
```

#### Example

```ts
/data/user  Access the `data/user` property of the session response object
```

### session.dataType?

```ts
optional dataType: SessionDataObject;
```

### token?

```ts
optional token: object;
```

Settings for the authentication-token that `nuxt-auth` receives from the `signIn` endpoint and that can be used to authenticate subsequent requests.

### token.cookieDomain?

```ts
optional cookieDomain: string;
```

The cookie domain.
See the specification here: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.3

#### Default

```ts
''
```

#### Example

```ts
'sidebase.io'
```

### token.cookieName?

```ts
optional cookieName: string;
```

It refers to the name of the property when it is stored in a cookie.

#### Default

```ts
auth.token
```

#### Example

```ts
auth._token
```

### token.headerName?

```ts
optional headerName: string;
```

Header name to be used in requests that need to be authenticated, e.g., to be used in the `getSession` request.

#### Default

```ts
Authorization
```

#### Example

```ts
Auth
```

### token.maxAgeInSeconds?

```ts
optional maxAgeInSeconds: number;
```

Maximum age to store the authentication token for. After the expiry time the token is automatically deleted on the application side, i.e., in the users' browser.

Note: Your backend may reject / expire the token earlier / differently.

#### Default

```ts
1800
```

#### Example

```ts
60 * 60 * 24
```

### token.sameSiteAttribute?

```ts
optional sameSiteAttribute: boolean | "lax" | "strict" | "none";
```

The cookie sameSite policy. See the specification here: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7

#### Default

```ts
'lax'
```

#### Example

```ts
'strict'
```

### token.secureCookieAttribute?

```ts
optional secureCookieAttribute: boolean;
```

Whether to set the secure flag on the cookie. This is useful when the application is served over HTTPS.

#### Default

```ts
false
```

#### Example

```ts
true
```

### token.signInResponseTokenPointer?

```ts
optional signInResponseTokenPointer: string;
```

How to extract the authentication-token from the sign-in response.

E.g., setting this to `/token/bearer` and returning an object like `{ token: { bearer: 'THE_AUTH_TOKEN' }, timestamp: '2023' }` from the `signIn` endpoint will
result in `nuxt-auth` extracting and storing `THE_AUTH_TOKEN`.

This follows the JSON Pointer standard, see it's RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901

#### Default

/token  Access the `token` property of the sign-in response object

#### Example

```ts
/       Access the root of the sign-in response object, useful when your endpoint returns a plain, non-object string as the token
```

### token.type?

```ts
optional type: string;
```

Header type to be used in requests. This in combination with `headerName` is used to construct the final authentication-header `nuxt-auth` uses, e.g, for requests via `getSession`.

#### Default

```ts
Bearer
```

#### Example

```ts
Beer
```

### type

```ts
type: Extract<SupportedAuthProviders, "local">;
```

Uses the `local` provider to facilitate authentication. Currently, two providers exclusive are supported:
- `authjs`: `next-auth` / `auth.js` based OAuth, Magic URL, Credential provider for non-static applications
- `local` or 'refresh': Username and password provider with support for static-applications

Read more here: https://sidebase.io/nuxt-auth/v0.6/getting-started
