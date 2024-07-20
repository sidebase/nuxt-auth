[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / ModuleOptionsNormalized

# ModuleOptionsNormalized

Configuration for the whole module.

## Extends

- [`ModuleOptions`](ModuleOptions.md)

## Properties

### baseURL?

```ts
optional baseURL: string;
```

Full url at which the app will run combined with the path to authentication. You can set this differently depending on your selected authentication-provider:
- `authjs`: You must set the full URL, with origin and path in production. You can leave this empty in development
- `local`: You can set a full URL, but can also leave this empty to fallback to the default value of `/api/auth` or set only the path.

### `authjs`

`baseURL` can be `undefined` during development but _must_ be set to the combination of origin + path that points to your `NuxtAuthHandler` for production. The origin consists out of:
- `scheme`: http / https
- `host`: e.g., localhost, example.org, google.com
- `port`: _empty_ (implies `:80`), :3000, :8888

The path then is a string like `/path/to/auth/api/endpoint/root`.

### `local`

Defaults to `/api/auth` for both development and production. Setting this is optional, if you set it you can set it to either:
- just a path: Will lead to `nuxt-auth` using `baseURL` as a relative path appended to the origin you deploy to. Example: `/backend/auth`
- an origin and a path: Will leav to `nuxt-auth` using `baseURL` as an absolute request path to perform requests to. Example: `https://example.com/auth`

Note: If you point to a different origin than the one you deploy to you likely have to take care of CORS: Allowing cross origin requests.

#### Examples

```ts
undefined
```

```ts
http://localhost:3000
```

```ts
https://example.org/_auth
```

```ts
https://my-cool-site.com/api/authentication
```

#### Default

http://localhost:3000/api/auth Default for `authjs` provider in development

#### Default

undefined                      Default for `authjs` in production, will result in an error

#### Default

/api/auth                      Default for `local` for both production and development

#### Inherited from

[`ModuleOptions`](ModuleOptions.md).[`baseURL`](ModuleOptions.md#baseurl)

***

### computed

```ts
computed: object;
```

#### fullBaseUrl

```ts
fullBaseUrl: string;
```

#### origin

```ts
origin: undefined | string;
```

#### pathname

```ts
pathname: string;
```

***

### disableServerSideAuth?

```ts
optional disableServerSideAuth: boolean;
```

Forces your server to send a "loading" status on all requests, prompting the client to fetch on the client. If your website has caching, this prevents the server from caching someone's authentication status.

This affects the entire site. For route-specific rules add `disableServerSideAuth` on `routeRules` instead:
   ```ts
   defineNuxtConfig({
     routeRules: {
       '/': { disableServerSideAuth: true }
     }
   })
   ```

#### Default

```ts
false
```

#### Inherited from

[`ModuleOptions`](ModuleOptions.md).[`disableServerSideAuth`](ModuleOptions.md#disableserversideauth)

***

### globalAppMiddleware

```ts
globalAppMiddleware: NonNullable<undefined | boolean | GlobalMiddlewareOptions>;
```

Whether to add a global authentication middleware that protects all pages. Can be either `false` to disable, `true` to enabled
or an object to enable and apply extended configuration.

If you enable this, everything is going to be protected and you can selectively disable protection for some pages by specifying `definePageMeta({ auth: false })`
If you disable this, everything is going to be public and you can selectively enable protection for some pages by specifying `definePageMeta({ auth: true })`

Read more on this topic [in the page protection docs](https://sidebase.io/nuxt-auth/v0.6/application-side/protecting-pages#global-middleware).

#### Examples

```ts
true
```

```ts
{ allow404WithoutAuth: true }
```

#### Default

```ts
false
```

#### Overrides

[`ModuleOptions`](ModuleOptions.md).[`globalAppMiddleware`](ModuleOptions.md#globalappmiddleware)

***

### isEnabled

```ts
isEnabled: boolean;
```

Whether the module is enabled at all

#### Overrides

[`ModuleOptions`](ModuleOptions.md).[`isEnabled`](ModuleOptions.md#isenabled)

***

### provider

```ts
provider: Required<NonNullable<undefined | AuthProviders>>;
```

Configuration of the authentication provider. Different providers are supported:
- auth.js: OAuth focused provider for non-static Nuxt 3 applications
- local: Provider for credentials & token based backends, e.g., written by yourself or provided by something like Laraval

Find more about supported providers here: https://sidebase.io/nuxt-auth/v0.6/getting-started

#### Overrides

[`ModuleOptions`](ModuleOptions.md).[`provider`](ModuleOptions.md#provider)

***

### sessionRefresh

```ts
sessionRefresh: SessionRefreshConfig;
```

Configuration of the application-side session.

#### Overrides

[`ModuleOptions`](ModuleOptions.md).[`sessionRefresh`](ModuleOptions.md#sessionrefresh)
