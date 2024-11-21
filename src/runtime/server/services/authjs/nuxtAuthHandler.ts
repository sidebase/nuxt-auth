import { createError, eventHandler, getHeaders, getRequestHost, getRequestProtocol, getRequestWebStream, sendWebResponse } from 'h3'
import type { H3Event } from 'h3'

import { Auth as AuthHandler, raw } from '@auth/core'
import { getToken as authjsGetToken } from '@auth/core/jwt'
import type { AuthConfig, ResponseInternal, Session } from '@auth/core/types'
import type { GetTokenParams } from '@auth/core/jwt'

import { defu } from 'defu'
import { joinURL } from 'ufo'
import { ERROR_MESSAGES } from '../errors'
import { isNonEmptyObject } from '../../../utils/checkSessionResult'
import { getServerOrigin } from '../utils'
import { useTypedBackendConfig } from '../../../helpers'

import { useRuntimeConfig } from '#imports'

let preparedAuthjsHandler: ((req: Request) => Promise<Response>) | undefined
let preparedAuthjsHandlerRaw: ((req: Request) => Promise<ResponseInternal>) | undefined
let usedSecret: string | string[] | undefined

/** Setup the nuxt (next) auth event handler, based on the passed in options */
export function NuxtAuthHandler(nuxtAuthOptions?: AuthConfig) {
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
    basePath: '/api/auth',
  })

  const optionsRaw = defu(options, {
    // Enable framework-author specific functionality
    raw: raw as typeof raw
  })

  // Save handler so that it can be used in other places
  if (preparedAuthjsHandler) {
    console.error('You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }

  preparedAuthjsHandler = (req: Request) => AuthHandler(req, options)
  preparedAuthjsHandlerRaw = (req: Request) => AuthHandler(req, optionsRaw)

  return eventHandler(async (event: H3Event) => {
    // 1. Assemble request to the Auth.js handler
    const authjsRequest = await createRequestForAuthjs(event, trustHostUserPreference)

    // 2. Call Authjs
    // Safety: `preparedAuthjsHandler` was assigned earlier and never re-assigned.
    const authjsResponse = await preparedAuthjsHandler!(authjsRequest)
    return sendWebResponse(event, authjsResponse)
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
  if (!preparedAuthjsHandlerRaw) {
    // Edge-case: If no auth-endpoint was called yet, `preparedAuthHandler`-initialization was also not attempted as Nuxt lazily loads endpoints in production-mode.
    // This call gives it a chance to load + initialize the variable. If it fails we still throw. This edge-case has happened to user matijao#7025 on discord.
    await $fetch(sessionUrlPath, { headers }).catch(error => error.data)
    if (!preparedAuthjsHandlerRaw) {
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

  // Invoke Auth.js in `raw` mode
  const authjsResponse = await preparedAuthjsHandlerRaw(authjsRequest)

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
    req: {
      headers: event.headers
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
async function createRequestForAuthjs(event: H3Event, trustHostUserPreference: boolean): Promise<Request> {
  // Adapted from `h3`
  const webRequest = event.web?.request || new Request(getRequestURLFromH3Event(event, trustHostUserPreference), {
    // @ts-expect-error Undici option
    duplex: 'half',
    method: event.method,
    headers: event.headers,
    body: getRequestWebStream(event)
  })

  return webRequest
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
  // This may throw, we don't catch it
  const origin = getServerOrigin(event)

  return origin
}
