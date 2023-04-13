import type { Ref, ComputedRef } from 'vue'
import { RouterMethod } from 'h3'
import { SupportedProviders } from './runtime/composables/authjs/useAuth'

export type SupportedAuthBackends = 'authjs' | 'local'

interface GlobalMiddlewareOptions {
  // TODO: Write docstring
  isEnabled: boolean
  /**
   * Whether to enforce authentication if the target-route does not exist. Per default the middleware redirects
   * to Nuxts' default 404 page instead of forcing a sign-in if the target does not exist. This is to avoid a
   * user-experience and developer-experience of having to sign-in only to see a 404 page afterwards.
   *
   * Note: Setting this to `false` this may lead to `vue-router` + node related warnings like: "Error [ERR_HTTP_HEADERS_SENT] ...",
   * this may be related to https://github.com/nuxt/framework/issues/9438.
   *
   * @example false
   * @default true
   */
  allow404WithoutAuth?: boolean
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

// TODO: Come up with better name for this
type BackendRemoteCommon = {
  // TODO: Can we merge origin and basePath?
  // TODO: Improve docstrings here ->> we want to be clear that this is merged origin and path
  /**
   * Full url at which the app will run and path to authentication.
   * The path to the endpoint that you've added `NuxtAuth` at via `export default NuxtAuthHandler({ ... })`. See the getting started for more: https://github.com/sidebase/nuxt-auth#quick-start
   *
   * Can be `undefined` during development but _must_ be set for production. This is the origin-part of the NEXTAUTH_URL. The origin consists out of:
   * - `scheme`: http / https
   * - `host`: e.g., localhost, example.org, google.com
   * - `port`: _empty_ (implies `:80`), :3000, :8888
   *
   * See https://next-auth.js.org/configuration/options#nextauth_url for more on this. Note that nextauth uses the full url as one.
   *
   * @example undefined
   * @example http://localhost:3000
   * @example https://example.org/_auth
   * @default http://localhost:3000/api/auth
   */
  baseURL: string | undefined
}

// TODO: Write docstrings
type BackendLocal = {
  // TODO: COME UP WITH BETTER NAME
  type: Extract<SupportedAuthBackends, 'local'>
  endpoints: {
    signIn: { path: string, method: RouterMethod },
    signOut: { path: string, method: RouterMethod },
    signUp: { path: string, method: RouterMethod },
    getSession: { path: string, method: RouterMethod },
  },
  pages: {
    login: string
  },
  token: {
    signInResponseJsonPointerToToken: string
    type: string,
    headerName: string,
    maxAgeInSeconds: number,
  }
} & BackendRemoteCommon

export type BackendAuthJS = {
  type: Extract<SupportedAuthBackends, 'authjs'>
  // TODO: This is not nuxt auth, but rather authjs specific -> update docstring in that regard
  /**
   * If set to `true`, `NuxtAuth` will use either the `x-forwarded-host` or `host` headers,
   * instead of `auth.origin`
   * Make sure that reading `x-forwarded-host` on your hosting platform can be trusted.
   * - ⚠ **This is an advanced option.** Advanced options are passed the same way as basic options,
   * but **may have complex implications** or side effects.
   * You should **try to avoid using advanced options** unless you are very comfortable using them.
   * @default false
   */
  trustHost: boolean
  /**
   * Select the default-provider to use when `signIn` is called. Setting this here will also effect the global middleware behavior: E.g., when you set it to `github` and the user is unauthorized, they will be directly forwarded to the Github OAuth page instead of seeing the app-login page.
   *
   * @example "github"
   * @default undefined
   */
  defaultProvider: SupportedProviders | undefined
  /**
   * Whether to add a callbackUrl to sign in requests. Setting this to a string-value will result in that being used as the callbackUrl path. Setting this to `true` will result in the blocked original target path being chosen (if it can be determined).
   */
  addDefaultCallbackUrl: boolean | string
} & BackendRemoteCommon

export type AuthBackends = BackendAuthJS | BackendLocal

type SessionConfig = {
  /**
   * Whether to refresh the session every `X` milliseconds. Set this to `false` to turn it off. The session will only be refreshed if a session already exists.
   *
   * Setting this to `true` will refresh the session every second.
   * Setting this to `false` will turn off session refresh.
   * Setting this to a number `X` will refresh the session every `X` milliseconds.
   *
   * @example 1000
   * @default false
   *
   */
  enableRefreshPeriodically: number | boolean
  /**
   * Whether to refresh the session every time the browser window is refocused.
   *
   * @example false
   * @default true
   */
  enableRefreshOnWindowFocus: boolean
}

export interface ModuleOptions {
  /**
   * Whether the module is enabled at all
   */
  isEnabled?: boolean
  /**
   * Configuration of the authentication backend. Different backends are supported:
   * - [auth.js](https://authjs.dev/)
   * - TODO
   */
  backend?: AuthBackends
  /**
   * TODO: Write extended docstring
   */
  session?: SessionConfig
  /**
   * Whether to add a global authentication middleware that protects all pages. Can be either `false` to disable, `true` to enabled
   * or an object to enable and apply extended configuration.
   *
   * @example true
   * @example { allow404WithoutAuth: true }
   * @default false
   */
  globalAppMiddleware?: GlobalMiddlewareOptions
}

// Common useAuthStatus & useAuth return-types

export type SessionLastRefreshedAt = Date | undefined
export type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading'
type WrappedSessionData<SessionData> = Ref<SessionData | null | undefined>
export interface CommonUseAuthReturn<SignIn, SignOut, GetSession, SessionData> {
  data: Readonly<WrappedSessionData<SessionData>>
  lastRefreshedAt: Readonly<Ref<SessionLastRefreshedAt>>
  status: ComputedRef<SessionStatus>
  signIn: SignIn
  signOut: SignOut
  getSession: GetSession
}

export interface CommonUseAuthStateReturn<SessionData> {
  data: WrappedSessionData<SessionData>
  loading: Ref<boolean>
  lastRefreshedAt: Ref<SessionLastRefreshedAt>
  status: ComputedRef<SessionStatus>,
  _internal: {
    baseURL: string
  }
}

// Common `useAuth` method-types

// TODO: Remove next-auth reference from here
export interface SecondarySignInOptions extends Record<string, unknown> {
  /**
   * Specify to which URL the user will be redirected after signing in. Defaults to the page URL the sign-in is initiated from.
   *
   * [Documentation](https://next-auth.js.org/getting-started/client#specifying-a-callbackurl)
   */
  callbackUrl?: string
  /** [Documentation](https://next-auth.js.org/getting-started/client#using-the-redirect-false-option) */
  redirect?: boolean
}

export interface SignOutOptions {
  callbackUrl?: string
  redirect?: boolean
}

export type GetSessionOptions = Partial<{
  required?: boolean
  callbackUrl?: string
  onUnauthenticated?: () => void
}>

// TODO: These types could be nicer and more general, or located withing `useAuth` files and more specific
export type SignOutFunc = (options?: SignOutOptions) => Promise<any>
export type GetSessionFunc<SessionData> = (getSessionOptions?: GetSessionOptions) => Promise<SessionData>
export type SignInFunc<PrimarySignInOptions, SignInResult> = (primaryOptions: PrimarySignInOptions, signInOptions?: SecondarySignInOptions, paramsOptions?: Record<string, string>) => Promise<SignInResult>
