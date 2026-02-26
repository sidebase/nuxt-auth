/* eslint-disable react-hooks/rules-of-hooks */
import { defu } from 'defu'
import { readonly } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { appendHeader } from 'h3'
import { resolveApiUrlPath } from '../../utils/url'
import { _fetch } from '../../utils/fetch'
import { isNonEmptyObject } from '../../utils/checkSessionResult'
import type { SessionLastRefreshedAt, SessionStatus } from '../../types'
import { determineCallbackUrl } from '../../utils/callbackUrl'
import type { SessionData } from './useAuthState'
import { navigateToAuthPageWN } from './utils/navigateToAuthPage'
import type { NuxtApp } from '#app/nuxt'
import { callWithNuxt } from '#app/nuxt'
import {
  createError,
  useAuthState,
  useNuxtApp,
  useRequestHeaders,
  useRequestURL,
  useRuntimeConfig,
} from '#imports'

interface SecondarySignInOptions extends Record<string, unknown> {
  /** URL to redirect to after signing in. Defaults to current page. */
  callbackUrl?: string
  /** Whether to redirect after sign-in. @default true */
  redirect?: boolean
  /** Allow external callback URLs. @default false */
  external?: boolean
  /** Whether to call getSession after sign-in. @default true */
  callGetSession?: boolean
}

interface SignOutOptions {
  /** URL to redirect to after signing out. */
  callbackUrl?: string
  /** Whether to redirect after sign-out. @default true */
  redirect?: boolean
  /** Allow external callback URLs. @default false */
  external?: boolean
}

interface GetSessionOptions {
  /** If true, redirects to sign-in when not authenticated. */
  required?: boolean
  /** URL to redirect to after sign-in (when required is true). */
  callbackUrl?: string
  /** Allow external callback URLs. @default false */
  external?: boolean
  /** Custom handler when unauthenticated and required is true. */
  onUnauthenticated?: () => void
  /** Refetch session even if token is null. @default false */
  force?: boolean
}

/**
 * The result object returned after attempting to sign in a user. This object
 * contains information about whether the sign-in was successful, any errors
 * that occurred, and navigation details for handling redirects.
 *
 * When using OAuth providers, a successful sign-in typically results in a
 * redirect to the provider's authorization page. For credentials-based
 * authentication, the result indicates whether the credentials were valid.
 *
 * @example
 * ```typescript
 * const result = await signIn('credentials', {
 *   username: 'user@example.com',
 *   password: 'secret'
 * })
 *
 * if (result.error) {
 *   console.error('Sign-in failed:', result.error)
 * } else {
 *   console.log('Sign-in successful, redirecting to:', result.url)
 * }
 * ```
 */
export interface SignInResult {
  /**
   * The error code if the sign-in failed. This will be null when the sign-in
   * was successful. Common error codes include "CredentialsSignin" for invalid
   * credentials and "InvalidProvider" when the specified provider doesn't
   * exist or isn't configured.
   */
  error: string | null

  /**
   * The HTTP status code from the sign-in response. A status of 200 indicates
   * success without redirect, 302 indicates a successful redirect, and 4xx/5xx
   * codes indicate various error conditions.
   */
  status: number

  /**
   * Indicates whether the sign-in request completed without server errors.
   * Note that this being true doesn't necessarily mean the user is
   * authenticated; check the error property for authentication failures.
   */
  ok: boolean

  /**
   * The URL to redirect to after sign-in. For OAuth providers, this is the
   * provider's authorization URL. For credentials, this is typically the
   * callback URL or the page the user was trying to access.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  url: any

  /**
   * The result from the internal navigation handler. This value should be
   * returned from route middleware to ensure vue-router processes the
   * navigation correctly. This is particularly important when using the
   * composable within middleware contexts.
   *
   * @see https://github.com/zitadel/nuxt-auth/pull/1057
   */
  navigationResult: boolean | string | void | undefined
}

/**
 * Information about a configured authentication provider. This data is
 * returned by the getProviders method and can be used to build custom
 * sign-in interfaces that display all available authentication options.
 *
 * @example
 * ```typescript
 * const providers = await getProviders()
 * for (const [id, provider] of Object.entries(providers)) {
 *   console.log(`${provider.name} (${provider.type}): ${provider.signinUrl}`)
 * }
 * ```
 */
