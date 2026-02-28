/* eslint-disable no-undef */
import type { H3Event } from 'h3'
import {
  appendResponseHeader,
  createError,
  eventHandler,
  getHeaders,
  getRequestURL,
  setResponseStatus,
  splitCookiesString,
  toWebRequest,
} from 'h3'
import { Auth, createActionURL, setEnvDefaults } from '@auth/core'
import type { AuthConfig, Session } from '@auth/core/types'
import { defu } from 'defu'
import { resolveApiBaseURL } from '../../shared/utils/url'
import { useRuntimeConfig } from '#imports'

let authOptions: AuthConfig | undefined

/**
 * Some environments (e.g. Vitest nuxt) polyfill Request with a class that
 * strips `cookie` per the Fetch spec's forbidden request-header rules.
 * Node 22's native Request no longer does this, but we need to handle the
 * polyfill case. Re-add the cookie from the H3 event if it was stripped.
 */
function patchCookieHeader(request: Request, event: H3Event): void {
  const cookie = event.headers.get('cookie')
  if (cookie && !request.headers.get('cookie')) {
    const patchedHeaders = new Headers(request.headers)
    patchedHeaders.set('cookie', cookie)
    Object.defineProperty(request, 'headers', {
      value: patchedHeaders,
      writable: false,
      configurable: true,
    })
  }
}

/**
 * Creates the Auth.js event handler that powers all authentication endpoints.
 * Call this once in your `server/api/auth/[...].ts` catch-all route to set up
 * sign-in, sign-out, session, and callback endpoints.
 *
 * This handler creates the following endpoints under your configured base path
 * (default `/api/auth`):
 *
 * - `GET/POST /signin` - Sign-in page and form submission
 * - `GET/POST /signout` - Sign-out page and form submission
 * - `GET /session` - Get current session
 * - `GET /csrf` - Get CSRF token
 * - `GET /providers` - List configured providers
 * - `GET/POST /callback/:provider` - OAuth callback handlers
 *
 * @param nuxtAuthOptions - Auth.js configuration including providers, callbacks,
 *                          and other options. See Auth.js docs for full options.
 * @returns H3 event handler to be exported as the default route handler
 *
 * @example
 * Basic setup with OAuth provider:
 * ```ts
 * // server/api/auth/[...].ts
 * import { NuxtAuthHandler } from '#auth'
 * import GitHub from '@auth/core/providers/github'
 *
 * export default NuxtAuthHandler({
 *   providers: [
 *     GitHub({
 *       clientId: process.env.GITHUB_CLIENT_ID,
 *       clientSecret: process.env.GITHUB_CLIENT_SECRET,
 *     }),
 *   ],
 *   secret: process.env.AUTH_SECRET,
 * })
 * ```
 *
 * @example
 * With credentials provider for username/password auth:
 * ```ts
 * import { NuxtAuthHandler } from '#auth'
 * import Credentials from '@auth/core/providers/credentials'
 *
 * export default NuxtAuthHandler({
 *   providers: [
 *     Credentials({
 *       credentials: {
 *         email: { label: 'Email', type: 'email' },
 *         password: { label: 'Password', type: 'password' },
 *       },
 *       async authorize(credentials) {
 *         const user = await validateUser(credentials)
 *         return user ?? null
 *       },
 *     }),
 *   ],
 *   secret: process.env.AUTH_SECRET,
 * })
 * ```
 *
 * @example
 * With custom session callback to include user ID:
 * ```ts
 * export default NuxtAuthHandler({
 *   providers: [...],
 *   callbacks: {
 *     session: ({ session, token }) => {
 *       session.user.id = token.sub
 *       return session
 *     },
 *   },
 * })
 * ```
 *
 * @see {@link https://authjs.dev/getting-started/providers} for provider setup
 * @see {@link https://authjs.dev/guides/callbacks} for callback configuration
 */
export function NuxtAuthHandler(nuxtAuthOptions?: AuthConfig) {
  const isProduction = process.env.NODE_ENV === 'production'
  const runtimeConfig = useRuntimeConfig()
  const trustHostUserPreference = runtimeConfig.public.auth.provider.trustHost

  const secret = nuxtAuthOptions?.secret || process.env.AUTH_SECRET
  if (!secret) {
    if (isProduction) {
      throw new Error(
        'AUTH_NO_SECRET: No `secret` - this is an error in production. You can ignore this during development',
      )
    } else {
      console.info(
        'AUTH_NO_SECRET: No `secret` - this is an error in production. You can ignore this during development',
      )
    }
  }

  if (authOptions) {
    console.error(
      'You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once',
    )
  }

  authOptions = defu(nuxtAuthOptions, {
    secret,
    providers: [],
    trustHost: trustHostUserPreference || !isProduction,
    basePath: runtimeConfig.public.auth.baseURL,
  }) as AuthConfig

  setEnvDefaults(process.env, authOptions)

  return eventHandler(async (event: H3Event) => {
    const request = toWebRequest(event)

    patchCookieHeader(request, event)

    const response = await Auth(request, authOptions!)

    // Auth.js builds its Response with the environment's Headers class.
    // Some environments (e.g. happy-dom in vitest-nuxt) combine multiple
    // Set-Cookie values into a single header entry, making getSetCookie()
    // unreliable. Use h3's splitCookiesString for robust cookie extraction.
    const setCookieHeaders = splitCookiesString(
      response.headers.get('set-cookie') ?? '',
    )

    // Auth.js returns redirects after sign-in/sign-out. When the client
    // requests JSON (via the composable), return the target URL as data
    // instead of a 302 so the client can handle navigation.
    const location = response.headers.get('location')
    if (location && response.status >= 300 && response.status < 400) {
      const url = new URL(request.url)
      if (url.searchParams.get('json') === 'true') {
        for (const cookie of setCookieHeaders) {
          appendResponseHeader(event, 'set-cookie', cookie)
        }
        return { url: location }
      }
    }

    // For JSON responses (session, providers, csrf): preserve the
    // original status code and headers (e.g. cache-control), transfer
    // cookies, and return the parsed body. Returning the parsed value
    // lets h3 send 204 for null (empty sessions).
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      setResponseStatus(event, response.status)
      response.headers.forEach((headerValue, headerName) => {
        if (headerName.toLowerCase() !== 'set-cookie') {
          appendResponseHeader(event, headerName, headerValue)
        }
      })
      for (const cookie of setCookieHeaders) {
        appendResponseHeader(event, 'set-cookie', cookie)
      }
      return await response.json()
    }

    // For all other responses (HTML sign-in/sign-out pages, non-JSON
    // redirects), return the Response — h3 handles it via sendWebResponse.
    return response
  })
}

