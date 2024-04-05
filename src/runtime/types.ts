import type { Ref, ComputedRef } from 'vue'
import type { RouterMethod } from 'h3'
import type { SupportedProviders } from './composables/authjs/useAuth'

/**
 * Configuration for the global application-side authentication-middleware.
 */
interface GlobalMiddlewareOptions {
  /**
   * Whether to add a global authentication middleware that protects all pages.
   *
   * @example true
   * @default false
   */
  isEnabled: boolean;
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
  allow404WithoutAuth?: boolean;
  /**
   * Whether to automatically set the callback url to the page the user tried to visit when the middleware stopped them. This is useful to disable this when using the credentials provider, as it does not allow a `callbackUrl`. Setting this
   * to a string-value will result in that being used as the callbackUrl path. Note: You also need to set the global `addDefaultCallbackUrl` setting to `false` if you want to fully disable this.
   *
   * @example false
   * @example /i-caught-you-but-now-you-are-signed-in
   * @default true
   */
  addDefaultCallbackUrl?: boolean | string;
}

type DataObjectPrimitives =
  | 'string'
  | 'number'
  | 'boolean'
  | 'any'
  | 'undefined'
  | 'function'
  | 'null';

type DataObjectArray = `${string}[]`;

export type SessionDataObject = {
  [key: string]:
    | Omit<string, DataObjectPrimitives | DataObjectArray>
    | SessionDataObject;
};

/**
 * Available `nuxt-auth` authentication providers.
 */
export type SupportedAuthProviders = 'authjs' | 'local' | 'refresh';

/**
 * Configuration for the `local`-provider.
 */
export type ProviderLocal = {
  /**
   * Uses the `local` provider to facilitate authentication. Currently, two providers exclusive are supported:
   * - `authjs`: `next-auth` / `auth.js` based OAuth, Magic URL, Credential provider for non-static applications
   * - `local` or 'refresh': Username and password provider with support for static-applications
   *
   * Read more here: https://sidebase.io/nuxt-auth/v0.6/getting-started
   */
  type: Extract<SupportedAuthProviders, 'local'>;
  /**
   * Endpoints to use for the different methods. `nuxt-auth` will use this and the root-level `baseURL` to create the final request. E.g.:
   * - `baseURL=/api/auth`, `path=/login` will result in a request to `/api/auth/login`
   * - `baseURL=http://localhost:5000/_authenticate`, `path=/sign-in` will result in a request to `http://localhost:5000/_authenticate/sign-in`
   */
  endpoints?: {
    /**
     * What method and path to call to perform the sign-in. This endpoint must return a token that can be used to authenticate subsequent requests.
     *
     * @default { path: '/login', method: 'post' }
     */
    signIn?: { path?: string; method?: RouterMethod };
    /**
     * What method and path to call to perform the sign-out. Set to false to disable.
     *
     * @default { path: '/logout', method: 'post' }
     */
    signOut?: { path?: string; method?: RouterMethod } | false;
    /**
     * What method and path to call to perform the sign-up.
     *
     * @default { path: '/register', method: 'post' }
     */
    signUp?: { path?: string; method?: RouterMethod };
    /**
     * What method and path to call to fetch user / session data from. `nuxt-auth` will send the token received upon sign-in as a header along this request to authenticate.
     *
     * Refer to the `token` configuration to configure how `nuxt-auth` uses the token in this request. By default it will be send as a bearer-authentication header like so: `Authentication: Bearer eyNDSNJDASNMDSA....`
     *
     * @default { path: '/session', method: 'get' }
     * @example { path: '/user', method: 'get' }
     */
    getSession?: { path?: string; method?: RouterMethod };
  };
  /**
   * Pages that `nuxt-auth` needs to know the location off for redirects.
   */
  pages?: {
    /**
     * Path of the login-page that the user should be redirected to, when they try to access a protected page without being logged in.
     *
     * @default '/login'
     */
    login?: string;
  };
  /**
   * Settings for the authentication-token that `nuxt-auth` receives from the `signIn` endpoint and that can be used to authenticate subsequent requests.
   */
  token?: {
    /**
     * How to extract the authentication-token from the sign-in response.
     *
     * E.g., setting this to `/token/bearer` and returning an object like `{ token: { bearer: 'THE_AUTH_TOKEN' }, timestamp: '2023' }` from the `signIn` endpoint will
     * result in `nuxt-auth` extracting and storing `THE_AUTH_TOKEN`.
     *
     * This follows the JSON Pointer standard, see it's RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901
     *
     * @default /token  Access the `token` property of the sign-in response object
     * @example /       Access the root of the sign-in response object, useful when your endpoint returns a plain, non-object string as the token
     */
    signInResponseTokenPointer?: string;
    /**
     * Header type to be used in requests. This in combination with `headerName` is used to construct the final authentication-header `nuxt-auth` uses, e.g, for requests via `getSession`.
     *
     * @default Bearer
     * @example Beer
     */
    type?: string;
    /**
     * It refers to the name of the property when it is stored in a cookie.
     *
     * @default auth.token
     * @example auth._token
     */
    cookieName?: string;
    /**
     * Header name to be used in requests that need to be authenticated, e.g., to be used in the `getSession` request.
     *
     * @default Authorization
     * @example Auth
     */
    headerName?: string;
    /**
     * Maximum age to store the authentication token for. After the expiry time the token is automatically deleted on the application side, i.e., in the users' browser.
     *
     * Note: Your backend may reject / expire the token earlier / differently.
     * @default 1800
     * @example 60 * 60 * 24
     */
    maxAgeInSeconds?: number;
    /**
     * The cookie sameSite policy. See the specification here: https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis-03#section-4.1.2.7
     *
     * @default 'lax'
     * @example 'strict'
     */
    sameSiteAttribute?: boolean | 'lax' | 'strict' | 'none' | undefined;
  };
  /**
   * Define an interface for the session data object that `nuxt-auth` expects to receive from the `getSession` endpoint.
   *
   * @default { id: 'string | number' }
   * @example { id: 'string', name: 'string', email: 'string' }
   * @advanced_array_example { id: 'string', email: 'string', name: 'string', role: 'admin | guest | account', subscriptions: "{ id: number, status: 'ACTIVE' | 'INACTIVE' }[]" }
   */
  sessionDataType?: SessionDataObject;
};