export interface ProviderInfo {
  /** The unique identifier for this provider, e.g., "github" or "google" */
  id: string

  /** The human-readable display name, e.g., "GitHub" or "Google" */
  name: string

  /**
   * The provider type indicating the authentication mechanism. Common values
   * are "oauth" for OAuth/OIDC providers, "credentials" for username/password
   * authentication, and "email" for magic link authentication.
   */
  type: string

  /** The URL to initiate sign-in with this provider */
  signinUrl?: string

  /** The OAuth callback URL configured for this provider */
  callbackUrl?: string
}

/**
 * The return type of the `useAuth` composable.
 */
export interface UseAuthReturn {
  /**
   * Reactive reference containing the current session data. This includes
   * user information, expiration time, and any custom session properties
   * configured in your Auth.js callbacks. The value is `null` when not
   * authenticated and `undefined` during initial loading.
   */
  data: Readonly<Ref<SessionData | null | undefined>>

  /**
   * Computed property indicating the current authentication status.
   *
   * - `'loading'` - Session is being fetched
   * - `'authenticated'` - User has a valid session
   * - `'unauthenticated'` - No valid session exists
   */
  status: ComputedRef<SessionStatus>

  /**
   * Timestamp of the last session refresh, or `undefined` if never fetched.
   */
  lastRefreshedAt: Readonly<Ref<SessionLastRefreshedAt>>

  /**
   * Initiates authentication with the specified provider.
   *
   * @param provider - Provider ID (e.g., "github", "credentials")
   * @param options - Sign-in options including credentials for password auth
   * @param authorizationParams - Additional OAuth query parameters
   */
  signIn: (
    provider?: string,
    options?: {
      callbackUrl?: string
      redirect?: boolean
      external?: boolean
      callGetSession?: boolean
    } & Record<string, unknown>,
    authorizationParams?: Record<string, string>,
  ) => Promise<SignInResult>

  /**
   * Signs out the current user and optionally redirects.
   *
   * @param options - Sign-out options including `callbackUrl` and `redirect`
   */
  signOut: (options?: {
    callbackUrl?: string
    redirect?: boolean
    external?: boolean
  }) => Promise<unknown>

  /**
   * Fetches the current session from the server.
   *
   * @param getSessionOptions - Options including `required` to enforce auth
   */
  getSession: (getSessionOptions?: {
    required?: boolean
    callbackUrl?: string
    external?: boolean
    onUnauthenticated?: () => void
    force?: boolean
  }) => Promise<SessionData | null>

  /** Retrieves the CSRF token for custom auth requests. */
  getCsrfToken: () => Promise<string>

  /** Fetches all configured authentication providers. */
  getProviders: () => Promise<Record<string, ProviderInfo | undefined>>

  /** Alias for `getSession`. */
  refresh: (getSessionOptions?: {
    required?: boolean
    callbackUrl?: string
    external?: boolean
    onUnauthenticated?: () => void
    force?: boolean
  }) => Promise<SessionData | null>
}

/**
 * The primary authentication composable for client-side authentication in
 * Nuxt applications using Auth.js. This composable provides a complete set
 * of methods and reactive state for managing user authentication, including
 * sign-in, sign-out, session management, and provider discovery.
 *
 * This composable is automatically imported by Nuxt when the auth module is
 * installed. It integrates seamlessly with both client-side and server-side
 * rendering, handling cookie proxying and session hydration automatically.
 *
 * The composable maintains reactive state that updates automatically when
 * authentication status changes. The `status` computed property provides a
 * simple way to check if the user is authenticated, unauthenticated, or if
 * the session is still loading.
 *
 * @returns An object containing reactive authentication state and methods
 *          for managing the user's session
 *
 * @example
 * Checking authentication status in a component:
 * ```vue
 * <script setup>
 * const { status, data, signIn, signOut } = useAuth()
 *
 * const user = computed(() => data.value?.user)
 * const isLoggedIn = computed(() => status.value === 'authenticated')
 * </script>
 *
 * <template>
 *   <div v-if="status === 'loading'">Loading...</div>
 *   <div v-else-if="isLoggedIn">
 *     Welcome, {{ user?.name }}!
 *     <button @click="signOut()">Sign Out</button>
 *   </div>
 *   <div v-else>
 *     <button @click="signIn('github')">Sign in with GitHub</button>
 *   </div>
 * </template>
 * ```
 *
 * @example
 * Using credentials authentication with error handling:
 * ```typescript
 * const { signIn, status } = useAuth()
 *
 * async function handleLogin(email: string, password: string) {
 *   const result = await signIn('credentials', {
 *     email,
 *     password,
 *     redirect: false
 *   })
 *
 *   if (result.error) {
 *     showError('Invalid email or password')
 *     return
 *   }
 *
 *   navigateTo('/dashboard')
 * }
 * ```
 *
 * @example
 * Protecting a page with required authentication:
 * ```typescript
 * const { getSession } = useAuth()
 *
 * // This will redirect to sign-in if not authenticated
 * await getSession({ required: true })
 * ```
 *
 * @example
 * Building a custom provider selection page:
 * ```typescript
 * const { getProviders, signIn } = useAuth()
 *
 * const providers = await getProviders()
 * // Render buttons for each provider
 * for (const provider of Object.values(providers)) {
 *   // Create button that calls signIn(provider.id)
 * }
 * ```
 *
 * @see `useAuthState` for accessing raw authentication state without the
 *      action methods
 * @see {@link https://authjs.dev/} for Auth.js documentation
 */
