/* eslint-disable no-undef */
import { parseURL, withLeadingSlash } from 'ufo'
import { ERROR_PREFIX } from './logger'

// Slimmed-down type to allow easy unit testing
export interface RuntimeConfig {
  public: {
    auth: {
      baseURL: string
      disableInternalRouting: boolean
      originEnvKey: string
    }
  }
}

/**
 * Resolves the authentication base URL from runtime config and environment
 * variables. This is called once during plugin initialization to determine
 * the correct base URL for the {@link AuthJsClient}.
 *
 * When internal routing is enabled (the default), the result is stripped to
 * just the pathname so that `$fetch` uses Nitro's direct function call
 * optimisation. When internal routing is disabled (external backend), the
 * full URL is preserved.
 */
export function resolveBaseURL(runtimeConfig: RuntimeConfig): string {
  let baseURL = runtimeConfig.public.auth.baseURL

  // On the server, allow overriding via the configured environment variable.
  // `import.meta.server` is `true` on the server and `undefined`/`false` on
  // the client, so this branch is tree-shaken for client builds.
  if (import.meta.server !== false && runtimeConfig.public.auth.originEnvKey) {
    const envBaseURL = process.env[runtimeConfig.public.auth.originEnvKey]
    if (envBaseURL) {
      baseURL = envBaseURL
    }
  }

  if (!runtimeConfig.public.auth.disableInternalRouting) {
    baseURL = withLeadingSlash(parseURL(baseURL).pathname)
  }

  return baseURL
}

/**
 * Minimal subset of NuxtApp required by {@link AuthJsClient}. Using a
 * structural type instead of importing `NuxtApp` from `#app/nuxt` keeps
 * this module free of Nuxt virtual-module imports so it can be consumed
 * by plain vitest without a Nuxt test environment.
 */
export interface NuxtAppLike {
  ssrContext?: {
    event?: {
      path?: string
      node?: {
        req?: {
          headers?: Record<string, string | string[] | undefined>
        }
      }
    }
  }
}

/**
 * External dependencies injected into {@link AuthJsClient} at construction
 * time. This keeps the class free of direct composable calls, making it
 * testable and decoupled from the Nuxt runtime.
 */
export interface AuthJsClientDeps {
  nuxt: NuxtAppLike
  getRequestCookies: () => Promise<string | undefined>
  appendResponseCookies: (cookies: string[]) => void
}

export class FetchConfigurationError extends Error {}

/**
 * Information about a configured authentication provider. This data is
 * returned by the getProviders method and can be used to build custom
 * sign-in interfaces that display all available authentication options.
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
 * Self-contained HTTP client for all Auth.js endpoint interactions.
 *
 * This class is the **single source of truth** for Auth.js endpoint URLs.
 * No other file in the codebase should reference paths such as `/session`,
 * `/signin`, `/signout`, `/csrf`, `/providers`, `/callback`, or `/error`.
 *
 * The class uses native {@link URL} objects internally so that relative
 * endpoint segments resolve correctly against the base URL.
 *
 * @example
 * ```ts
 * const client = new AuthJsClient('/api/auth', deps)
 * const session = await client.getSession()
 * const providers = await client.getProviders()
 * ```
 */
export class AuthJsClient {
  /** Base URL stored as a native URL object for correct segment resolution. */
  private readonly base: URL

  /**
   * Whether the base URL points to the same Nuxt server (path-only) or to
   * an external backend (full URL with protocol and host).
   */
  private readonly isInternalRouting: boolean