/**
 * Configuration for the `refresh`-provider an extended version of the local provider.
 */
export type ProviderLocalRefresh = Omit<ProviderLocal, 'type'> & {
  /**
   * Uses the `authjs` provider to facilitate authentication. Currently, two providers exclusive are supported:
   * - `authjs`: `next-auth` / `auth.js` based OAuth, Magic URL, Credential provider for non-static applications
   * - `local` or 'refresh': Username and password provider with support for static-applications
   *
   * Read more here: https://sidebase.io/nuxt-auth/v0.6/getting-started
   */
  type: Extract<SupportedAuthProviders, 'refresh'>;
  endpoints?: {
    /**
     * What method and path to call to perform the sign-in. This endpoint must return a token that can be used to authenticate subsequent requests.
     *
     * @default { path: '/refresh', method: 'post' }
     */
    refresh?: { path?: string; method?: RouterMethod };
  };
  /**
   *  When refreshOnlyToken is set, only the token will be refreshed
   *
   * @default true
   */
  refreshOnlyToken?: boolean;

  refreshToken?: {
    /**
     * How to extract the authentication-token from the sign-in response.
     *
     * E.g., setting this to `/refreshToken/bearer` and returning an object like `{ refreshToken: { bearer: 'THE_AUTH_TOKEN' }, timestamp: '2023' }` from the `signIn` endpoint will
     * result in `nuxt-auth` extracting and storing `THE_AUTH_TOKEN`.
     *
     * This follows the JSON Pointer standard, see its RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901
     *
     * @default '/refreshToken'  Access the `refreshToken` property of the sign-in response object
     * @example /       Access the root of the sign-in response object, useful when your endpoint returns a plain, non-object string as the token
     */
    signInResponseRefreshTokenPointer?: string;
    /**
     * How to do a fetch for the refresh token.
     *
     * This is especially useful when you have an external backend signing tokens. Refer to this issue to get more information: https://github.com/sidebase/nuxt-auth/issues/635.
     *
     * ### Example
     * Setting this to `/refresh/token` would make Nuxt Auth send the `POST /api/auth/refresh` with the following BODY: `{ "refresh": { "token": "..." } }
     *
     * ### Notes
     * This follows the JSON Pointer standard, see its RFC6901 here: https://www.rfc-editor.org/rfc/rfc6901
     *
     * @default '/refreshToken'
     */
    refreshRequestTokenPointer?: string;
    /**
     * It refers to the name of the property when it is stored in a cookie.
     *
     * @default auth.refresh-token
     * @example auth._refresh-token
     */
    cookieName?: string;
    /**
     * Maximum age to store the authentication token for. After the expiry time the token is automatically deleted on the application side, i.e., in the users' browser.
     *
     * Note: Your backend may reject / expire the token earlier / differently.
     */
    maxAgeInSeconds?: number;
  };
};

