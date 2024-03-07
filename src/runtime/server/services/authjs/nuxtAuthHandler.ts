import type { IncomingHttpHeaders } from 'http'
import { getQuery, setCookie, readBody, sendRedirect, eventHandler, parseCookies, createError, isMethod, getHeaders, getResponseHeader, setResponseHeader } from 'h3'
import type { H3Event } from 'h3'
import type { CookieSerializeOptions } from 'cookie-es'

import { AuthHandler } from 'next-auth/core'
import { getToken as nextGetToken } from 'next-auth/jwt'
import type { RequestInternal } from 'next-auth/core'
import type { AuthAction, AuthOptions, Session } from 'next-auth'
import type { GetTokenParams } from 'next-auth/jwt'

import { defu } from 'defu'
import { joinURL } from 'ufo'
import { ERROR_MESSAGES } from '../errors'
import { isNonEmptyObject } from '../../../utils/checkSessionResult'
import { getServerOrigin, getRequestURLFromRequest } from '../utils'
import { useTypedBackendConfig } from '../../../helpers'

import { useRuntimeConfig } from '#imports'

let preparedAuthHandler: ReturnType<typeof eventHandler> | undefined
let usedSecret: string | undefined
const SUPPORTED_ACTIONS: AuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error', '_log']

const useConfig = () => useTypedBackendConfig(useRuntimeConfig(), 'authjs')

/**
 * Parse a body if the request method is supported, return `undefined` otherwise.

* @param event H3Event event to read body of
 */
const readBodyForNext = async (event: H3Event) => {
  let body: any

  if (isMethod(event, ['PATCH', 'POST', 'PUT', 'DELETE'])) {
    body = await readBody(event)
  }
  return body
}

/**
 * Get action and optional provider from a request.
 *
 * E.g., with a request like `/api/signin/github` get the action `signin` with the provider `github`
 */
const parseActionAndProvider = ({ context }: H3Event): { action: AuthAction, providerId: string | undefined } => {
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

/** Setup the nuxt (next) auth event handler, based on the passed in options */
export const NuxtAuthHandler = (nuxtAuthOptions?: AuthOptions) => {
  const isProduction = process.env.NODE_ENV === 'production'

  usedSecret = nuxtAuthOptions?.secret
  if (!usedSecret) {
    if (isProduction) {
      throw new Error(ERROR_MESSAGES.NO_SECRET)
    } else {
      console.info(ERROR_MESSAGES.NO_SECRET)
      usedSecret = 'secret'
    }
  }

  const options = defu(nuxtAuthOptions, {
    secret: usedSecret,
    logger: undefined,
    providers: [],
    trustHost: useConfig().trustHost
  })

  /**
   * Generate a NextAuth.js internal request object that we can pass into the NextAuth.js
   * handler. This method will either try to fill all fields for a request that targets
   * the auth-REST API or return a minimal internal request to support server-side
   * session fetching for requests with arbitrary, non auth-REST API
   * targets (set via: `event.context.checkSessionOnNonAuthRequest = true`)
   *
   * @param event H3Event event to transform into `RequestInternal`
   */
  const getInternalNextAuthRequestData = async (event: H3Event): Promise<RequestInternal> => {
    const nextRequest: Omit<RequestInternal, 'action'> = {
      host: getRequestURLFromRequest(event, { trustHost: useConfig().trustHost }),
      body: undefined,
      cookies: parseCookies(event),
      query: undefined,
      headers: getHeaders(event),
      method: event.method,
      providerId: undefined,
      error: undefined
    }

    // Setting `event.context.checkSessionOnNonAuthRequest = true` allows callers of `authHandler`.
    // We can use this to check session status on the server-side.
    //
    // When doing this, most other data is not required, e.g., we do not need to parse the body. For this reason,
    // we return the minimum required data for session checking.
    if (event.context.checkSessionOnNonAuthRequest === true) {
      return {
        ...nextRequest,
        method: 'GET',
        action: 'session'
      }
    }

    // Figure out what action, providerId (optional) and error (optional) of the NextAuth.js lib is targeted
    const query = getQuery(event)
    const { action, providerId } = parseActionAndProvider(event)
    const error = query.error
    if (Array.isArray(error)) {
      throw createError({ statusCode: 400, statusMessage: 'Error query parameter can only appear once' })
    }

    const body = await readBodyForNext(event)

    return {
      ...nextRequest,
      body,
      query,
      action,
      providerId,
      error: String(error) || undefined
    }
  }

  const handler = eventHandler(async (event: H3Event) => {
    const { res } = event.node

    // 1. Assemble and perform request to the NextAuth.js auth handler
    const nextRequest = await getInternalNextAuthRequestData(event)

    const nextResult = await AuthHandler({
      req: nextRequest,
      options
    })

    // 2. Set response status, headers, cookies
    if (nextResult.status) {
      res.statusCode = nextResult.status
    }
    nextResult.cookies?.forEach(cookie => setCookieDeduped(event, cookie.name, cookie.value, cookie.options))
    nextResult.headers?.forEach(header => appendHeaderDeduped(event, header.key, header.value))

    // 3. Return either:
    // 3.1 the body directly if no redirect is set:
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
    return sendRedirect(event, nextResult.redirect)
  })

  // Save handler so that it can be used in other places
  if (preparedAuthHandler) {
    console.warn('You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }
  preparedAuthHandler = handler
  return handler
}

export const getServerSession = async (event: H3Event) => {
  const authBasePath = useRuntimeConfig().public.auth.computed.pathname

  // avoid running auth middleware on auth middleware (see #186)
  if (event.path && event.path.startsWith(authBasePath)) {
    return null
  }
  if (!preparedAuthHandler) {
    const headers = getHeaders(event) as HeadersInit

    // Edge-case: If no auth-endpoint was called yet, `preparedAuthHandler`-initialization was also not attempted as Nuxt lazily loads endpoints in production-mode. This call gives it a chance to load + initialize the variable. If it fails we still throw. This edge-case has happened to user matijao#7025 on discord.
    await $fetch(joinURL(authBasePath, '/session'), { headers }).catch(error => error.data)
    if (!preparedAuthHandler) {
      throw createError({ statusCode: 500, statusMessage: 'Tried to get server session without setting up an endpoint to handle authentication (see https://github.com/sidebase/nuxt-auth#quick-start)' })
    }
  }

  // Run a session check on the event with an arbitrary target endpoint
  event.context.checkSessionOnNonAuthRequest = true
  const session = await preparedAuthHandler(event)
  delete event.context.checkSessionOnNonAuthRequest

  if (isNonEmptyObject(session)) {
    return session as Session
  }

  return null
}

/**
 * Get the decoded JWT token either from cookies or header (both are attempted).
 *
 * The only change from the original `getToken` implementation is that the `req` is not passed in, in favor of `event` being passed in. See https://next-auth.js.org/tutorials/securing-pages-and-api-routes#using-gettoken for further documentation.
 *
 * @param eventAndOptions Omit<GetTokenParams, 'req'> & { event: H3Event } The event to get the cookie or authorization header from that contains the JWT Token and options you want to alter token getting behavior.
 */
export const getToken = <R extends boolean = false>({ event, secureCookie, secret, ...rest }: Omit<GetTokenParams<R>, 'req'> & { event: H3Event }) => nextGetToken({
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

/** Adapted from `h3` to fix https://github.com/sidebase/nuxt-auth/issues/523 */
function appendHeaderDeduped (event: H3Event, name: string, value: string) {
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
function setCookieDeduped (event: H3Event, name: string, value: string, serializeOptions: CookieSerializeOptions) {
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
