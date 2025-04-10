/*
 * DISCLAIMER!
 * This is a demo implementation, please create your own handlers
 */

import { sign, verify } from 'jsonwebtoken'
import { z } from 'zod'

/**
 * This is a demo secret.
 * Please ensure that your secret is properly protected.
 */
const SECRET = 'dummy'

/** 30 seconds */
const ACCESS_TOKEN_TTL = 30

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
const tokensByUser: Map<string, TokensByUser> = new Map()

/**
 * We use a fixed password for demo purposes.
 * You can use any implementation fitting your usecase.
 */
export const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.literal('hunter2')
})

/**
 * Stub function for creating/getting a user.
 * Your implementation can use a DB call or any other method.
 */
export function getUser(username: string): Promise<User> {
  // Emulate async work
  return Promise.resolve({
    username,
    picture: 'https://github.com/nuxt.png',
    name: `User ${username}`
  })
}

interface UserTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Demo function for signing user tokens.
 * Your implementation may differ.
 */
export function createUserTokens(user: User): Promise<UserTokens> {
  const tokenData: JwtPayload = { ...user, scope: ['test', 'user'] }
  const accessToken = sign(tokenData, SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  })
  const refreshToken = sign(tokenData, SECRET, {
    // 1 day
    expiresIn: 60 * 60 * 24
  })

  // Naive implementation - please implement properly yourself!
  const userTokens: TokensByUser = tokensByUser.get(user.username) ?? {
    access: new Map(),
    refresh: new Map()
  }
  userTokens.access.set(accessToken, refreshToken)
  userTokens.refresh.set(refreshToken, accessToken)
  tokensByUser.set(user.username, userTokens)

  // Emulate async work
  return Promise.resolve({
    accessToken,
    refreshToken
  })
}

/**
 * Function for getting the data from a JWT
 */
export function decodeToken(token: string): JwtPayload | undefined {
  return verify(token, SECRET) as JwtPayload | undefined
}

/**
 * Helper only for demo purposes.
 * Your implementation will likely never need this and will rely on User ID and DB.
 */
export function getTokensByUser(username: string): TokensByUser | undefined {
  return tokensByUser.get(username)
}

type CheckUserTokensResult = { valid: true, knownAccessToken: string } | { valid: false, knownAccessToken: undefined }

/**
 * Function for checking the validity of the access/refresh token pair.
 * Your implementation will probably use the DB call.
 * @param tokensByUser A helper for demo purposes
 */
export function checkUserTokens(tokensByUser: TokensByUser, requestAccessToken: string, requestRefreshToken: string): CheckUserTokensResult {
  const knownAccessToken = tokensByUser.refresh.get(requestRefreshToken)

  return {
    valid: !!knownAccessToken && knownAccessToken === requestAccessToken,
    knownAccessToken
  } as CheckUserTokensResult
}

export function checkUserAccessToken(tokensByUser: TokensByUser, requestAccessToken: string): CheckUserTokensResult {
  const knownAccessToken = tokensByUser.access.has(requestAccessToken) ? requestAccessToken : undefined

  return {
    valid: !!knownAccessToken,
    knownAccessToken
  } as CheckUserTokensResult
}

export function invalidateAccessToken(tokensByUser: TokensByUser, accessToken: string) {
  tokensByUser.access.delete(accessToken)
}

export function refreshUserAccessToken(tokensByUser: TokensByUser, refreshToken: string): Promise<UserTokens | undefined> {
  // Get the access token
  const oldAccessToken = tokensByUser.refresh.get(refreshToken)
  if (!oldAccessToken) {
    // Promises to emulate async work (e.g. of a DB call)
    return Promise.resolve(undefined)
  }

  // Invalidate old access token
  invalidateAccessToken(tokensByUser, oldAccessToken)

  // Get the user data. In a real implementation this is likely a DB call.
  // In this demo we simply re-use the existing JWT data
  const jwtUser = decodeToken(refreshToken)
  if (!jwtUser) {
    return Promise.resolve(undefined)
  }

  const user: User = {
    username: jwtUser.username,
    picture: jwtUser.picture,
    name: jwtUser.name
  }

  const accessToken = sign({ ...user, scope: ['test', 'user'] }, SECRET, {
    expiresIn: 60 * 5 // 5 minutes
  })
  tokensByUser.refresh.set(refreshToken, accessToken)
  tokensByUser.access.set(accessToken, refreshToken)

  return Promise.resolve({
    accessToken,
    refreshToken
  })
}

export function extractTokenFromAuthorizationHeader(authorizationHeader: string): string {
  return authorizationHeader.startsWith('Bearer ')
    ? authorizationHeader.slice(7)
    : authorizationHeader
}
