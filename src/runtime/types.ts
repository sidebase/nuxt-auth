import type { ComputedRef, Ref } from 'vue'

/**
 * Configuration for the global application-side authentication-middleware.
 *
 * The global middleware is always enabled and protects all pages by default.
 * Individual pages can opt out by setting `definePageMeta({ auth: false })`.
 */
export interface GlobalMiddlewareOptions {
  /**
   * Whether to automatically set the callback url to the page the user tried to visit when the middleware stopped them. This is useful to disable this when using the credentials provider, as it does not allow a `callbackUrl`. Setting this
   * to a string-value will result in that being used as the callbackUrl path. Note: You also need to set the global `addDefaultCallbackUrl` setting to `false` if you want to fully disable this.
   *
   * @example false
   * @example /i-caught-you-but-now-you-are-signed-in
   * @default true
   */
  addDefaultCallbackUrl?: boolean | string
}

/**
 * Configuration for the `authjs`-provider.
 */
export interface ProviderAuthjs {
  /**
   * Uses the `authjs` provider to facilitate authentication.
   * Uses the Auth.js provider for authentication.
   */
  type: 'authjs'
  /**
   * If set to `true`, `authjs` will use either the `x-forwarded-host` or `host` headers instead of `auth.baseURL`.
   *
   * Make sure that reading `x-forwarded-host` on your hosting platform can be trusted.
   * - ⚠ **This is an advanced option.** Advanced options are passed the same way as basic options,
   * but **may have complex implications** or side effects.
   * You should **try to avoid using advanced options** unless you are very comfortable using them.
   * @default false
   */
  trustHost?: boolean
  /**
   * Select the default-provider to use when `signIn` is called. Setting this here will also effect the global middleware behavior: E.g., when you set it to `github` and the user is unauthorized, they will be directly forwarded to the Github OAuth page instead of seeing the app-login page.
   *
   * @example "github"
   * @default undefined
   */
  defaultProvider?: string
  /**
   * Whether to add a callbackUrl to sign in requests. Setting this to a string-value will result in that being used as the callbackUrl path. Setting this to `true` will result in the blocked original target path being chosen (if it can be determined).
   */
  addDefaultCallbackUrl?: boolean | string
}

/** @internal */
export type AuthProviders = ProviderAuthjs

export interface RefreshHandler {
  /**
   * Initializes the refresh handler.
   * Will be called inside `app:mounted` lifecycle hook.
   */
  init: () => void

  /**
   * Handles cleanup of the refresh handler. Will be called on `unmount` app hook.
   */
  destroy: () => void
}

/** @internal */
export interface DefaultRefreshHandlerConfig {
  /**
   * Whether to refresh the session every `X` milliseconds. Set this to `false` to turn it off. The session will only be refreshed if a session already exists.
   *
   * Setting this to `true` will refresh the session every second.
   * Setting this to `false` will turn off session refresh.
   * Setting this to a number `X` will refresh the session every `X` milliseconds.
   *
   * @example 1000
   * @default false
   */
  enablePeriodically?: number | boolean
  /**
   * Whether to refresh the session every time the browser window is refocused.
   *
   * @example false
   * @default true
   */
  enableOnWindowFocus?: boolean
}

/**
 * Configuration for the application-side session.
 */
export interface SessionRefreshConfig extends DefaultRefreshHandlerConfig {
  /**
   * A custom refresh handler to use. This can be used to implement custom session refresh logic. If not set, the default refresh handler will be used.
   *
   * @example './config/MyCustomRefreshHandler'
   * @default undefined
   */
  handler?: string
}

/**
 * Configuration for the whole module.
 */