/**
 * Configuration for the `authjs`-provider.
 */
export type ProviderAuthjs = {
  /**
   * Uses the `authjs` provider to facilitate autnetication. Currently, two providers exclusive are supported:
   * - `authjs`: `next-auth` / `auth.js` based OAuth, Magic URL, Credential provider for non-static applications
   * - `local` or `refresh`: Username and password provider with support for static-applications
   *
   * Read more here: https://sidebase.io/nuxt-auth/v0.6/getting-started
   */
  type: Extract<SupportedAuthProviders, 'authjs'>;
  /**
   * If set to `true`, `authjs` will use either the `x-forwarded-host` or `host` headers instead of `auth.baseURL`.
   *
   * Make sure that reading `x-forwarded-host` on your hosting platform can be trusted.
   * - ⚠ **This is an advanced option.** Advanced options are passed the same way as basic options,
   * but **may have complex implications** or side effects.
   * You should **try to avoid using advanced options** unless you are very comfortable using them.
   * @default false
   */
  trustHost?: boolean;
  /**
   * Select the default-provider to use when `signIn` is called. Setting this here will also effect the global middleware behavior: E.g., when you set it to `github` and the user is unauthorized, they will be directly forwarded to the Github OAuth page instead of seeing the app-login page.
   *
   * @example "github"
   * @default undefined
   */
  defaultProvider?: undefined | SupportedProviders;
  /**
   * Whether to add a callbackUrl to sign in requests. Setting this to a string-value will result in that being used as the callbackUrl path. Setting this to `true` will result in the blocked original target path being chosen (if it can be determined).
   */
  addDefaultCallbackUrl?: boolean | string;
};

export type AuthProviders =
  | ProviderAuthjs
  | ProviderLocal
  | ProviderLocalRefresh;

/**
 * Configuration for the application-side session.
 */
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
  enableRefreshPeriodically: number | boolean;
  /**
   * Whether to refresh the session every time the browser window is refocused.
   *
   * @example false
   * @default true
   */
  enableRefreshOnWindowFocus: boolean;
};

/**
 * Configuration for the whole module.
 */
export interface ModuleOptions {
  /**
   * Whether the module is enabled at all
   */
  isEnabled?: boolean;
  /**
   * Full url at which the app will run combined with the path to authentication. You can set this differently depending on your selected authentication-provider:
   * - `authjs`: You must set the full URL, with origin and path in production. You can leave this empty in development
   * - `local`: You can set a full URL, but can also leave this empty to fallback to the default value of `/api/auth` or set only the path.
   *
   * ### `authjs`
   *
   * `baseURL` can be `undefined` during development but _must_ be set to the combination of origin + path that points to your `NuxtAuthHandler` for production. The origin consists out of:
   * - `scheme`: http / https
   * - `host`: e.g., localhost, example.org, google.com
   * - `port`: _empty_ (implies `:80`), :3000, :8888
   *
   * The path then is a string like `/path/to/auth/api/endpoint/root`.
   *
   * ### `local`
   *
   * Defaults to `/api/auth` for both development and production. Setting this is optional, if you set it you can set it to either:
   * - just a path: Will lead to `nuxt-auth` using `baseURL` as a relative path appended to the origin you deploy to. Example: `/backend/auth`
   * - an origin and a path: Will leav to `nuxt-auth` using `baseURL` as an absolute request path to perform requests to. Example: `https://example.com/auth`
   *
   * Note: If you point to a different origin than the one you deploy to you likely have to take care of CORS: Allowing cross origin requests.
   *
   * @example undefined
   * @example http://localhost:3000
   * @example https://example.org/_auth
   * @example https://my-cool-site.com/api/authentication
   * @default http://localhost:3000/api/auth Default for `authjs` provider in development
   * @default undefined                      Default for `authjs` in production, will result in an error
   * @default /api/auth                      Default for `local` for both production and development
   */
  baseURL?: string;
  /**
   * Configuration of the authentication provider. Different providers are supported:
   * - auth.js: OAuth focused provider for non-static Nuxt 3 applications
   * - local: Provider for credentials & token based backends, e.g., written by yourself or provided by something like Laraval
   *
   * Find more about supported providers here: https://sidebase.io/nuxt-auth/v0.6/getting-started
   *
   */
  provider?: AuthProviders;
  /**
   * Configuration of the application-side session.
   */
  session?: SessionConfig;
  /**
   * Whether to add a global authentication middleware that protects all pages. Can be either `false` to disable, `true` to enabled
   * or an object to enable and apply extended configuration.
   *
   * If you enable this, everything is going to be protected and you can selectively disable protection for some pages by specifying `definePageMeta({ auth: false })`
   * If you disable this, everything is going to be public and you can selectively enable protection for some pages by specifying `definePageMeta({ auth: true })`
   *
   * Read more on this topic [in the page protection docs](https://sidebase.io/nuxt-auth/v0.6/application-side/protecting-pages#global-middleware).
   *
   * @example true
   * @example { allow404WithoutAuth: true }
   * @default false
   */
  globalAppMiddleware?: GlobalMiddlewareOptions | boolean;
}

