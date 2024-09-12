import { createError, eventHandler, readBody } from 'h3'
import { z } from 'zod'
import { sign } from 'jsonwebtoken'

/*
 * DISCLAIMER!
 * This is a demo implementation, please create your own handlers
 */

/**
 * This is a demo secret.
 * Please ensure that your secret is properly protected.
 */
export const SECRET = 'dummy'

/** 30 seconds */
export const ACCESS_TOKEN_TTL = 30

export interface User {
  username: string
  name: string
  picture: string
}

export interface JwtPayload extends User {
  scope: Array<'test' | 'user'>
  exp?: number
}

interface TokensByUser {
  access: Map<string, string>
  refresh: Map<string, string>
}

/**
 * Tokens storage.
 * You will need to implement your own, connect with DB/etc.
 */
export const tokensByUser: Map<string, TokensByUser> = new Map()

/**
 * We use a fixed password for demo purposes.
 * You can use any implementation fitting your usecase.
 */
const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.literal('hunter2')
})

export default eventHandler(async (event) => {
  const result = credentialsSchema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized, hint: try `hunter2` as password'
    })
  }

  // Emulate login
  const { username } = result.data
  const user = {
    username,
    picture: 'https://github.com/nuxt.png',
    name: `User ${username}`
  }

  const tokenData: JwtPayload = { ...user, scope: ['test', 'user'] }
  const accessToken = sign(tokenData, SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  })
  const refreshToken = sign(tokenData, SECRET, {
    // 1 day
    expiresIn: 60 * 60 * 24
  })

  // Naive implementation - please implement properly yourself!
  const userTokens: TokensByUser = tokensByUser.get(username) ?? {
    access: new Map(),
    refresh: new Map()
  }
  userTokens.access.set(accessToken, refreshToken)
  userTokens.refresh.set(refreshToken, accessToken)
  tokensByUser.set(username, userTokens)

  return {
    token: {
      accessToken,
      refreshToken
    }
  }
})

export function extractToken(authorizationHeader: string) {
  return authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice(7)
    : authorizationHeader
}