  constructor(
    baseURL: string,
    private readonly deps: AuthJsClientDeps,
  ) {
    // A trailing slash is required for `new URL(segment, base)` to append
    // rather than replace the last path segment.
    const withSlash = baseURL.endsWith('/') ? baseURL : baseURL + '/'

    if (baseURL.startsWith('http://') || baseURL.startsWith('https://')) {
      this.base = new URL(withSlash)
      this.isInternalRouting = false
    } else {
      // For path-only base URLs use a dummy origin so that URL resolution
      // works correctly. The origin is stripped when building the final path.
      this.base = new URL(withSlash, 'http://_')
      this.isInternalRouting = true
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Resolve an endpoint segment against the base URL. Returns a pathname
   * for internal routing or a full href for external routing.
   */
  private url(endpoint: string): string {
    // Strip leading slash — `new URL('/foo', base)` replaces the entire path,
    // whereas `new URL('foo', base)` appends relative to base.
    const relative = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    const resolved = new URL(relative, this.base)
    return this.isInternalRouting ? resolved.pathname : resolved.href
  }

  /**
   * Core fetch wrapper that handles:
   * - Recursion detection (internal routing only)
   * - Automatic `credentials: 'include'` for browser cookie sending
   * - Proxying incoming request cookies and host header on the server
   * - Forwarding response `set-cookie` headers back to the client on SSR
   */
  private async fetch<T>(
    endpoint: string,
    fetchOptions: Parameters<typeof $fetch>[1] = {},
    forwardResponseCookies = false,
  ): Promise<T> {
    const joinedPath = this.url(endpoint)

    // Prevent recursion when Nuxt's internal $fetch optimisation calls the
    // auth handler from within the auth handler itself.
    if (this.isInternalRouting) {
      const currentPath = this.deps.nuxt.ssrContext?.event?.path
      if (currentPath?.startsWith(joinedPath)) {
        console.error(
          `${ERROR_PREFIX} Recursion detected at ${joinedPath}. Have you set the correct \`auth.baseURL\`?`,
        )
        throw new FetchConfigurationError('Server configuration error')
      }
    }

    // Browser: include cookies by default (https://github.com/zitadel/nuxt-auth/issues/1063)
    if (!fetchOptions.credentials) {
      fetchOptions.credentials = 'include'
    }

    // Server: proxy the incoming request's cookies and host header so that
    // the auth handler sees the original client context.
    if (import.meta.server) {
      const headers = new Headers(fetchOptions.headers ?? {})

      const hostRaw = this.deps.nuxt.ssrContext?.event?.node?.req?.headers?.host
      const host = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw
      if (host && !headers.has('host')) {
        headers.set('host', host)
      }

      if (!headers.has('cookie')) {
        const cookies = await this.deps.getRequestCookies()
        if (cookies) {
          headers.set('cookie', cookies)
        }
      }

      fetchOptions.headers = headers
    }

    try {
      return $fetch.raw(joinedPath, fetchOptions).then((res) => {
        if (import.meta.server && forwardResponseCookies) {
          const cookies = res.headers.getSetCookie
            ? res.headers.getSetCookie()
            : ([res.headers.get('set-cookie')].filter(Boolean) as string[])
          if (cookies.length > 0) {
            this.deps.appendResponseCookies(cookies)
          }
        }

        return res._data as T
      })
    } catch (error) {
      let errorMessage = `${ERROR_PREFIX} Error while requesting ${joinedPath}.`
      errorMessage +=
        ' Have you added the authentication handler server-endpoint `[...].ts`?' +
        ' Have you added the authentication handler in a non-default location' +
        ' (default is `~/server/api/auth/[...].ts`) and not updated the' +
        ' module-setting `auth.basePath`?'
      errorMessage += ' Error is:'
      console.error(errorMessage)
      console.error(error)

      throw new FetchConfigurationError(
        'Runtime error, check the console logs to debug, open an issue at' +
          ' https://github.com/zitadel/nuxt-auth/issues/new/choose if you' +
          ' continue to have this problem',
      )
    }
  }

  // ---------------------------------------------------------------------------
  // URL helpers for navigation (not API calls)
  // ---------------------------------------------------------------------------

  /** Returns the URL for the Auth.js error page. */
  getErrorPageUrl(): string {
    return this.url('error')
  }

  /** Returns the URL for the Auth.js sign-in page listing all providers. */
  getSignInPageUrl(callbackUrl?: string): string {
    const signinUrl = this.url('signin')
    const queryParams = callbackUrl
      ? `?${new URLSearchParams({ callbackUrl })}`
      : ''
    return `${signinUrl}${queryParams}`
  }

  // ---------------------------------------------------------------------------
  // Public API — clean, semantic, no URLs visible to callers
  // ---------------------------------------------------------------------------

  /** Fetch all configured authentication providers. */
  async getProviders(): Promise<Record<string, ProviderInfo | undefined>> {
    return this.fetch('/providers', {})
  }

  /**
   * Fetch the current session from the server.
   *
   * @param callbackUrl - Optional callback URL passed as a query parameter
   *   so the auth server knows where to redirect after sign-in if needed.
   * @returns The raw session data object, or `null`-ish data when there is
   *   no active session. Callers are responsible for the empty-object check.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSession(callbackUrl?: string): Promise<any> {
    return this.fetch(
      '/session',
      {
        params: callbackUrl ? { callbackUrl } : undefined,
      },
      /* forwardResponseCookies */ true,
    )
  }

  /** Fetch the CSRF token for the current session. */
  async getCsrfToken(): Promise<string> {
    return this.fetch<{ csrfToken: string }>('/csrf', {}).then(
      (response) => response.csrfToken,
    )
  }

  /**
   * Perform a sign-in request against the correct Auth.js endpoint.
   *
   * The credentials provider uses the `/callback/:provider` endpoint while
   * all other provider types use `/signin/:provider`. This routing decision
   * lives here so that callers never need to know about it.
   *
   * @param provider     - Provider ID, e.g. "github" or "credentials"
   * @param providerType - The provider's `type` field (e.g. "credentials",
   *                       "oauth", "email") used to determine the endpoint
   * @param body         - Pre-built URLSearchParams containing csrfToken,
   *                       callbackUrl, json flag, and any credential fields
   * @param authorizationParams - Extra OAuth query parameters
   */
  async signIn(
    provider: string,
    providerType: string,
    body: URLSearchParams,
    authorizationParams?: Record<string, string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<Record<string, any>> {
    const action = providerType === 'credentials' ? 'callback' : 'signin'
    return this.fetch<{ url: string }>(
      `/${action}/${provider}`,
      {
        method: 'post',
        params: authorizationParams,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      },
      /* forwardResponseCookies */ true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ).catch<Record<string, any>>((error: { data: any }) => error.data)
  }

  /**
   * Sign out the current user.
   *
   * @param csrfToken   - CSRF token obtained via {@link getCsrfToken}
   * @param callbackUrl - URL to redirect to after sign-out
   */
  async signOut(
    csrfToken: string,
    callbackUrl: string,
  ): Promise<{ url: string }> {
    const body = new URLSearchParams({
      csrfToken,
      callbackUrl,
      json: 'true',
    })
    return this.fetch<{ url: string }>('/signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }).catch((error: { data: unknown }) => error.data as { url: string })
  }
}
