import { IncomingMessage } from 'node:http'
import type { H3Event, HTTPMethod } from 'h3'
import { appendHeader, createError, eventHandler, getHeaders, getMethod, getQuery, parseCookies, sendRedirect, setCookie } from 'h3'

import type { AuthAction, AuthOptions, Session } from 'next-auth'
import type { RequestInternal } from 'next-auth/core'
import { AuthHandler } from 'next-auth/core'
import type { GetTokenParams } from 'next-auth/jwt'
import { getToken as nextGetToken } from 'next-auth/jwt'

import { parse } from 'cookie'
import defu from 'defu'
import getURL from 'requrl'
import { getQuery as _getQuery, joinURL } from 'ufo'
import { isNonEmptyObject } from '../../utils/checkSessionResult'

import { useRuntimeConfig } from '#imports'

let preparedAuthHandler: ReturnType<typeof eventHandler> | undefined
let preparedAuthHandlerExternal: ((req: IncomingMessage) => any) | undefined
let usedSecret: string | undefined
const SUPPORTED_ACTIONS: AuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error', '_log']
const PAYLOAD_METHODS: HTTPMethod[] = ['PATCH', 'POST', 'PUT', 'DELETE']

export const ERROR_MESSAGES = {
  NO_SECRET: 'AUTH_NO_SECRET: No `secret` - this is an error in production, see https://sidebase.io/nuxt-auth/ressources/errors. You can ignore this during development',
  NO_ORIGIN: 'AUTH_NO_ORIGIN: No `origin` - this is an error in production, see https://sidebase.io/nuxt-auth/ressources/errors. You can ignore this during development'
}

/**
 * Parse a body if the request method is supported, return `undefined` otherwise.
 */
const readBodyForNext = (req: IncomingMessage) => {
  if (!(req.method && PAYLOAD_METHODS.includes(req.method as HTTPMethod))) {
    return undefined
  }

  const promise = new Promise<Buffer>(
    (resolve, reject) => {
      const bodyData: any[] = []
      req
        .on('error', (err) => {
          reject(err)
        })
        .on('data', (chunk) => {
          bodyData.push(chunk)
        })
        .on('end', () => {
          resolve(Buffer.concat(bodyData))
        })
    }
  )

  return promise.then(buffer => JSON.parse(buffer.toString('utf8')))
}

/**
 * Get action and optional provider from a request.
 *
 * E.g., with a request like `/api/signin/github` get the action `signin` with the provider `github`
 */
const parseActionAndProvider = (req: IncomingMessage): { action: AuthAction, providerId: string | undefined } => {
  const authBasePath = useRuntimeConfig().public.auth.basePath
  const params: string[] | undefined = req.url ? new URL(req.url).pathname.replace(authBasePath, '').split('/') : undefined

  if (!params || ![1, 2].includes(params.length)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid path used for auth-endpoint. Supply either one path parameter (e.g., \`/api/auth/session\`) or two (e.g., \`/api/auth/signin/github\` after the base path (in previous examples base path was: \`/api/auth/\`. Received \`${params}\`` })
  }

  const [unvalidatedAction, providerId] = params

  // Get TS to correctly infer the type of `unvalidatedAction`
  const action = SUPPORTED_ACTIONS.find(action => action === unvalidatedAction)
  if (!action) {
    throw createError({ statusCode: 400, statusMessage: `Called endpoint with unsupported action ${unvalidatedAction!}. Only the following actions are supported: ${SUPPORTED_ACTIONS.join(', ')}` })
  }

  return { action, providerId }
}

/**
 * Get `origin` and fallback to `x-forwarded-host` or `host` headers if not in production.
 */
export const getServerOrigin = (req?: IncomingMessage): string => {
  // Prio 1: Environment variable
  const envOrigin = process.env.AUTH_ORIGIN
  if (envOrigin) {
    return envOrigin
  }

  // Prio 2: Runtime configuration
  const runtimeConfigOrigin = useRuntimeConfig().auth.origin
  if (runtimeConfigOrigin) {
    return runtimeConfigOrigin
  }

  // Prio 3: Try to infer the origin if we're not in production
  if (process.env.NODE_ENV !== 'production') {
    return getURL(req)
  }

  throw new Error(ERROR_MESSAGES.NO_ORIGIN)
}

/** Extract the host from the environment */
const detectHost = (
  req: IncomingMessage,
  { trusted, basePath }: { trusted: boolean, basePath: string }
): string | undefined => {
  if (trusted) {
    const forwardedValue = getURL(req)
    if (forwardedValue) {
      return Array.isArray(forwardedValue) ? forwardedValue[0] : forwardedValue
    }
  }

  let origin: string
  try {
    origin = getServerOrigin(req)
  } catch (error) {
    return undefined
  }
  return joinURL(origin, basePath)
}

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
    host: detectHost(event.node.req, { trusted: useRuntimeConfig().auth.trustHost, basePath: useRuntimeConfig().auth.basePath }),
    body: undefined,
    cookies: parseCookies(event),
    query: undefined,
    headers: getHeaders(event),
    method: getMethod(event),
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
  const { action, providerId } = parseActionAndProvider(event.node.req)
  const error = query.error
  if (Array.isArray(error)) {
    throw createError({ statusCode: 400, statusMessage: 'Error query parameter can only appear once' })
  }

  const body = await readBodyForNext(event.node.req)

  return {
    ...nextRequest,
    body,
    query,
    action,
    providerId,
    error: error || undefined
  }
}

/**
   * Generate a NextAuth.js internal request object that we can pass into the NextAuth.js
   * handler. This method will either try to fill all fields for a request that targets
   * the auth-REST API.
   */
