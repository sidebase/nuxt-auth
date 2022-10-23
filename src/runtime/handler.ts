import {
  readBody,
  parseCookies,
  getQuery,
  setCookie,
  appendHeader,
  sendRedirect
} from 'h3'
// import type { NextAuthOptions } from 'next-auth'
// import type { NextAuthAction } from 'next-auth/lib/types'
// import type { IncomingRequest } from 'next-auth/core/index'
import { NextAuthHandler } from 'next-auth/core'
import GithubProvider from 'next-auth/providers/github'

export default eventHandler(async (event) => {
  console.log('in handler')
  const { req, res } = event

  let body
  try {
    const stringBody = await readBody(event)
    body = Object.fromEntries(new URLSearchParams(stringBody))
  } catch (error) {
    body = null
  }

  const nextauth = req.url.split('/')
  if (!nextauth.includes('api') || !nextauth.includes('auth')) {
    return
  }
  console.log('nextauth', nextauth)
  const nextRequest = {
    host: undefined,
    body,
    cookies: parseCookies(event),
    query: getQuery(event),
    headers: req.headers,
    method: req.method,
    action: nextauth[3],
    providerId: nextauth[4]?.split('?')[0],
    error: nextauth[4]?.split('?')[0]
  }

  const {
    status = 200,
    headers,
    cookies,
    body: nextBody,
    redirect
  } = await NextAuthHandler({
    // @ts-ignore Testing only right now
    req: nextRequest,
    options: {
      logger: undefined,
      providers: [
        // @ts-expect-error: Add .default because of vite bug
        GithubProvider.default({
          clientId: '6d8a47f9ebd9f1edd1db',
          clientSecret: 'ae712565e3b2be5eb26bfba8e4cfc8025dd64bd8'
        })
      ]
    }
  })
  console.log('after next auth', status, body)

  res.statusCode = status

  headers?.forEach((header) => {
    appendHeader(event, header.key, header.value)
  })

  cookies?.forEach((cookie) => {
    setCookie(event, cookie.name, cookie.value, cookie.options)
  })

  if (redirect) {
    console.log('in redirect', redirect)
    if (body?.json !== 'true') {
      return sendRedirect(event, redirect)
    }
    return {
      url: redirect
    }
  }
  console.log('nextbody', nextBody)
  return nextBody
})