// Common useAuthStatus & useAuth return-types

export type SessionLastRefreshedAt = Date | undefined;
export type SessionStatus = 'authenticated' | 'unauthenticated' | 'loading';
type WrappedSessionData<SessionData> = Ref<SessionData | null | undefined>;
export interface CommonUseAuthReturn<SignIn, SignOut, GetSession, SessionData> {
  data: Readonly<WrappedSessionData<SessionData>>;
  lastRefreshedAt: Readonly<Ref<SessionLastRefreshedAt>>;
  status: ComputedRef<SessionStatus>;
  signIn: SignIn;
  signOut: SignOut;
  getSession: GetSession;
}

export interface CommonUseAuthStateReturn<SessionData> {
  data: WrappedSessionData<SessionData>;
  loading: Ref<boolean>;
  lastRefreshedAt: Ref<SessionLastRefreshedAt>;
  status: ComputedRef<SessionStatus>;
  _internal: {
    baseURL: string;
  };
}

// Common `useAuth` method-types

export interface SecondarySignInOptions extends Record<string, unknown> {
  /**
   * Specify to which URL the user will be redirected after signing in. Defaults to the page URL the sign-in is initiated from.
   *
   * @default undefined Inferred from the current route
   */
  callbackUrl?: string;
  /** Whether to redirect users after the method succeeded.
   *
   * @default true
   */
  redirect?: boolean;
  /** Is this callback URL an external one. Setting this to true, allows you to redirect to external urls, however a hard refresh will be done.
   *
   * @default false
   */
  external?: boolean;
}

export interface SignUpOptions extends SecondarySignInOptions {
  /** Prevent the signIn flow during registration
   *
   * @default false
   */
  preventLoginFlow?: boolean;
}

export interface SignOutOptions {
  callbackUrl?: string;
  redirect?: boolean;
  external?: boolean;
}

export type GetSessionOptions = Partial<{
  required?: boolean;
  callbackUrl?: string;
  external?: boolean;
  onUnauthenticated?: () => void;
  /** Whether to refetch the session even if the token returned by useAuthState is null.
   *
   * @default false
   */
  force?: boolean;
}>;

// TODO: These types could be nicer and more general, or located withing `useAuth` files and more specific
export type SignOutFunc = (options?: SignOutOptions) => Promise<any>;
export type GetSessionFunc<SessionData> = (
  getSessionOptions?: GetSessionOptions
) => Promise<SessionData>;
export type SignInFunc<PrimarySignInOptions, SignInResult> = (
  primaryOptions: PrimarySignInOptions,
  signInOptions?: SecondarySignInOptions,
  paramsOptions?: Record<string, string>
) => Promise<SignInResult>;

export interface ModuleOptionsNormalized extends ModuleOptions {
  isEnabled: boolean
  // Cannot use `DeepRequired` here because it leads to build issues
  provider: Required<NonNullable<ModuleOptions['provider']>>
  session: NonNullable<ModuleOptions['session']>
  globalAppMiddleware: NonNullable<ModuleOptions['globalAppMiddleware']>

  computed: {
    origin: string | undefined
    pathname: string
    fullBaseUrl: string
  }
}

// Augment types
declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    auth: ModuleOptionsNormalized
  }
}
