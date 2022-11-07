import { NextAuthHandler } from 'next-auth/core'
import { getQuery, setCookie, readBody, appendHeader, sendRedirect, eventHandler, parseCookies, createError } from 'h3'
import type { H3Event } from 'h3'
import type { RequestInternal } from 'next-auth/core'
import type { NextAuthAction, NextAuthOptions, Session } from 'next-auth'
import defu from 'defu'
import { useRuntimeConfig } from '#imports'

let preparedAuthHandler: ReturnType<typeof defineEventHandler> | undefined
const SUPPORTED_ACTIONS: NextAuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error', '_log']

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
 * Get action and optional provider from a request.
 *
 * E.g., with a request like `/api/signin/github` get the action `signin` with the provider `github`
 */
const parseActionAndProvider = ({ context }: H3Event): { action: NextAuthAction, providerId: string | undefined } => {
  const params: string | undefined = context.params._?.split('/')

  if (![1, 2].includes(params.length)) {
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

/** Setup the nuxt (next) auth event handler, based on the passed in options */
export const NuxtAuthHandler = (nuxtAuthOptions?: NextAuthOptions) => {
  let usedSecret = nuxtAuthOptions?.secret
  if (!usedSecret) {
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line no-console
      console.error('No secret supplied - a secret is mandatory for production')
      throw new Error('Bad production config - please set `secret` inside the `nuxtAuthOptions`')
    } else {
      // eslint-disable-next-line no-console
      console.warn('No secret supplied - this will be necessary when running in production')
      usedSecret = 'secret'
    }
  }
  const options = defu(nuxtAuthOptions, {
    secret: usedSecret,
    logger: undefined,
    providers: []
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
      host: useRuntimeConfig().auth.url,
      body: undefined,
      cookies: parseCookies(event),
      query: undefined,
      headers: event.req.headers,
      method: event.req.method,
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
      error
    }
  }

  const handler = eventHandler(async (event: H3Event) => {
    const { res } = event

    // 1. Assemble and perform request to the NextAuth.js auth handler
    const nextRequest = await getInternalNextAuthRequestData(event)

    const nextResult = await NextAuthHandler({
      req: nextRequest,
      options
    })

    // 2. Set response status, headers, cookies
    if (nextResult.status) {
      res.statusCode = nextResult.status
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

  // Save handler so that it can be used in other places
  if (preparedAuthHandler) {
    // eslint-disable-next-line no-console
    console.warn('You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }
  preparedAuthHandler = handler
  return handler
}

export const getServerSession = async (event: H3Event) => {
  if (!preparedAuthHandler) {
    throw createError({ statusCode: 500, statusMessage: 'Tried to get server session without setting up an endpoint to handle authentication (see https://github.com/sidebase/nuxt-auth#quick-start)' })
  }

  // Run a session check on the event with an arbitrary target endpoint
  event.context.checkSessionOnNonAuthRequest = true
  const session = await preparedAuthHandler(event)
  delete event.context.checkSessionOnNonAuthRequest

  // TODO: This check also happens in the `useSession` composable, refactor it into a small util instead to ensure consistency
  if (!session || Object.keys(session).length === 0) {
    return null
  }

  return session as Session
}
