/*
 * DISCLAIMER!
 * This is a demo implementation, please create your own handlers
 */

import { jwtVerify, SignJWT } from 'jose'
import type { JWTPayload } from 'jose'
import { z } from 'zod'

/**
 * This is a demo secret.
 * Please ensure that your secret is properly protected.
 */
const SECRET = new TextEncoder().encode('dummy')

/** 30 seconds */
const ACCESS_TOKEN_TTL = 30

export const userSchema = z.object({
  username: z.string().min(1),
  name: z.string(),
  picture: z.string().optional(),
  scope: z.enum(['test', 'user']).array().optional(),
})
export type User = z.infer<typeof userSchema>

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
export async function createUserTokens(user: User): Promise<UserTokens> {
  const tokenData: JWTPayload = { ...user, scope: ['test', 'user'] }
  const accessToken = await createSignedJwt(tokenData, ACCESS_TOKEN_TTL)
  const refreshToken = await createSignedJwt(tokenData, /* 1 day */ 60 * 60 * 24)

  // Naive implementation - please implement properly yourself!
  const userTokens: TokensByUser = tokensByUser.get(user.username) ?? {
    access: new Map(),
    refresh: new Map()
  }
  userTokens.access.set(accessToken, refreshToken)
  userTokens.refresh.set(refreshToken, accessToken)
  tokensByUser.set(user.username, userTokens)

  return {
    accessToken,
    refreshToken
  }
}

/**
 * Function for getting the data from a JWT
 */
export async function decodeToken(token: string): Promise<JWTPayload> {
  const verified = await jwtVerify(token, SECRET)
  return verified.payload
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

export async function refreshUserAccessToken(tokensByUser: TokensByUser, refreshToken: string): Promise<UserTokens | undefined> {
  // Get the access token
  const oldAccessToken = tokensByUser.refresh.get(refreshToken)
  if (!oldAccessToken) {
    return
  }

  // Invalidate old access token
  invalidateAccessToken(tokensByUser, oldAccessToken)

  // Get the user data. In a real implementation this is likely a DB call.
  // In this demo we simply re-use the existing JWT data
  const jwtUser = await decodeToken(refreshToken)
  if (!jwtUser) {
    return
  }

  const user = userSchema.safeParse(jwtUser)
  if (!user.success) {
    return
  }

  const accessToken = await createSignedJwt({ ...user.data, scope: ['test', 'user'] }, /* 5 minutes */ 60 * 5)
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

function createSignedJwt(payload: JWTPayload, ttlInSeconds: number): Promise<string> {
  const unixTimestampNow = Math.floor(Date.now() / 1000)

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(unixTimestampNow + ttlInSeconds)
    .sign(SECRET)
}
