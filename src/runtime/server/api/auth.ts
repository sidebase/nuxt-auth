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

const parseActionAndAttachedInfo = (url: string, nextAuthBasePath: string) => {
  const nextAuthSegments = url.split(nextAuthBasePath)[1].split('/')
  let unvalidatedAction: string, providerId: string, error: string
  if (nextAuthSegments.length === 1) {
    unvalidatedAction = nextAuthSegments[0]
  } else if (nextAuthSegments.length === 2) {
    const segmentTwoWithoutQuery = nextAuthSegments[1]?.split('?')[0]

    unvalidatedAction = nextAuthSegments[0]
    providerId = segmentTwoWithoutQuery
    error = segmentTwoWithoutQuery
  }

  const action = SUPPORTED_ACTIONS.find(action => action === unvalidatedAction)
  if (!action) {
    throw createError({ statusCode: 400, statusMessage: `Called endpoint with unsupported action ${unvalidatedAction}. Only the following actions are supported: ${SUPPORTED_ACTIONS.join(', ')}` })
  }

  return {
    action,
    providerId,
    error
  }
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
  const { action, providerId, error } = parseActionAndAttachedInfo(url, NEXTAUTH_BASE_PATH)

  // 3. Read body if request has a supported method
  const bodyForNextCall = await readBodyForNext(event)

  // 4. Assemble and perform request to the NextAuth.js auth handler
  const nextRequest: RequestInternal = {
    host: undefined,
    body: bodyForNextCall,
    cookies: parseCookies(event),
    query: getQuery(event),
    headers: req.headers,
    method: req.method,
    action,
    providerId,
    error
  }

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
        GithubProvider({
          
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