/**
 * Retrieves the current user's session on the server side. Use this in API
 * routes, server middleware, or any server-side code to check if a user is
 * authenticated and access their session data.
 *
 * Returns `null` if the user is not authenticated or if the session has
 * expired. The session object contains user information and any custom data
 * you've added via Auth.js session callbacks.
 *
 * @param event - The H3 event from the current request
 * @returns The session object if authenticated, or `null` if not
 *
 * @example
 * Protecting an API route:
 * ```ts
 * // server/api/user/profile.ts
 * import { getServerSession } from '#auth'
 *
 * export default defineEventHandler(async (event) => {
 *   const session = await getServerSession(event)
 *
 *   if (!session) {
 *     throw createError({
 *       statusCode: 401,
 *       message: 'You must be logged in to access this resource',
 *     })
 *   }
 *
 *   // User is authenticated, return their data
 *   return {
 *     email: session.user?.email,
 *     name: session.user?.name,
 *   }
 * })
 * ```
 *
 * @example
 * Server middleware to protect all /api/admin routes:
 * ```ts
 * // server/middleware/admin-auth.ts
 * import { getServerSession } from '#auth'
 *
 * export default defineEventHandler(async (event) => {
 *   if (!event.path.startsWith('/api/admin')) return
 *
 *   const session = await getServerSession(event)
 *   if (!session || session.user?.role !== 'admin') {
 *     throw createError({ statusCode: 403, message: 'Forbidden' })
 *   }
 * })
 * ```
 *
 * @example
 * Fetching user-specific data:
 * ```ts
 * // server/api/orders.ts
 * import { getServerSession } from '#auth'
 *
 * export default defineEventHandler(async (event) => {
 *   const session = await getServerSession(event)
 *   if (!session) {
 *     throw createError({ statusCode: 401 })
 *   }
 *
 *   const orders = await db.orders.findMany({
 *     where: { userId: session.user.id },
 *   })
 *   return orders
 * })
 * ```
 */
export async function getServerSession(
  event: H3Event,
): Promise<Session | null> {
  const runtimeConfig = useRuntimeConfig()
  const authBasePathname = resolveApiBaseURL(runtimeConfig, true)
  const trustHostUserPreference = runtimeConfig.public.auth.provider.trustHost

  // Avoid running auth middleware on auth middleware (see #186)
  if (event.path && event.path.startsWith(authBasePathname)) {
    return null
  }

  // Nitro lazily loads route modules, so if getServerSession is called from
  // server middleware before any request has hit /api/auth/*, the catch-all
  // route module hasn't been imported yet and authOptions is still undefined.
  // Force-load it by fetching the session endpoint, which triggers module
  // import and NuxtAuthHandler() execution as a side effect.
  if (!authOptions) {
    const headers = getHeaders(event) as HeadersInit
    await $fetch(`${authBasePathname}/session`, { headers }).catch(
      (error: { data: unknown }) => error.data,
    )
    if (!authOptions) {
      throw createError({
        statusCode: 500,
        message:
          'Auth handler not initialized. Make sure NuxtAuthHandler() is called in your server/api/auth/[...].ts catch-all route. See https://github.com/zitadel/nuxt-auth#quick-start',
      })
    }
  }

  const headers = new Headers(getHeaders(event) as HeadersInit)
  const origin = getRequestURL(event, {
    xForwardedHost: trustHostUserPreference,
    xForwardedProto: trustHostUserPreference || undefined,
  })

  const url = createActionURL(
    'session',
    origin.protocol.slice(0, -1) as 'http' | 'https',
    headers,
    process.env,
    authOptions,
  )

  const request = new Request(url, { headers })
  patchCookieHeader(request, event)

  const response = await Auth(request, authOptions)
  const data = await response.json()
  if (
    typeof data === 'object' &&
    data !== null &&
    Object.keys(data).length > 0
  ) {
    return data as Session
  }

  return null
}