const getInternalNextAuthRequestDataExternal = async (req: IncomingMessage): Promise<RequestInternal> => {
  const nextRequest: Omit<RequestInternal, 'action'> = {
    host: detectHost(req, { trusted: useRuntimeConfig().auth.trustHost, basePath: useRuntimeConfig().auth.basePath }),
    body: undefined,
    cookies: parse(req.headers.cookie || ''),
    query: undefined,
    headers: req.headers,
    method: req.method,
    providerId: undefined,
    error: undefined
  }

  // Figure out what action, providerId (optional) and error (optional) of the NextAuth.js lib is targeted
  const query = _getQuery(req.url || '')
  const { action, providerId } = parseActionAndProvider(req)
  const error = query.error
  if (Array.isArray(error)) {
    throw createError({ statusCode: 400, statusMessage: 'Error query parameter can only appear once' })
  }

  const body = await readBodyForNext(req)

  return {
    ...nextRequest,
    body,
    query,
    action,
    providerId,
    error: error || undefined
  }
}

/** Setup the nuxt (next) auth event handler, based on the passed in options */
export const NuxtAuthHandler = (nuxtAuthOptions?: AuthOptions) => {
  const isProduction = process.env.NODE_ENV === 'production'

  usedSecret = nuxtAuthOptions?.secret
  if (!usedSecret) {
    if (isProduction) {
      throw new Error(ERROR_MESSAGES.NO_SECRET)
    } else {
    // eslint-disable-next-line no-console
      console.info(ERROR_MESSAGES.NO_SECRET)
      usedSecret = 'secret'
    }
  }

  const options = defu(nuxtAuthOptions, {
    secret: usedSecret,
    logger: undefined,
    providers: [],
    trustHost: useRuntimeConfig().auth.trustHost
  })

  const handler = eventHandler(async (event: H3Event) => {
    // 1. Assemble and perform request to the NextAuth.js auth handler
    const nextRequest = await getInternalNextAuthRequestData(event)

    const nextResult = await AuthHandler({
      req: nextRequest,
      options
    })

    // 2. Set response status, headers, cookies
    if (nextResult.status) {
      event.node.res.statusCode = nextResult.status
    }
    nextResult.cookies?.forEach(cookie => setCookie(event, cookie.name, cookie.value, cookie.options))
    nextResult.headers?.forEach(header => appendHeader(event, header.key, header.value))

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

  const handlerExternal = async (req: IncomingMessage) => {
    // Assemble and perform request to the NextAuth.js auth handler
    const nextRequest = await getInternalNextAuthRequestDataExternal(req)

    await AuthHandler({
      req: nextRequest,
      options
    })
  }

  // Save handlers so that it can be used in other places
  if (preparedAuthHandler) {
    // eslint-disable-next-line no-console
    console.warn('You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }

  if (preparedAuthHandlerExternal) {
    // eslint-disable-next-line no-console
    console.warn('You setup the external auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }

  preparedAuthHandler = handler
  preparedAuthHandlerExternal = handlerExternal
  return handler
}

export const getServerSession = async (event: H3Event) => {
  const authBasePath = useRuntimeConfig().public.auth.basePath
  // avoid running auth middleware on auth middleware (see #186)
  if (event.path && event.path.startsWith(authBasePath)) {
    return null
  }
  if (!preparedAuthHandler) {
    // Edge-case: If no auth-endpoint was called yet, `preparedAuthHandler`-initialization was also not attempted as Nuxt lazily loads endpoints in production-mode. This call gives it a chance to load + initialize the variable. If it fails we still throw. This edge-case has happened to user matijao#7025 on discord.
    await $fetch(joinURL(authBasePath, '/session')).catch(error => error.data)
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
 * Get server session with an external type of request different from standard http e.g. websockets
 * This will not set any cookies or headers as a response.
 */
export const getServerSessionExternal = async (req: IncomingMessage) => {
  const authBasePath = useRuntimeConfig().public.auth.basePath

  if (!preparedAuthHandlerExternal) {
    // Edge-case: If no auth-endpoint was called yet, `preparedAuthHandlerExternal`-initialization was also not attempted as Nuxt lazily loads endpoints in production-mode. This call gives it a chance to load + initialize the variable. If it fails we still throw. This edge-case has happened to user matijao#7025 on discord.
    await $fetch(joinURL(authBasePath, '/session')).catch(error => error.data)
    if (!preparedAuthHandlerExternal) {
      throw createError({ statusCode: 500, statusMessage: 'Tried to get server session without setting up an endpoint to handle authentication (see https://github.com/sidebase/nuxt-auth#quick-start)' })
    }
  }

  const session = await preparedAuthHandlerExternal(req)

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
export const getToken = ({ event, secureCookie, secret, ...rest }: Omit<GetTokenParams, 'req'> & { event: H3Event }) => nextGetToken({
  // @ts-expect-error As our request is not a real next-auth request, we pass down only what's required for the method, as per code from https://github.com/nextauthjs/next-auth/blob/8387c78e3fef13350d8a8c6102caeeb05c70a650/packages/next-auth/src/jwt/index.ts#L68
  req: {
    cookies: parseCookies(event),
    headers: getHeaders(event)
  },
  // see https://github.com/nextauthjs/next-auth/blob/8387c78e3fef13350d8a8c6102caeeb05c70a650/packages/next-auth/src/jwt/index.ts#L73
  secureCookie: secureCookie || getServerOrigin(event.node.req).startsWith('https://'),
  secret: secret || usedSecret,
  ...rest
})
