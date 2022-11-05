import { NextAuthHandler } from 'next-auth/core'
import { parseURL } from 'ufo'
import { getQuery, setCookie, readBody, appendHeader, sendRedirect, eventHandler, parseCookies, createError } from 'h3'
import type { H3Event } from 'h3'
import type { RequestInternal } from 'next-auth/core'
import type { NextAuthAction } from 'next-auth'
import defu from 'defu'
import type { NextAuthConfig } from '../../../module'

const SUPPORTED_ACTIONS: NextAuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error', '_log']

const parseBaseUrl = (url?: string) => url ? parseURL(url) : parseURL('http://localhost:3000/api/auth/')

/**
 * Parse a body if the request method is supported, return `undefined` otherwise.

* @param event H3Event event to read body of
 */
const readBodyForNext = async (event: H3Event) => {
  let body: any
  const { method } = event.req

  if (method && ['PATCH', 'POST', 'PUT', 'DELETE'].includes(method)) {
    body = await readBody(event)
  }
  return body
}

/**
 * Ensure that the base-path of the nextauth endpoint ends with a `/`
 *
 * @returns normalizedBasePath string
 */
const normalizeBasePath = (path: string) => {
  if (path.endsWith('/')) {
    return path
  }

  return `${path}/`
}

/** Setup the nuxt (next) auth event handler, based on the passed in options */
export const NuxtAuthHandler = (nextAuthOption?: NextAuthConfig) => {
  const { url, options } = defu(nextAuthOption, {
    url: 'http://localhost:3000/api/auth/',
    options: {
      logger: undefined,
      providers: []
    }
  })

  const parsedUrl = parseBaseUrl(url)
  const NEXTAUTH_BASE_PATH = normalizeBasePath(parsedUrl.pathname)

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
    const nextRequest: Omit<RequestInternal, 'action'> = {
      host: url,
      body: undefined,
      cookies: parseCookies(event),
      query: undefined,
      headers: event.req.headers,
      method: event.req.method,
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

  // TODO: Make this code less brittle, checkout if implementation exists withing nextauth itself
  const parseActionAndAttachedInfo = ({ req }: H3Event) => {
  // 0. `req.url` looks like: `${NEXTAUTH_BASE_PATH}signin/github?callbackUrl=http://localhost:3000/`
    const requestUrl = req.url
    if (!requestUrl) {
      throw createError({ statusCode: 400, statusMessage: 'Auth request URL must exist at this point' })
    }

    // 1. Split off query (only first questionmark has significance: https://stackoverflow.com/a/2924187)
    //    -> result: `${NEXTAUTH_BASE_PATH}signin/github`
    const urlWithoutQuery = requestUrl.split('?')[0]

    // 2. Split off auth base path
    //    -> result: `signin/github`
    const [, actionInfo] = urlWithoutQuery.split(NEXTAUTH_BASE_PATH)
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
    let providerId: string | undefined
    if (actionSegments.length === 1) {
      unvalidatedAction = actionSegments[0]
    } else if (actionSegments.length === 2) {
      unvalidatedAction = actionSegments[0]
      providerId = actionSegments[1]
    } else {
      throw createError({ statusCode: 500, statusMessage: 'Reached unreachable branch - there must be either 1 or 2 segments as we validates this above' })
    }

    // Get TS to correctly infer the type of `unvalidatedAction`
    const action = SUPPORTED_ACTIONS.find(action => action === unvalidatedAction)
    if (!action) {
      throw createError({ statusCode: 400, statusMessage: `Called endpoint with unsupported action ${unvalidatedAction!}. Only the following actions are supported: ${SUPPORTED_ACTIONS.join(', ')}` })
    }

    return { action, providerId }
  }

  return eventHandler(async (event: H3Event) => {
    const { res } = event

    // TODO: Do we have to check a path match?

    // 2. Assemble and perform request to the NextAuth.js auth handler
    const nextRequest = await getInternalNextAuthRequestData(event)

    const nextResult = await NextAuthHandler({
      req: nextRequest,
      options
    })

    // 3. Set response status, headers, cookies
    if (nextResult.status) {
      res.statusCode = nextResult.status
    }
    nextResult.cookies?.forEach(cookie => setCookie(event, cookie.name, cookie.value, cookie.options))
    nextResult.headers?.forEach(header => appendHeader(event, header.key, header.value))

    // 4. Return either:
    // 4.1 the body directly if no redirect is set:
    if (!nextResult.redirect) {
      return nextResult.body
    }
    // 4.2 a json-object with a redirect url if `json: true` is set by client:
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
    // 4.3 via a redirect:
    return sendRedirect(event, nextResult.redirect)
  })
}