export interface ModuleOptions {
  /**
   * Whether the module is enabled at all
   */
  isEnabled?: boolean
  /**
   * Disables the Nuxt `$fetch` optimization. Do so when your auth logic is not handled by a Nuxt server (e.g. when using an external backend).
   *
   * Disabling the optimisation means that NuxtAuth will prefer calling `baseURL` + path instead of just path,
   * which would often translate to an HTTP call.
   *
   * ## Example
   * With `disableInternalRouting: true` and `baseURL: 'https://example.com/api/auth'` your calls would be made to `https://example.com/api/auth` endpoints instead of `/api/auth`.
   *
   * @default false
   * @see https://nuxt.com/docs/api/utils/dollarfetch
   */
  disableInternalRouting?: boolean
  /**
   * Forces your server to send a "loading" status on all requests, prompting the client to fetch on the client. If your website has caching, this prevents the server from caching someone's authentication status.
   *
   * This affects the entire site. For route-specific rules add `disableServerSideAuth` on `routeRules` instead:
      ```ts
      defineNuxtConfig({
        routeRules: {
          '/': { disableServerSideAuth: true }
        }
      })
      ```
   *
   * @default false
   */
  disableServerSideAuth?: boolean
  /**
   * The name of the environment variable that holds the origin of the application. This is used to determine the full URL of the application in production.
   * As an example, if you set `NUXT_AUTH_ORIGIN=http://example.org` in your `.env` file, the module will use this to determine the full URL of the application.
   *
   * This is required in production to generate correct callback URLs.
   *
   * @default 'AUTH_ORIGIN'
   */
  originEnvKey?: string
  /**
   * Full URL at which the app will run combined with the path to authentication.
   *
   * `baseURL` can be `undefined` during development but _must_ be set to the combination of origin + path that points to your `NuxtAuthHandler` for production. The origin consists of:
   * - `scheme`: http / https
   * - `host`: e.g., localhost, example.org, google.com
   * - `port`: _empty_ (implies `:80`), :3000, :8888
   *
   * The path then is a string like `/path/to/auth/api/endpoint/root`.
   *
   * @example undefined
   * @example http://localhost:3000
   * @example https://example.org/_auth
   * @example https://my-cool-site.com/api/authentication
   * @default /api/auth
   */
  baseURL?: string
  /**
   * Configuration of the authentication provider using Auth.js (OAuth focused provider for Nuxt 4 applications).
   */
  provider?: AuthProviders
  /**
   * Configuration of the application-side session.
   */
  sessionRefresh?: SessionRefreshConfig
}

export type AuthMeta =
  | boolean
  | { mode: 'protected'; redirectTo?: string }
  | { mode: 'guest'; redirectTo?: string }
  | {
      unauthenticatedOnly: boolean
      navigateAuthenticatedTo?: string
      navigateUnauthenticatedTo?: string
    }

export interface RouteOptions {
  /**
   * Forces your server to send a "loading" status on a route, prompting the client to fetch on the client. If a specific page has caching, this prevents the server from caching someone's authentication status.
   *
   * @default false
   */
  disableServerSideAuth: boolean
}

// Common useAuthStatus & useAuth return-types

/**
 * Timestamp of the last session refresh, or undefined if never refreshed.
 * @internal
 */
export type SessionLastRefreshedAt = Date | undefined

/** Current authentication status */
export type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'

/**
 * Wrapped session data as a Vue ref.
 * @internal
 */
export type WrappedSessionData<SessionData> = Ref<
  SessionData | null | undefined
>

/** @internal */
export interface GetSessionFunc<SessionData> {
  (getSessionOptions?: {
    required?: boolean
    callbackUrl?: string
    onUnauthenticated?: () => void
  }): Promise<SessionData | null | void>
}

/** @internal */
export interface CommonUseAuthReturn<SignIn, SignOut, SessionData> {
  data: Readonly<WrappedSessionData<SessionData>>
  lastRefreshedAt: Readonly<Ref<SessionLastRefreshedAt>>
  status: ComputedRef<SessionStatus>
  signIn: SignIn
  signOut: SignOut
  getSession: GetSessionFunc<SessionData>
  refresh: () => Promise<unknown>
}

/** @internal */
export interface CommonUseAuthStateReturn<SessionData> {
  data: WrappedSessionData<SessionData>
  loading: Ref<boolean>
  lastRefreshedAt: Ref<SessionLastRefreshedAt>
  status: ComputedRef<SessionStatus>
}

/** @internal */
export interface ModuleOptionsNormalized extends ModuleOptions {
  isEnabled: boolean
  baseURL: string
  disableInternalRouting: boolean
  // Cannot use `DeepRequired` here because it leads to build issues
  provider: Required<NonNullable<ModuleOptions['provider']>>
  sessionRefresh: NonNullable<ModuleOptions['sessionRefresh']>
  globalAppMiddleware?: Required<GlobalMiddlewareOptions>
  originEnvKey: string
}