export function useAuth(): UseAuthReturn {
  const nuxt = useNuxtApp()
  const runtimeConfig = useRuntimeConfig()
  const { data, loading, status, lastRefreshedAt } = useAuthState()

  /**
   * Initiates the authentication flow for the specified provider. This method
   * handles both OAuth-based providers (like GitHub, Google) and credentials-
   * based authentication. The behavior varies depending on the provider type:
   *
   * For OAuth providers, the user is redirected to the provider's login page.
   * After successful authentication, they are redirected back to your
   * application with the session established.
   *
   * For credentials providers, the username and password (or other
   * credentials) are validated server-side. If valid, a session is created
   * without any external redirects.
   *
   * If no provider is specified and no default provider is configured, the
   * user is shown a page listing all available authentication options.
   *
   * @param provider - The ID of the provider to use for authentication. Pass
   *                   undefined to show all providers or use the configured
   *                   default. Examples: "github", "google", "credentials"
   *
   * @param options - Configuration options for the sign-in flow. For OAuth
   *                  providers, use `callbackUrl` to specify where to redirect
   *                  after authentication. For credentials providers, include
   *                  the authentication fields (e.g., email, password). Set
   *                  `redirect: false` to handle the result programmatically
   *                  instead of redirecting.
   *
   * @param authorizationParams - Additional query parameters to include in the
   *                              OAuth authorization URL. Use this for OAuth
   *                              scopes, prompts, or provider-specific params.
   *                              Example: `{ scope: "read:user user:email" }`
   *
   * @returns A promise that resolves to a SignInResult object containing the
   *          outcome of the authentication attempt, including any errors and
   *          the redirect URL.
   *
   * @example
   * Sign in with an OAuth provider:
   * ```typescript
   * await signIn('github')
   * ```
   *
   * @example
   * Sign in with credentials and handle the result:
   * ```typescript
   * const result = await signIn('credentials', {
   *   email: 'user@example.com',
   *   password: 'secretpassword',
   *   redirect: false
   * })
   * if (result.error) {
   *   alert('Invalid credentials')
   * }
   * ```
   *
   * @example
   * Sign in with custom OAuth scopes:
   * ```typescript
   * await signIn('github', {}, { scope: 'read:user read:org' })
   * ```
   */
  async function signIn(
    provider?: string,
    options?: SecondarySignInOptions,
    authorizationParams?: Record<string, string>,
  ): Promise<SignInResult> {
    // 1. Lead to error page if no providers are available
    const configuredProviders = await getProviders()
    if (!configuredProviders) {
      const errorUrl = resolveApiUrlPath('error', runtimeConfig)
      const navigationResult = await navigateToAuthPageWN(nuxt, errorUrl, true)

      return {
        // Future AuthJS compat here and in other places
        // https://authjs.dev/reference/core/errors#invalidprovider
        error: 'InvalidProvider',
        ok: false,
        status: 500,
        url: errorUrl,
        navigationResult,
      }
    }

    // 2. If no `provider` was given, either use the configured `defaultProvider` or `undefined` (leading to a forward to the `/login` page with all providers)
    if (typeof provider === 'undefined') {
      // NOTE: `provider` might be an empty string
      provider = runtimeConfig.public.auth.provider.defaultProvider
    }

    // 3. Redirect to the general sign-in page with all providers in case either no provider or no valid provider was selected
    const { redirect = true } = options ?? {}

    const callbackUrl = await callWithNuxt(nuxt, () =>
      determineCallbackUrl(runtimeConfig.public.auth, options?.callbackUrl),
    )

    const signinUrl = resolveApiUrlPath('signin', runtimeConfig)

    const queryParams = callbackUrl
      ? `?${new URLSearchParams({ callbackUrl })}`
      : ''
    const hrefSignInAllProviderPage = `${signinUrl}${queryParams}`

    const selectedProvider = provider && configuredProviders[provider]
    if (!selectedProvider) {
      const navigationResult = await navigateToAuthPageWN(
        nuxt,
        hrefSignInAllProviderPage,
        true,
      )

      return {
        // https://authjs.dev/reference/core/errors#invalidprovider
        error: 'InvalidProvider',
        ok: false,
        status: 400,
        url: hrefSignInAllProviderPage,
        navigationResult,
      }
    }

    // 4. Perform a sign-in straight away with the selected provider
    const isCredentials = selectedProvider.type === 'credentials'
    const isEmail = selectedProvider.type === 'email'
    const isSupportingReturn = isCredentials || isEmail

    const action: 'callback' | 'signin' = isCredentials ? 'callback' : 'signin'

    const csrfToken = await getCsrfTokenWithNuxt(nuxt)

    const headers: { 'Content-Type': string; cookie?: string; host?: string } =
      {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(await getRequestHeaders(nuxt)),
      }

    // @ts-expect-error `options` is typed as any, but is a valid parameter for URLSearchParams
    const body = new URLSearchParams({
      ...options,
      csrfToken,
      callbackUrl,
      json: true,
    })

    const fetchSignIn = () =>
      _fetch<{ url: string }>(
        nuxt,
        `/${action}/${provider}`,
        {
          method: 'post',
          params: authorizationParams,
          headers,
          body,
        },
        /* proxyCookies = */ true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).catch<Record<string, any>>((error: { data: any }) => error.data)

    const data = await callWithNuxt(nuxt, fetchSignIn)

    if (redirect || !isSupportingReturn) {
      const href = data.url ?? callbackUrl
      const navigationResult = await navigateToAuthPageWN(nuxt, href)

      // We use `http://_` as a base to allow relative URLs in `callbackUrl`. We only need the `error` query param
      const error = new URL(href, 'http://_').searchParams.get('error')

      return {
        error,
        ok: true,
        status: 302,
        url: href,
        navigationResult,
      }
    }

    // At this point the request succeeded (i.e., it went through)
    const error = new URL(data.url).searchParams.get('error')
    await getSessionWithNuxt(nuxt)

    return {
      error,
      status: 200,
      ok: true,
      url: error ? null : data.url,
      navigationResult: undefined,
    }
  }

  /**
   * Fetches all authentication providers configured on the server. This is
   * useful for building custom sign-in pages that display buttons or links
   * for each available authentication method.
   *
   * The returned object maps provider IDs to their configuration, including
   * the display name, provider type, and sign-in URLs. You can iterate over
   * this to dynamically render authentication options.
   *
   * @returns A promise that resolves to a record of provider configurations.
   *          Each key is the provider ID and each value contains the
   *          provider's display information.
   *
   * @example
   * Building a custom provider selection UI:
   * ```typescript
   * const providers = await getProviders()
   *
   * for (const [id, provider] of Object.entries(providers)) {
   *   console.log(`${provider.name}: ${provider.signinUrl}`)
   * }
   * ```
   */
  async function getProviders() {
    // Pass the `Host` header when making internal requests
    const headers = await getRequestHeaders(nuxt, false)

    return _fetch<Record<string, ProviderInfo | undefined>>(
      nuxt,
      '/providers',
      { headers },
    )
  }

  /**
   * Fetches the current session from the authentication server and updates
   * the local session state. This method is useful for refreshing session
   * data after it may have changed, or for enforcing that a valid session
   * exists before proceeding.
   *
   * When called, this method makes a request to the session endpoint and
   * updates the reactive `data` and `status` properties. If the session has
   * expired or is invalid, the status will change to "unauthenticated".
   *
   * The `required` option provides a declarative way to enforce
   * authentication. When set to true, unauthenticated users are automatically
   * redirected to the sign-in page. You can customize this behavior with
   * the `onUnauthenticated` callback.
   *
   * This method also serves as the implementation for the `refresh` alias,
   * allowing you to use either name interchangeably.
   *
   * @param getSessionOptions - Optional configuration for the session fetch:
   *
   *        `required` - When true, redirects to sign-in if not authenticated.
   *        This is useful for protecting pages that require authentication.
   *
   *        `callbackUrl` - The URL to redirect to after successful sign-in
   *        when using `required: true`. Defaults to the current page URL.
   *
   *        `onUnauthenticated` - A custom callback invoked when required is
   *        true and no valid session exists. Overrides the default redirect
   *        behavior.
   *
   * @returns A promise that resolves to the session data if authenticated,
   *          or null if no valid session exists.
   *
   * @example
   * Refreshing the session data:
   * ```typescript
   * const session = await getSession()
   * console.log('Current user:', session?.user?.name)
   * ```
   *
   * @example
   * Requiring authentication on a page:
   * ```typescript
   * // Redirects to sign-in if not authenticated
   * await getSession({ required: true })
   * // This code only runs if authenticated
   * ```
   *
   * @example
   * Custom handling for unauthenticated users:
   * ```typescript
   * await getSession({
   *   required: true,
   *   onUnauthenticated: () => {
   *     showLoginModal()
   *   }
   * })
   * ```
   */
  async function getSession(
    getSessionOptions?: GetSessionOptions,
  ): Promise<SessionData | null> {
    const callbackUrlFallback = useRequestURL().href
    const { required, callbackUrl, onUnauthenticated } = defu(
      getSessionOptions || {},
      {
        required: false,
        callbackUrl: undefined,
        onUnauthenticated: () =>
          signIn(undefined, {
            callbackUrl: getSessionOptions?.callbackUrl || callbackUrlFallback,
          }),
      },
    )

    function onError() {
      loading.value = false
    }

    const headers = await getRequestHeaders(nuxt)

    return _fetch<SessionData>(
      nuxt,
      '/session',
      {
        onResponse: ({ response }) => {
          const sessionData = response._data

          // Add any new cookie to the server-side event for it to be present on the app-side after
          // initial load, see zitadel/nuxt-auth/issues/200 for more information.
          if (import.meta.server) {
            const setCookieValues = response.headers.getSetCookie
              ? response.headers.getSetCookie()
              : [response.headers.get('set-cookie')]
            if (setCookieValues && nuxt.ssrContext) {
              for (const value of setCookieValues) {
                if (!value) {
                  continue
                }
                appendHeader(nuxt.ssrContext.event, 'set-cookie', value)
              }
            }
          }

          data.value = isNonEmptyObject(sessionData) ? sessionData : null
          loading.value = false

          if (required && status.value === 'unauthenticated') {
            return onUnauthenticated()
          }

          return sessionData
        },
        onRequest: ({ options }) => {
          lastRefreshedAt.value = new Date()

          options.params = {
            ...options.params,
            callbackUrl: callbackUrl || callbackUrlFallback,
          }
        },
        onRequestError: onError,
        onResponseError: onError,
        headers,
      },
      /* proxyCookies = */ true,
    )
  }
  function getSessionWithNuxt(nuxt: NuxtApp) {
    return callWithNuxt(nuxt, getSession)
  }

  /**
   * Signs out the current user by invalidating their session on the server.
   * This clears the session cookie and updates the local authentication
   * state to reflect that the user is no longer authenticated.
   *
   * By default, after signing out the user is redirected to the home page
   * or a configured callback URL. You can disable this redirect by setting
   * `redirect: false` to handle post-sign-out navigation manually.
   *
   * The sign-out process includes CSRF protection. A valid CSRF token is
   * automatically fetched and included in the sign-out request to prevent
   * cross-site request forgery attacks.
   *
   * @param options - Configuration options for the sign-out process:
   *
   *        `callbackUrl` - The URL to redirect to after successful sign-out.
   *        Defaults to the application's base URL or the configured callback.
   *
   *        `redirect` - Whether to redirect after sign-out. Defaults to true.
   *        Set to false to handle navigation manually in your application.
   *
   * @returns A promise that resolves when sign-out is complete. If redirect
   *          is true, the promise resolves after initiating the redirect.
   *          If redirect is false, it resolves with the sign-out response.
   *
   * @throws Will throw an error if the CSRF token cannot be fetched.
   *
   * @example
   * Basic sign-out with default redirect:
   * ```typescript
   * await signOut()
   * // User is redirected to the home page
   * ```
   *
   * @example
   * Sign-out without redirect for custom handling:
   * ```typescript
   * await signOut({ redirect: false })
   * // Handle post-sign-out logic manually
   * showGoodbyeMessage()
   * navigateTo('/goodbye')
   * ```
   *
   * @example
   * Sign-out with custom redirect URL:
   * ```typescript
   * await signOut({ callbackUrl: '/login?message=logged-out' })
   * ```
   */
  async function signOut(options?: SignOutOptions) {
    const { callbackUrl: userCallbackUrl, redirect = true } = options ?? {}
    const csrfToken = await getCsrfTokenWithNuxt(nuxt)

    // Determine the correct callback URL
    const callbackUrl = await determineCallbackUrl(
      runtimeConfig.public.auth,
      userCallbackUrl,
      true,
    )

    if (!csrfToken) {
      throw createError({
        statusCode: 400,
        message: 'Could not fetch CSRF Token for signing out',
      })
    }

    const signoutData = await _fetch<{ url: string }>(nuxt, '/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(await getRequestHeaders(nuxt)),
      },
      onRequest: ({ options }) => {
        options.body = new URLSearchParams({
          csrfToken: csrfToken as string,
          callbackUrl,
          json: 'true',
        })
      },
    }).catch((error) => error.data)

    if (redirect) {
      const url = signoutData.url ?? callbackUrl
      return navigateToAuthPageWN(nuxt, url)
    }

    await getSessionWithNuxt(nuxt)
    return signoutData
  }

  /**
   * Utilities to make nested async composable calls play nicely with nuxt.
   *
   * Calling nested async composable can lead to "nuxt instance unavailable" errors. See more details here: https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529. To resolve this we can manually ensure that the nuxt-context is set. This module contains `callWithNuxt` helpers for some of the methods that are frequently called in nested `useAuth` composable calls.
   */
  async function getRequestHeaders(
    nuxt: NuxtApp,
    includeCookie = true,
  ): Promise<{ cookie?: string; host?: string }> {
    // `useRequestHeaders` is sync, so we narrow it to the awaited return type here
    const headers = await callWithNuxt(nuxt, () =>
      useRequestHeaders(['cookie', 'host']),
    )
    if (includeCookie && headers.cookie) {
      return headers
    }
    return { host: headers.host }
  }

  /**
   * Retrieves the current Cross-Site Request Forgery (CSRF) token from the
   * authentication server. This token is used to protect against CSRF attacks
   * by ensuring that form submissions and API calls originate from your
   * application.
   *
   * In most cases, you won't need to call this method directly. The signIn
   * and signOut methods automatically fetch and include the CSRF token. This
   * method is provided for advanced use cases where you need to make custom
   * requests to the authentication endpoints.
   *
   * The CSRF token is session-specific and should be included in the body of
   * POST requests to authentication endpoints. It's automatically rotated
   * periodically for security.
   *
   * @returns A promise that resolves to the current CSRF token string.
   *
   * @example
   * Using the CSRF token in a custom authentication request:
   * ```typescript
   * const csrfToken = await getCsrfToken()
   *
   * await fetch('/api/auth/custom-action', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({ csrfToken, ...otherData })
   * })
   * ```
   */
  async function getCsrfToken() {
    const headers = await getRequestHeaders(nuxt)
    return _fetch<{ csrfToken: string }>(nuxt, '/csrf', { headers }).then(
      (response) => response.csrfToken,
    )
  }
  function getCsrfTokenWithNuxt(nuxt: NuxtApp) {
    return callWithNuxt(nuxt, getCsrfToken)
  }

  return {
    status,
    data: readonly(data) as Readonly<Ref<SessionData | null | undefined>>,
    lastRefreshedAt: readonly(lastRefreshedAt),
    getSession,
    getCsrfToken,
    getProviders,
    signIn,
    signOut,
    refresh: getSession,
  }
}
