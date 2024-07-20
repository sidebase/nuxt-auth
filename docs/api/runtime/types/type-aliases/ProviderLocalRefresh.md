[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / ProviderLocalRefresh

# ProviderLocalRefresh

```ts
type ProviderLocalRefresh: Omit<ProviderLocal, "type"> & object;
```

Configuration for the `refresh`-provider an extended version of the local provider.

## Type declaration

### endpoints?

```ts
optional endpoints: object;
```

### endpoints.refresh?

```ts
optional refresh: object;
```

What method and path to call to perform the sign-in. This endpoint must return a token that can be used to authenticate subsequent requests.

#### Default

```ts
{ path: '/refresh', method: 'post' }
```

### endpoints.refresh.method?

```ts
optional method: RouterMethod;
```

### endpoints.refresh.path?

```ts
optional path: string;
```

### refreshOnlyToken?

```ts
optional refreshOnlyToken: boolean;
```

When refreshOnlyToken is set, only the token will be refreshed

#### Default

```ts
true
```

### refreshToken?

```ts
optional refreshToken: object;
```

### refreshToken.cookieDomain?

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

### refreshToken.cookieName?

```ts
optional cookieName: string;
```

It refers to the name of the property when it is stored in a cookie.

#### Default

```ts
auth.refresh-token
```

#### Example

```ts
auth._refresh-token
```

### refreshToken.maxAgeInSeconds?

```ts
optional maxAgeInSeconds: number;
```

Maximum age to store the authentication token for. After the expiry time the token is automatically deleted on the application side, i.e., in the users' browser.

Note: Your backend may reject / expire the token earlier / differently.

### refreshToken.refreshRequestTokenPointer?

```ts
optional refreshRequestTokenPointer: string;
```

How to do a fetch for the refresh token.

This is especially useful when you have an external backend signing tokens. Refer to this issue to get more information: https://github.com/sidebase/nuxt-auth/issues/635.

### Example
Setting this to `/refresh/token` would make Nuxt Auth send the `POST /api/auth/refresh` with the following BODY: `{ "refresh": { "token": "..." } }

### Notes
This follows the JSON Pointer standard, see its RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901

#### Default

```ts
'/refreshToken'
```

### refreshToken.secureCookieAttribute?

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

### refreshToken.signInResponseRefreshTokenPointer?

```ts
optional signInResponseRefreshTokenPointer: string;
```

How to extract the authentication-token from the sign-in response.

E.g., setting this to `/refreshToken/bearer` and returning an object like `{ refreshToken: { bearer: 'THE_AUTH_TOKEN' }, timestamp: '2023' }` from the `signIn` endpoint will
result in `nuxt-auth` extracting and storing `THE_AUTH_TOKEN`.

This follows the JSON Pointer standard, see its RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901

#### Default

'/refreshToken'  Access the `refreshToken` property of the sign-in response object

#### Example

```ts
/       Access the root of the sign-in response object, useful when your endpoint returns a plain, non-object string as the token
```

### type

```ts
type: Extract<SupportedAuthProviders, "refresh">;
```

Uses the `authjs` provider to facilitate authentication. Currently, two providers exclusive are supported:
- `authjs`: `next-auth` / `auth.js` based OAuth, Magic URL, Credential provider for non-static applications
- `local` or 'refresh': Username and password provider with support for static-applications

Read more here: https://sidebase.io/nuxt-auth/v0.6/getting-started
