import { eventHandler, createError, getHeaders, sendWebResponse, getRequestWebStream, getRequestProtocol, getRequestHost } from 'h3'
import type { H3Event } from 'h3'

import { Auth as AuthHandler } from '@auth/core'
import type { AuthConfig, Session } from '@auth/core/types'
import { } from '@auth/core/'
import { getToken as nextGetToken } from 'next-auth/jwt'
// import type { RequestInternal } from 'next-auth/core'
import type { GetTokenParams } from 'next-auth/jwt'

import { } from '@auth/core/providers/github'

import { defu } from 'defu'
import { joinURL } from 'ufo'
import { ERROR_MESSAGES } from '../errors'
import { isNonEmptyObject } from '../../../utils/checkSessionResult'
import { getServerOrigin } from '../utils'
import { useTypedBackendConfig } from '../../../helpers'

import { useRuntimeConfig } from '#imports'

let preparedAuthjsHandler: ((req: Request) => Promise<Response>) | undefined
let usedSecret: string | string[] | undefined

// const SUPPORTED_ACTIONS: AuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error', '_log']

/**
 * Parse a body if the request method is supported, return `undefined` otherwise.

* @param event H3Event event to read body of
 */
// const readBodyForNext = async (event: H3Event) => {
//   let body: any

//   if (isMethod(event, ['PATCH', 'POST', 'PUT', 'DELETE'])) {
//     body = await readBody(event)
//   }
//   return body
// }

/**
 * Get action and optional provider from a request.
 *
 * E.g., with a request like `/api/signin/github` get the action `signin` with the provider `github`
 */
// const parseActionAndProvider = ({ context }: H3Event): { action: AuthAction, providerId: string | undefined } => {
//   const params: string[] | undefined = context.params?._?.split('/')

//   if (!params || ![1, 2].includes(params.length)) {
//     throw createError({ statusCode: 400, statusMessage: `Invalid path used for auth-endpoint. Supply either one path parameter (e.g., \`/api/auth/session\`) or two (e.g., \`/api/auth/signin/github\` after the base path (in previous examples base path was: \`/api/auth/\`. Received \`${params}\`` })
//   }

//   const [unvalidatedAction, providerId] = params

//   // Get TS to correctly infer the type of `unvalidatedAction`
//   const action = SUPPORTED_ACTIONS.find(action => action === unvalidatedAction)
//   if (!action) {
//     throw createError({ statusCode: 400, statusMessage: `Called endpoint with unsupported action ${unvalidatedAction}. Only the following actions are supported: ${SUPPORTED_ACTIONS.join(', ')}` })
//   }

//   return { action, providerId }
// }

