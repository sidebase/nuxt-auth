import type { IncomingMessage } from 'node:http'
import type { HTTPMethod } from 'h3'
import { createError } from 'h3'

import type { AuthAction, AuthOptions, Session } from 'next-auth'
import type { RequestInternal } from 'next-auth/core'
import { AuthHandler } from 'next-auth/core'

import cookie from 'cookie'
import defu from 'defu'
import getURL from 'requrl'
import { getQuery, joinURL } from 'ufo'
import { isNonEmptyObject } from '../../utils/checkSessionResult'
import { ERROR_MESSAGES, PAYLOAD_METHODS, SUPPORTED_ACTIONS } from './nuxtAuthHandler'

import { useRuntimeConfig } from '#imports'

let preparedAuthHandler: (req: IncomingMessage) => any | undefined

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
  const params: string[] | undefined = new URL(req.url).pathname.replace(authBasePath, '').split('/')

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
const getServerOrigin = (req?: IncomingMessage): string => {
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

/** Setup the nuxt (next) auth event handler, based on the passed in options */
export const NuxtAuthHandlerExternal = (nuxtAuthOptions?: AuthOptions) => {
  const isProduction = process.env.NODE_ENV === 'production'
  const options = defu(nuxtAuthOptions, {
    secret: isProduction ? nuxtAuthOptions?.secret : 'secret',
    logger: undefined,
    providers: [],
    trustHost: useRuntimeConfig().auth.trustHost
  })

  /**
   * Generate a NextAuth.js internal request object that we can pass into the NextAuth.js
   * handler. This method will either try to fill all fields for a request that targets
   * the auth-REST API or return a minimal internal request to support server-side
   * session fetching for requests with arbitrary, non auth-REST API
   * targets (set via: `event.context.checkSessionOnNonAuthRequest = true`)
   */
  const getInternalNextAuthRequestData = async (req: IncomingMessage): Promise<RequestInternal> => {
    const nextRequest: Omit<RequestInternal, 'action'> = {
      host: detectHost(req, { trusted: useRuntimeConfig().auth.trustHost, basePath: useRuntimeConfig().auth.basePath }),
      cookies: cookie.parse(req.headers.cookie || ''),
      headers: req.headers,
      method: req.method
    }

    // Figure out what action, providerId (optional) and error (optional) of the NextAuth.js lib is targeted
    const query = getQuery(req.url || '')
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

  const handler = async (req: IncomingMessage) => {
    // Assemble and perform request to the NextAuth.js auth handler
    const nextRequest = await getInternalNextAuthRequestData(req)

    await AuthHandler({
      req: nextRequest,
      options
    })
  }

  // Save handler so that it can be used in other places
  if (preparedAuthHandler) {
    // eslint-disable-next-line no-console
    console.warn('You setup the auth handler for a second time - this is likely undesired. Make sure that you only call `NuxtAuthHandler( ... )` once')
  }
  preparedAuthHandler = handler
  return handler
}

/**
 * Get server session with an external type of request different from standard http e.g. websockets
 * This will not set any cookies or headers as a response.
 */
export const getServerSessionExternal = async (req: IncomingMessage) => {
  const authBasePath = useRuntimeConfig().public.auth.basePath

  if (!preparedAuthHandler) {
    // Edge-case: If no auth-endpoint was called yet, `preparedAuthHandler`-initialization was also not attempted as Nuxt lazily loads endpoints in production-mode. This call gives it a chance to load + initialize the variable. If it fails we still throw. This edge-case has happened to user matijao#7025 on discord.
    await $fetch(joinURL(authBasePath, '/session')).catch(error => error.data)
    if (!preparedAuthHandler) {
      throw createError({ statusCode: 500, statusMessage: 'Tried to get server session without setting up an endpoint to handle authentication (see https://github.com/sidebase/nuxt-auth#quick-start)' })
    }
  }

  const session = await preparedAuthHandler(req)

  if (isNonEmptyObject(session)) {
    return session as Session
  }

  return null
}
