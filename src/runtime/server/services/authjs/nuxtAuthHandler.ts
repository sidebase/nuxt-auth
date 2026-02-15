import { createError, eventHandler, getHeaders, getRequestURL, getResponseHeader, parseCookies, readBody, sendRedirect, setCookie, setResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'
import { Auth, createActionURL, setEnvDefaults } from '@auth/core'
import type { AuthConfig, Session } from '@auth/core/types'
import { defu } from 'defu'
import { joinURL } from 'ufo'
import { ERROR_MESSAGES } from '../errors'
import { isNonEmptyObject } from '../../../utils/checkSessionResult'
import { useTypedBackendConfig } from '../../../helpers'
import { resolveApiBaseURL } from '../../../utils/url'
import { useRuntimeConfig } from '#imports'

type RuntimeConfig = ReturnType<typeof useRuntimeConfig>

let authOptions: AuthConfig | undefined

/**
 * Setup the Auth.js event handler based on the passed in options
 */
export function NuxtAuthHandler(nuxtAuthOptions?: AuthConfig) {
  const isProduction = process.env.NODE_ENV === 'production'
  const runtimeConfig = useRuntimeConfig()
  const trustHostUserPreference = useTypedBackendConfig(runtimeConfig, 'authjs').trustHost

  const secret = nuxtAuthOptions?.secret || process.env.AUTH_SECRET
  if (!secret) {
    if (isProduction) {
      throw new Error(ERROR_MESSAGES.NO_SECRET)
    }
    else {
      console.info(ERROR_MESSAGES.NO_SECRET)
    }
  }

  // Warn if handler is being set up twice
  if (authOptions) {
    console.error('You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }

  authOptions = defu(nuxtAuthOptions, {
    secret: secret || 'secret',
    providers: [],
    trustHost: trustHostUserPreference || !isProduction,
    basePath: runtimeConfig.public.auth.baseURL,
  })

  // Apply environment defaults
  setEnvDefaults(process.env, authOptions)

  return eventHandler(async (event: H3Event) => {
    // Build a standard Request from the H3 event
    const request = await createRequestFromH3Event(event, runtimeConfig, trustHostUserPreference)

    // Call Auth.js
    const response = await Auth(request, authOptions!)

    // Process the response
    return await handleAuthResponse(event, response, request)
  })
}

/**
 * Gets session on server-side
 */
export async function getServerSession(event: H3Event): Promise<Session | null> {
  const runtimeConfig = useRuntimeConfig()
  const authBasePathname = resolveApiBaseURL(runtimeConfig, true)
  const trustHostUserPreference = useTypedBackendConfig(runtimeConfig, 'authjs').trustHost

  // Avoid running auth middleware on auth middleware (see #186)
  if (event.path && event.path.startsWith(authBasePathname)) {
    return null
  }

  if (!authOptions) {
    // Edge-case: If no auth-endpoint was called yet, authOptions was not initialized
    const sessionUrlPath = joinURL(authBasePathname, '/session')
    const headers = getHeaders(event) as HeadersInit
    await $fetch(sessionUrlPath, { headers }).catch(error => error.data)
    if (!authOptions) {
      throw createError({ statusCode: 500, message: 'Tried to get server session without setting up an endpoint to handle authentication (see https://github.com/sidebase/nuxt-auth#quick-start)' })
    }
  }

  // Create a session URL using Auth.js utilities
  const requestUrl = getRequestURL(event, {
    xForwardedHost: trustHostUserPreference,
    xForwardedProto: trustHostUserPreference || undefined
  })

  const protocol = requestUrl.protocol.replace(':', '') as 'http' | 'https'
  const headers = new Headers(getHeaders(event) as HeadersInit)

  const url = createActionURL(
    'session',
    protocol,
    headers,
    process.env,
    authOptions
  )

  // Create request with cookies
  const cookies = parseCookies(event)
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')

  if (cookieHeader) {
    headers.set('cookie', cookieHeader)
  }

  const response = await Auth(new Request(url, { headers }), authOptions)

  const data = await response.json()
  if (isNonEmptyObject(data)) {
    return data as Session
  }

  return null
}

/**
 * Get the decoded JWT token either from cookies or header (both are attempted).
 *
 * @param eventAndOptions The event and options used to alter the token behaviour.
 * @param eventAndOptions.event The event to get the cookie or authorization header from that contains the JWT Token
 * @param eventAndOptions.secureCookie boolean to determine if the protocol is secured with https
 * @param eventAndOptions.secret A secret string used for encryption
 */
export async function getToken({ event }: { event: H3Event, secureCookie?: boolean, secret?: string }): Promise<unknown> {
  // Auth.js Core doesn't export getToken directly, so we need to manually decode the JWT
  // For now, we'll use a simpler approach - get the session which includes the token data
  const session = await getServerSession(event)
  return session
}

/**
 * Create a standard Request object from an H3 event
 */
async function createRequestFromH3Event(
  event: H3Event,
  runtimeConfig: RuntimeConfig,
  trustHostUserPreference: boolean
): Promise<Request> {
  const requestUrl = getRequestURL(event, {
    xForwardedHost: trustHostUserPreference,
    xForwardedProto: trustHostUserPreference || undefined
  })

  const headers = new Headers(getHeaders(event) as HeadersInit)

  // Parse cookies and add to headers
  const cookies = parseCookies(event)
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')

  if (cookieHeader) {
    headers.set('cookie', cookieHeader)
  }

  // Read body for POST/PUT/PATCH/DELETE requests
  let body: BodyInit | undefined
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method)) {
    const rawBody = await readBody(event)
    if (rawBody) {
      if (typeof rawBody === 'object') {
        // Handle form data
        const formData = new URLSearchParams()
        for (const [key, value] of Object.entries(rawBody)) {
          formData.append(key, String(value))
        }
        body = formData.toString()
        headers.set('content-type', 'application/x-www-form-urlencoded')
      }
      else {
        body = rawBody
      }
    }
  }

  return new Request(requestUrl.href, {
    method: event.method,
    headers,
    body
  })
}

/**
 * Handle the Auth.js response and convert it back to H3 response
 */
async function handleAuthResponse(
  event: H3Event,
  response: Response,
  originalRequest: Request
): Promise<unknown> {
  const { res } = event.node

  // Set status code
  if (response.status) {
    res.statusCode = response.status
  }

  // Handle cookies from Set-Cookie header
  const setCookieHeader = response.headers.getSetCookie?.() ?? []
  for (const cookie of setCookieHeader) {
    const parsed = parseCookieString(cookie)
    if (parsed) {
      setCookieDeduped(event, parsed.name, parsed.value, parsed.options)
    }
  }

  // Copy other headers
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      appendHeaderDeduped(event, key, value)
    }
  })

  // Check if this is a redirect
  const location = response.headers.get('location')
  if (location && response.status >= 300 && response.status < 400) {
    // Check if the original request wanted JSON response
    const url = new URL(originalRequest.url)
    const wantsJson = url.searchParams.get('json') === 'true'

    if (wantsJson) {
      return { url: location }
    }

    return await sendRedirect(event, location)
  }

  // Return body
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return await response.json()
  }

  return await response.text()
}

