[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / ProviderAuthjs

# ProviderAuthjs

```ts
type ProviderAuthjs: object;
```

Configuration for the `authjs`-provider.

## Type declaration

### addDefaultCallbackUrl?

```ts
optional addDefaultCallbackUrl: boolean | string;
```

Whether to add a callbackUrl to sign in requests. Setting this to a string-value will result in that being used as the callbackUrl path. Setting this to `true` will result in the blocked original target path being chosen (if it can be determined).

### defaultProvider?

```ts
optional defaultProvider: SupportedProviders;
```

Select the default-provider to use when `signIn` is called. Setting this here will also effect the global middleware behavior: E.g., when you set it to `github` and the user is unauthorized, they will be directly forwarded to the Github OAuth page instead of seeing the app-login page.

#### Example

```ts
"github"
```

#### Default

```ts
undefined
```

### trustHost?

```ts
optional trustHost: boolean;
```

If set to `true`, `authjs` will use either the `x-forwarded-host` or `host` headers instead of `auth.baseURL`.

Make sure that reading `x-forwarded-host` on your hosting platform can be trusted.
- ⚠ **This is an advanced option.** Advanced options are passed the same way as basic options,
but **may have complex implications** or side effects.
You should **try to avoid using advanced options** unless you are very comfortable using them.

#### Default

```ts
false
```

### type

```ts
type: Extract<SupportedAuthProviders, "authjs">;
```

Uses the `authjs` provider to facilitate autnetication. Currently, two providers exclusive are supported:
- `authjs`: `next-auth` / `auth.js` based OAuth, Magic URL, Credential provider for non-static applications
- `local` or `refresh`: Username and password provider with support for static-applications

Read more here: https://sidebase.io/nuxt-auth/v0.6/getting-started
