import type { IncomingHttpHeaders } from 'node:http'
import { createError, eventHandler, getHeaders, getQuery, getRequestHost, getRequestProtocol, getResponseHeader, isMethod, parseCookies, readBody, sendRedirect, setCookie, setResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'

import { AuthHandler } from 'next-auth/core'
import { getToken as authjsGetToken } from 'next-auth/jwt'
import type { RequestInternal, ResponseInternal } from 'next-auth/core'
import type { AuthAction, AuthOptions, Session } from 'next-auth'
import type { GetTokenParams } from 'next-auth/jwt'

import { defu } from 'defu'
import { joinURL } from 'ufo'
import { ERROR_MESSAGES } from '../errors'
import { isNonEmptyObject } from '../../../utils/checkSessionResult'
import { getServerOrigin } from '../utils'
import { useTypedBackendConfig } from '../../../helpers'

import { useRuntimeConfig } from '#imports'

let preparedAuthjsHandler: ((req: RequestInternal) => Promise<ResponseInternal>) | undefined
let usedSecret: string | undefined

/** Setup the nuxt (next) auth event handler, based on the passed in options */
export function NuxtAuthHandler(nuxtAuthOptions?: AuthOptions) {
  const isProduction = process.env.NODE_ENV === 'production'
  const trustHostUserPreference = useTypedBackendConfig(useRuntimeConfig(), 'authjs').trustHost

  usedSecret = nuxtAuthOptions?.secret
  if (!usedSecret) {
    if (isProduction) {
      throw new Error(ERROR_MESSAGES.NO_SECRET)
    }
    else {
      console.info(ERROR_MESSAGES.NO_SECRET)
      usedSecret = 'secret'
    }
  }

  const options = defu(nuxtAuthOptions, {
    secret: usedSecret,
    logger: undefined,
    providers: [],

    // SAFETY: We trust host here because `getRequestURLFromH3Event` is responsible for producing a trusted URL
    trustHost: true,

    // AuthJS uses `/auth` as default, but we rely on `/api/auth` (same as in previous `next-auth`)
    basePath: '/api/auth'

    // Uncomment to enable framework-author specific functionality
    // raw: raw as typeof raw
  })

  // Save handler so that it can be used in other places
  if (preparedAuthjsHandler) {
    console.error('You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }

  preparedAuthjsHandler = (req: RequestInternal) => AuthHandler({ req, options })

  return eventHandler(async (event: H3Event) => {
    const { res } = event.node

    // 1.1. Assemble and perform request to the NextAuth.js auth handler
    const nextRequest = await createRequestForAuthjs(event, trustHostUserPreference)

    // 1.2. Call Authjs
    // Safety: `preparedAuthjsHandler` was assigned earlier and never re-assigned
    const nextResult = await preparedAuthjsHandler!(nextRequest)

    // 2. Set response status, headers, cookies
    if (nextResult.status) {
      res.statusCode = nextResult.status
    }
    nextResult.cookies?.forEach(cookie => setCookieDeduped(event, cookie.name, cookie.value, cookie.options))
    nextResult.headers?.forEach(header => appendHeaderDeduped(event, header.key, header.value))

    // 3. Return either:
    // 3.1. the body directly if no redirect is set:
    if (!nextResult.redirect) {
      return nextResult.body
    }
    // 3.2 a json-object with a redirect url if `json: true` is set by client:
    //      ```
    //      // quote from https://github.com/nextauthjs/next-auth/blob/261968b9bbf8f57dd34651f60580d078f0c8a2ef/packages/next-auth/src/react/index.tsx#L3-L7
    //      On signIn() and signOut() we pass 'json: true' to request a response in JSON
    //      instead of HTTP as redirect URLs on other domains are not returned to
    //      requests made using the fetch API in the browser, and we need to ask the API
    //      to return the response as a JSON object (the end point still defaults to
    //      returning an HTTP response with a redirect for non-JavaScript clients).
    //      ```
    if (nextRequest.body?.json) {
      return { url: nextResult.redirect }
    }

    // 3.3 via a redirect:
    return await sendRedirect(event, nextResult.redirect)
  })
}

/** Gets session on server-side */
export async function getServerSession(event: H3Event) {
  const runtimeConfig = useRuntimeConfig()
  const authBasePath = runtimeConfig.public.auth.computed.pathname
  const trustHostUserPreference = useTypedBackendConfig(runtimeConfig, 'authjs').trustHost

  // avoid running auth middleware on auth middleware (see #186)
  if (event.path && event.path.startsWith(authBasePath)) {
    return null
  }

  const sessionUrlPath = joinURL(authBasePath, '/session')
  const headers = getHeaders(event) as HeadersInit
  if (!preparedAuthjsHandler) {
    // Edge-case: If no auth-endpoint was called yet, `preparedAuthHandler`-initialization was also not attempted as Nuxt lazily loads endpoints in production-mode.
    // This call gives it a chance to load + initialize the variable. If it fails we still throw. This edge-case has happened to user matijao#7025 on discord.
    await $fetch(sessionUrlPath, { headers }).catch(error => error.data)
    if (!preparedAuthjsHandler) {
      throw createError({ statusCode: 500, statusMessage: 'Tried to get server session without setting up an endpoint to handle authentication (see https://github.com/sidebase/nuxt-auth#quick-start)' })
    }
  }

  // Build a correct endpoint
  const sessionUrlBase = getRequestBaseFromH3Event(event, trustHostUserPreference)
  const sessionUrl = new URL(sessionUrlPath, sessionUrlBase)

  // Create a virtual Request to check the session
  const authjsRequest: RequestInternal = {
    action: 'session',
    method: 'GET',
    headers,
    body: undefined,
    cookies: parseCookies(event),
    providerId: undefined,
    error: undefined,
    host: sessionUrl.origin,
    query: Object.fromEntries(sessionUrl.searchParams)
  }

  // Invoke Auth.js
  const authjsResponse = await preparedAuthjsHandler(authjsRequest)

  // Get the body of response
  const session = authjsResponse.body
  if (isNonEmptyObject(session)) {
    return session as Session
  }

  return null
}

/**
 * Get the decoded JWT token either from cookies or header (both are attempted).
 *
 * The only change from the original `getToken` implementation is that the `req` is not passed in, in favor of `event` being passed in.
 * See https://next-auth.js.org/tutorials/securing-pages-and-api-routes#using-gettoken for further documentation.
 *
 * @param eventAndOptions The event and options used to alter the token behaviour.
 * @param eventAndOptions.event The event to get the cookie or authorization header from that contains the JWT Token
 * @param eventAndOptions.secureCookie boolean to determine if the protocol is secured with https
 * @param eventAndOptions.secret A secret string used for encryption
 */
export function getToken<R extends boolean = false>({ event, secureCookie, secret, ...rest }: Omit<GetTokenParams<R>, 'req'> & { event: H3Event }) {
  return authjsGetToken({
    // @ts-expect-error As our request is not a real next-auth request, we pass down only what's required for the method, as per code from https://github.com/nextauthjs/next-auth/blob/8387c78e3fef13350d8a8c6102caeeb05c70a650/packages/next-auth/src/jwt/index.ts#L68
    req: {
      cookies: parseCookies(event),
      headers: getHeaders(event) as IncomingHttpHeaders
    },
    // see https://github.com/nextauthjs/next-auth/blob/8387c78e3fef13350d8a8c6102caeeb05c70a650/packages/next-auth/src/jwt/index.ts#L73
    secureCookie: secureCookie ?? getServerOrigin(event).startsWith('https://'),
    secret: secret || usedSecret,
    ...rest
  })
}

/**
 * Generate an Auth.js request object that can be passed into the handler.
 * This method should only be used for authentication endpoints.
 *
 * @param event H3Event to transform into `RequestInternal`
 */
async function createRequestForAuthjs(event: H3Event, trustHostUserPreference: boolean): Promise<RequestInternal> {
  const nextRequest: Omit<RequestInternal, 'action'> = {
    host: getRequestURLFromH3Event(event, trustHostUserPreference).origin,
    body: undefined,
    cookies: parseCookies(event),
    query: undefined,
    headers: getHeaders(event),
    method: event.method,
    providerId: undefined,
    error: undefined
  }

  // Figure out what action, providerId (optional) and error (optional) of the NextAuth.js lib is targeted
  const query = getQuery(event)
  const { action, providerId } = parseActionAndProvider(event)
  const error = query.error
  if (Array.isArray(error)) {
    throw createError({ statusCode: 400, statusMessage: 'Error query parameter can only appear once' })
  }

  // Parse a body if the request method is supported, use `undefined` otherwise
  const body = isMethod(event, ['PATCH', 'POST', 'PUT', 'DELETE'])
    ? await readBody(event)
    : undefined

  return {
    ...nextRequest,
    body,
    query,
    action,
    providerId,
    error: error ? String(error) : undefined
  }
}

/**
 * Get the request url or construct it.
 * Adapted from `h3` to also account for server origin.
 *
 * ## WARNING
 * Please ensure that any URL produced by this function has a trusted host!
 *
 * @param event The H3 Event containing the request
 * @param trustHost Whether the host can be trusted. If `true`, base will be inferred from the request, otherwise the configured origin will be used.
 * @throws {Error} When server origin was incorrectly configured or when URL building failed
 */
function getRequestURLFromH3Event(event: H3Event, trustHost: boolean): URL {
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    '/'
  )
  const base = getRequestBaseFromH3Event(event, trustHost)
  return new URL(path, base)
}

/**
 * Gets the request base in the form of origin.
 *
 * ## WARNING
 * Please ensure that any URL produced by this function has a trusted host!
 *
 * @param event The H3 Event containing the request
 * @param trustHost Whether the host can be trusted. If `true`, base will be inferred from the request, otherwise the configured origin will be used.
 * @throws {Error} When server origin was incorrectly configured
 */
function getRequestBaseFromH3Event(event: H3Event, trustHost: boolean): string {
  if (trustHost) {
    const host = getRequestHost(event, { xForwardedHost: trustHost })
    const protocol = getRequestProtocol(event)

    return `${protocol}://${host}`
  }
  else {
    // This may throw, we don't catch it
    const origin = getServerOrigin(event)

    return origin
  }
}

/** Actions supported by auth handler */
const SUPPORTED_ACTIONS: AuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error', '_log']

/**
 * Get action and optional provider from a request.
 *
 * E.g. with a request like `/api/signin/github` get the action `signin` with the provider `github`
 */
function parseActionAndProvider({ context }: H3Event): { action: AuthAction, providerId: string | undefined } {
  const params: string[] | undefined = context.params?._?.split('/')

  if (!params || ![1, 2].includes(params.length)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid path used for auth-endpoint. Supply either one path parameter (e.g., \`/api/auth/session\`) or two (e.g., \`/api/auth/signin/github\` after the base path (in previous examples base path was: \`/api/auth/\`. Received \`${params}\`` })
  }

  const [unvalidatedAction, providerId] = params

  // Get TS to correctly infer the type of `unvalidatedAction`
  const action = SUPPORTED_ACTIONS.find(action => action === unvalidatedAction)
  if (!action) {
    throw createError({ statusCode: 400, statusMessage: `Called endpoint with unsupported action ${unvalidatedAction}. Only the following actions are supported: ${SUPPORTED_ACTIONS.join(', ')}` })
  }

  return { action, providerId }
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
    // https://github.com/unjs/cookie-es/blob/a3495860248b98e7015c9a3ade8c6c47ad3403df/src/index.ts#L102
    const filterBy = `${name}=`
    setCookiesHeader = setCookiesHeader.filter(cookie => !cookie.startsWith(filterBy))

    setResponseHeader(event, 'set-cookie', setCookiesHeader)
  }

  setCookie(event, name, value, serializeOptions)
}