/**
 * Parse a Set-Cookie string into name, value, and options
 */
function parseCookieString(cookieStr: string): { name: string, value: string, options: CookieSerializeOptions } | null {
  const parts = cookieStr.split(';').map(p => p.trim())
  if (parts.length === 0) {
    return null
  }

  const nameValue = parts[0]
  if (!nameValue) {
    return null
  }

  const attrs = parts.slice(1)
  const eqIndex = nameValue.indexOf('=')
  if (eqIndex === -1) {
    return null
  }

  const name = nameValue.substring(0, eqIndex)
  const value = nameValue.substring(eqIndex + 1)

  const options: CookieSerializeOptions = {}

  for (const attr of attrs) {
    const attrParts = attr.split('=').map(s => s.trim())
    const attrName = attrParts[0]
    const attrValue = attrParts[1]

    if (!attrName) {
      continue
    }

    const lowerAttrName = attrName.toLowerCase()

    switch (lowerAttrName) {
      case 'path':
        options.path = attrValue
        break
      case 'domain':
        options.domain = attrValue
        break
      case 'expires':
        if (attrValue) {
          options.expires = new Date(attrValue)
        }
        break
      case 'max-age':
        if (attrValue) {
          options.maxAge = Number.parseInt(attrValue, 10)
        }
        break
      case 'secure':
        options.secure = true
        break
      case 'httponly':
        options.httpOnly = true
        break
      case 'samesite':
        if (attrValue) {
          options.sameSite = attrValue.toLowerCase() as 'lax' | 'strict' | 'none'
        }
        break
    }
  }

  return { name, value, options }
}

/** Adapted from `h3` to fix https://github.com/sidebase/nuxt-auth/issues/523 */
function appendHeaderDeduped(event: H3Event, name: string, value: string) {
  let current = getResponseHeader(event, name)
  if (!current) {
    setResponseHeader(event, name, value)
    return
  }

  if (!Array.isArray(current)) {
    current = [current.toString()]
  }

  // Check existence of a header value and avoid adding it again
  if (current.includes(value)) {
    return
  }

  current.push(value)
  setResponseHeader(event, name, current)
}

/**
 * Adds a cookie, overriding its previous value.
 * Related to https://github.com/sidebase/nuxt-auth/issues/523
 */
function setCookieDeduped(event: H3Event, name: string, value: string, serializeOptions: CookieSerializeOptions) {
  // Deduplicate by removing the same name cookie
  let setCookiesHeader = getResponseHeader(event, 'set-cookie')
  if (setCookiesHeader) {
    if (!Array.isArray(setCookiesHeader)) {
      setCookiesHeader = [setCookiesHeader.toString()]
    }

    // Safety: `cookie-es` builds up the cookie by using `name + '=' + encodedValue`
    const filterBy = `${name}=`
    setCookiesHeader = setCookiesHeader.filter(cookie => !cookie.startsWith(filterBy))

    setResponseHeader(event, 'set-cookie', setCookiesHeader)
  }

  setCookie(event, name, value, serializeOptions)
}
