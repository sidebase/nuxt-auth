import { getQuery, setCookie, readBody, appendHeader, sendRedirect, eventHandler, parseCookies, createError } from 'h3'
import type { H3Event } from 'h3'

import { NextAuthHandler } from 'next-auth/core'
import type { RequestInternal } from 'next-auth/core'
import type { NextAuthAction } from 'next-auth'

import GithubProvider from 'next-auth/providers/github'

// TODO: Make `NEXTAUTH_URL` configurable
const NEXTAUTH_URL = new URL('http://localhost:3000/api/auth/')
const NEXTAUTH_BASE_PATH = NEXTAUTH_URL.pathname

const SUPPORTED_ACTIONS: NextAuthAction[] = ['providers', 'session', 'csrf', 'signin', 'signout', 'callback', 'verify-request', 'error', '_log']

// TODO: Make this code less brittle
const parseActionAndAttachedInfo = ({ req }: H3Event, nextAuthBasePath: string) => {
  // 0. `req.url` looks like: `${NEXTAUTH_BASE_PATH}signin/github?callbackUrl=http://localhost:3000/`

  // 1. Split off query (only first questionmark has significance: https://stackoverflow.com/a/2924187)
  //    -> result: `${NEXTAUTH_BASE_PATH}signin/github`
  const urlWithoutQuery = req.url.split('?')[0]

  // 2. Split off auth base path
  //    -> result: `signin/github`
  const normalizedBase = nextAuthBasePath.endsWith('/') ? nextAuthBasePath : `${nextAuthBasePath}/`
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

const readBodyForNext = async (event: H3Event) => {
  let body: any
  if (['PATCH', 'POST', 'PUT', 'DELETE'].includes(event.req.method)) {
    body = await readBody(event)
  }
  return body
}

export default eventHandler(async (event) => {
  const { req, res } = event

  // 1. Skip middleware if this request is not meant for an auth-endpoint
  const url = req.url
  if (!url.startsWith(NEXTAUTH_BASE_PATH)) {
    return
  }

  // 2. Figure out what action, providerId (optional) and error (optional) of the NextAuth.js lib is targeted
  const query = getQuery(event)
  const { action, providerId } = parseActionAndAttachedInfo(event, NEXTAUTH_BASE_PATH)
  const error = query.error
  if (Array.isArray(error)) {
    throw createError({ statusCode: 400, statusMessage: 'Error query parameter can only appear once' })
  }

  // 3. Read body if request has a supported method
  const bodyForNextCall = await readBodyForNext(event)

  // 4. Assemble and perform request to the NextAuth.js auth handler
  const nextRequest: RequestInternal = {
    host: undefined,
    body: bodyForNextCall,
    cookies: parseCookies(event),
    query,
    headers: req.headers,
    method: req.method,
    action,
    providerId,
    error
  }

  // @ts-expect-error import is exported on .default during SSR
  const github = GithubProvider?.default || GithubProvider
  const {
    status,
    headers,
    cookies,
    body: bodyFromNextResult,
    redirect
  } = await NextAuthHandler({
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
  if (status) {
    res.statusCode = status
  }
  cookies?.forEach(cookie => setCookie(event, cookie.name, cookie.value, cookie.options))
  headers?.forEach(header => appendHeader(event, header.key, header.value))

  // 6. Return either:
  // 6.1 the body directly if no redirect is set:
  if (!redirect) {
    return bodyFromNextResult
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
  if (bodyForNextCall?.json) {
    return { url: redirect }
  }
  // 6.3 via a redirect:
  return sendRedirect(event, redirect)
})