/** Setup the nuxt (next) auth event handler, based on the passed in options */
export function NuxtAuthHandler (nuxtAuthOptions?: AuthConfig) {
  const isProduction = process.env.NODE_ENV === 'production'
  const trustHostUserPreference = useTypedBackendConfig(useRuntimeConfig(), 'authjs').trustHost

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

    // SAFETY: We trust host here because `getRequestURLFromRequest` is responsible for producing a trusted URL
    trustHost: true,

    // AuthJS uses `/auth` as default, but we rely on `/api/auth` (same as in previous `next-auth`)
    basePath: '/api/auth'

    // Enable framework-author specific functionality
    // raw: raw as typeof raw
  })

  // Save handler so that it can be used in other places
  if (preparedAuthjsHandler) {
    console.error('You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }

  preparedAuthjsHandler = (req: Request) => AuthHandler(req, options)

  // 2. Set response status, headers, cookies
  // if (nextResult.status) {
  //   res.statusCode = nextResult.status
  // }
  // nextResult.cookies?.forEach(cookie => setCookieDeduped(event, cookie.name, cookie.value, cookie.options))
  // nextResult.headers?.forEach(header => appendHeaderDeduped(event, header.key, header.value))

  // // 3. Return either:
  // // 3.1 the body directly if no redirect is set:
  // if (!nextResult.redirect) {
  //   return nextResult.body
  // }
  // // 3.2 a json-object with a redirect url if `json: true` is set by client:
  // //      ```
  // //      // quote from https://github.com/nextauthjs/next-auth/blob/261968b9bbf8f57dd34651f60580d078f0c8a2ef/packages/next-auth/src/react/index.tsx#L3-L7
  // //      On signIn() and signOut() we pass 'json: true' to request a response in JSON
  // //      instead of HTTP as redirect URLs on other domains are not returned to
  // //      requests made using the fetch API in the browser, and we need to ask the API
  // //      to return the response as a JSON object (the end point still defaults to
  // //      returning an HTTP response with a redirect for non-JavaScript clients).
  // //      ```
  // if (nextRequest.body?.json) {
  //   return { url: nextResult.redirect }
  // }

  // // 3.3 via a redirect:
  // return await sendRedirect(event, nextResult.redirect)

  return eventHandler(async (event: H3Event) => {
    // Transform h3 request to the web-standard Request
    const authjsRequest = createRequestForAuthjs(event, trustHostUserPreference)

    // Call Authjs
    // Safety: `preparedAuthjsHandler` was assigned earlier and never re-assigned
    const authjsResult = await preparedAuthjsHandler!(authjsRequest)

    const res = sendWebResponse(event, authjsResult)

    return res
  })
}

export async function getServerSession (event: H3Event) {
  const runtimeConfig = useRuntimeConfig()
  const authBasePath = runtimeConfig.public.auth.computed.pathname
  const trustHostUserPreference = useTypedBackendConfig(runtimeConfig, 'authjs').trustHost

  // avoid running auth middleware on auth middleware (see #186)
  if (event.path && event.path.startsWith(authBasePath)) {
    return null
  }

  const sessionUrlPath = joinURL(authBasePath, '/session')
  if (!preparedAuthjsHandler) {
    const headers = getHeaders(event) as HeadersInit

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
  const authjsRequest = new Request(sessionUrl, {
    method: 'GET',
    headers: event.headers
  })

  const authjsResponse = await preparedAuthjsHandler(authjsRequest)

  // Get the json of response.
  // At the moment of writing, `session` endpoint returns JSON: https://github.com/nextauthjs/next-auth/blob/a7a48a142f47e4c03d39df712a2bf810342cf202/packages/core/src/lib/actions/session.ts#L25-L29
  const session = await authjsResponse.json()
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
export function getToken<R extends boolean = false> ({ event, secureCookie, secret, ...rest }: Omit<GetTokenParams<R>, 'req'> & { event: H3Event }) {
  return nextGetToken({
    req: {
      headers: event.headers
    },
    // see https://github.com/nextauthjs/next-auth/blob/8387c78e3fef13350d8a8c6102caeeb05c70a650/packages/next-auth/src/jwt/index.ts#L73
    secureCookie: secureCookie ?? getServerOrigin(event).startsWith('https://'),
    secret: secret || usedSecret!,
    ...rest
  })
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
function createRequestForAuthjs (event: H3Event, trustHostUserPreference: boolean): Request {
  // Adapted from `h3`
  const webRequest = event.web?.request || new Request(getRequestURLFromH3Event(event, trustHostUserPreference), {
    // @ts-ignore Undici option
    duplex: 'half',
    method: event.method,
    headers: event.headers,
    body: getRequestWebStream(event)
  })

  return webRequest

  // // TODO Use web-standard Request + rely on next-auth building the response
  // const nextRequest: Omit<Request, 'action'> = {
  //   host: getRequestURLFromRequest(event, { trustHost: useConfig().trustHost }),
  //   body: null,
  //   cookies: parseCookies(event),
  //   query: undefined,
  //   headers: getHeaders(event),
  //   method: event.method,
  //   providerId: undefined,
  //   error: undefined
  // }

  // // Setting `event.context.checkSessionOnNonAuthRequest = true` allows callers of `authHandler`.
  // // We can use this to check session status on the server-side.
  // //
  // // When doing this, most other data is not required, e.g., we do not need to parse the body. For this reason,
  // // we return the minimum required data for session checking.
  // if (event.context.checkSessionOnNonAuthRequest === true) {
  //   return {
  //     ...nextRequest,
  //     method: 'GET',
  //     action: 'session'
  //   }
  // }

  // // Figure out what action, providerId (optional) and error (optional) of the NextAuth.js lib is targeted
  // const query = getQuery(event)
  // const { action, providerId } = parseActionAndProvider(event)
  // const error = query.error
  // if (Array.isArray(error)) {
  //   throw createError({ statusCode: 400, statusMessage: 'Error query parameter can only appear once' })
  // }

  // const body = await readBodyForNext(event)

  // event.node.req

  // return {
  //   ...nextRequest,
  //   body,
  //   query,
  //   action,
  //   providerId,
  //   error: String(error) || undefined
  // }
}

/**
 * Get the request url or construct it.
 * Adapted from `h3` to also account for server origin.
 *
 * WARNING: Please ensure that any URL produced by this function has a trusted host!
 */
function getRequestURLFromH3Event (event: H3Event, trustHost: boolean): URL {
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    '/'
  )
  const base = getRequestBaseFromH3Event(event, trustHost)
  return new URL(path, base)
}

function getRequestBaseFromH3Event (event: H3Event, trustHost: boolean): string {
  if (trustHost) {
    const host = getRequestHost(event, { xForwardedHost: trustHost })
    const protocol = getRequestProtocol(event)

    return `${protocol}://${host}`
  } else {
    // This may throw, we don't catch it
    const origin = getServerOrigin(event)

    return joinURL(origin, useRuntimeConfig().public.auth.computed.pathname)
  }
}

/** Adapted from `h3` to fix https://github.com/sidebase/nuxt-auth/issues/523 */
// function appendHeaderDeduped (event: H3Event, name: string, value: string) {
//   let current = getResponseHeader(event, name)
//   if (!current) {
//     setResponseHeader(event, name, value)
//     return
//   }

//   if (!Array.isArray(current)) {
//     current = [current.toString()]
//   }

//   // Check existence of a header value and avoid adding it again
//   if (current.includes(value)) {
//     return
//   }

//   current.push(value)
//   setResponseHeader(event, name, current)
// }

// /**
//  * Adds a cookie, overriding its previous value.
//  * Related to https://github.com/sidebase/nuxt-auth/issues/523
//  */
// function setCookieDeduped (event: H3Event, name: string, value: string, serializeOptions: CookieSerializeOptions) {
//   // Deduplicate by removing the same name cookie
//   let setCookiesHeader = getResponseHeader(event, 'set-cookie')
//   if (setCookiesHeader) {
//     if (!Array.isArray(setCookiesHeader)) {
//       setCookiesHeader = [setCookiesHeader.toString()]
//     }

//     // Safety: `cookie-es` builds up the cookie by using `name + '=' + encodedValue`
//     // https://github.com/unjs/cookie-es/blob/a3495860248b98e7015c9a3ade8c6c47ad3403df/src/index.ts#L102
//     const filterBy = `${name}=`
//     setCookiesHeader = setCookiesHeader.filter(cookie => !cookie.startsWith(filterBy))

//     setResponseHeader(event, 'set-cookie', setCookiesHeader)
//   }

//   setCookie(event, name, value, serializeOptions)
// }
