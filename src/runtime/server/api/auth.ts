import { getQuery, setCookie, readBody, appendHeader, sendRedirect, eventHandler, parseCookies, createError } from 'h3'
import type { H3Event } from 'h3'

import { NextAuthHandler } from 'next-auth/core'
import type { RequestInternal } from 'next-auth/core'
import type { NextAuthAction } from 'next-auth'

import GithubProvider from 'next-auth/providers/github'

// TODO: Make `NEXTAUTH_URL` configurable
const NEXTAUTH_URL = new URL('http://localhost:3000/api/auth/')
const NEXTAUTH_BASE_PATH = NEXTAUTH_URL.pathname

const normalizedBasePath = () => {
  if (NEXTAUTH_BASE_PATH.endsWith('/')) {
    return NEXTAUTH_BASE_PATH
  }

  return `${NEXTAUTH_BASE_PATH}/`
}

const SUPPORTED_ACTIONS: NextAuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error', '_log']

// TODO: Make this code less brittle
const parseActionAndAttachedInfo = ({ req }: H3Event) => {
  // 0. `req.url` looks like: `${NEXTAUTH_BASE_PATH}signin/github?callbackUrl=http://localhost:3000/`

  // 1. Split off query (only first questionmark has significance: https://stackoverflow.com/a/2924187)
  //    -> result: `${NEXTAUTH_BASE_PATH}signin/github`
  const urlWithoutQuery = req.url.split('?')[0]

  // 2. Split off auth base path
  //    -> result: `signin/github`
  const normalizedBase = normalizedBasePath()
  const [, actionInfo] = urlWithoutQuery.split(normalizedBase)
  if (!actionInfo) {
    throw createError({ statusCode: 400, statusMessage: 'Auth request URL does not have expected format: Not enough segments' })
  }

  // 3. Split apart remaining path
  // -> result: ['signin', 'github']
  const actionSegments = actionInfo.split('/')
  if (![1, 2].includes(actionSegments.length)) {
    // see https://next-auth.js.org/getting-started/rest-api for available endpoints
    throw createError({ statusCode: 400, statusMessage: 'Auth request must either contain one or two actions segments (e.g.: `/providers` or `/siginIn/github`' })
  }

  // 4. Now, process desired action
  let unvalidatedAction: string
  let providerId: string
  if (actionSegments.length === 1) {
    unvalidatedAction = actionSegments[0]
  } else if (actionSegments.length === 2) {
    unvalidatedAction = actionSegments[0]
    providerId = actionSegments[1]
  }

  // Get TS to correctly infer the type of `unvalidatedAction`
  const action = SUPPORTED_ACTIONS.find(action => action === unvalidatedAction)
  if (!action) {
    throw createError({ statusCode: 400, statusMessage: `Called endpoint with unsupported action ${unvalidatedAction}. Only the following actions are supported: ${SUPPORTED_ACTIONS.join(', ')}` })
  }

  return { action, providerId }
}

/**
 * Parse a body if the request method is supported, return `undefined` otherwise.

* @param event H3Event event to read body of
 */
const readBodyForNext = async (event: H3Event) => {
  let body: any
  if (['PATCH', 'POST', 'PUT', 'DELETE'].includes(event.req.method)) {
    body = await readBody(event)
  }
  return body
}

/**
 * Generate a NextAuth.js internal request object that we can pass into the NextAuth.js
 * handler. This method will either try to fill all fields for a request that targets
 * the auth-REST API (determined by NEXTAUTH_BASE_PATH) or return a minimal internal
 * request to support server-side session fetching for requests with arbitrary, non
 * auth-REST API targets (set via: `event.context.checkSessionOnNonAuthRequest = true`)
 *
 * @param event H3Event event to transform into `RequestInternal`
 */
const getInternalNextAuthRequestData = async (event: H3Event): Promise<RequestInternal> => {
  const nextRequest: RequestInternal = {
    // TODO: Set this correctly
    host: undefined,
    body: undefined,
    cookies: parseCookies(event),
    query: undefined,
    headers: event.req.headers,
    method: event.req.method,
    action: undefined,
    providerId: undefined,
    error: undefined
  }

  // Setting `event.context.checkSessionOnNonAuthRequest = true` allows callers of `authHandler`
  // to check the session on arbitrary requests, not just requests starting with `NEXTAUTH_BASE_PATH`. We
  // can use this to check session status on the server-side.
  //
  // When doing this, most other data is not required, e.g., we do not need to parse the body. For this reason,
  // we return the minimum required data for session checking.
  if (event.context.checkSessionOnNonAuthRequest === true) {
    return {
      ...nextRequest,
      action: 'session'
    }
  }

  // 2. Figure out what action, providerId (optional) and error (optional) of the NextAuth.js lib is targeted
  const query = getQuery(event)
  const { action, providerId } = parseActionAndAttachedInfo(event)
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
    error
  }
}

/**
 * The auth handler can perform all methods that the NextAuth.js library supports. It has two modes:
 * 1. handle auth-requests: Handling of login, logout, get session, ... requests that target the auth-REST-API
 * 2. server-side session fetching: Get the session (if any) that is attached to a request. To do this, set `event.context.checkSessionOnNonAuthRequest = true` and then call this handler. The handler will process less data and only perform a `session` action via NextAuth.js
 *
 * @param event H3Event H3Event to check authentication on.
 */
const authHandler = async (event: H3Event) => {
  const { req, res } = event

  // 1. Skip handler if both:
  //    a) request is not meant for the auth-handler,
  //    b) AND server-side flag that forces a check for arbitrary requests is not set to `true`
  const url = req.url
  if (!url.startsWith(NEXTAUTH_BASE_PATH) && event.context.checkSessionOnNonAuthRequest !== true) {
    return
  }

  // 2. Assemble and perform request to the NextAuth.js auth handler
  const nextRequest = await getInternalNextAuthRequestData(event)

  // @ts-expect-error import is exported on .default during SSR
  const github = GithubProvider?.default || GithubProvider
  const nextResult = await NextAuthHandler({
    req: nextRequest,
    options: {
      logger: undefined,
      providers: [
        // TODO: **IMPORTANT** remove this before release + delete oauth app (this is also documented in the alpha issue)
        github({
          clientId: '6d8a47f9ebd9f1edd1db',
          clientSecret: 'ae712565e3b2be5eb26bfba8e4cfc8025dd64bd8'
        })
      ]
    }
  })

  // 5. Set response status, headers, cookies
  if (nextResult.status) {
    res.statusCode = nextResult.status
  }
  nextResult.cookies?.forEach(cookie => setCookie(event, cookie.name, cookie.value, cookie.options))
  nextResult.headers?.forEach(header => appendHeader(event, header.key, header.value))

  // 6. Return either:
  // 6.1 the body directly if no redirect is set:
  if (!nextResult.redirect) {
    return nextResult.body
  }
  // 6.2 a json-object with a redirect url if `json: true` is set by client:
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
  // 6.3 via a redirect:
  return sendRedirect(event, nextResult.redirect)
}

export const getServerSession = async (event: H3Event) => {
  // Run a session check on the event with an arbitrary target endpoint
  event.context.checkSessionOnNonAuthRequest = true
  const session = await authHandler(event)
  delete event.context.checkSessionOnNonAuthRequest

  // TODO: This check also happens in the `useSession` composable, refactor it into a small util instead to ensure consistency
  if (!session || Object.keys(session).length === 0) {
    return null
  }

  return session
}
export default eventHandler(authHandler)
