import { createError, eventHandler, getRequestHeader, readBody } from 'h3'
import { sign, verify } from 'jsonwebtoken'
import { type JwtPayload, SECRET, type User, extractToken, tokensByUser } from './login.post'

/*
 * DISCLAIMER!
 * This is a demo implementation, please create your own handlers
 */

export default eventHandler(async (event) => {
  const body = await readBody<{ refreshToken: string }>(event)
  const authorizationHeader = getRequestHeader(event, 'Authorization')
  const refreshToken = body.refreshToken

  if (!refreshToken || !authorizationHeader) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized, no refreshToken or no Authorization header'
    })
  }

  // Verify
  const decoded = verify(refreshToken, SECRET) as JwtPayload | undefined
  if (!decoded) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized, refreshToken can\'t be verified'
    })
  }

  // Get tokens
  const userTokens = tokensByUser.get(decoded.username)
  if (!userTokens) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized, user is not logged in'
    })
  }

  // Check against known token
  const requestAccessToken = extractToken(authorizationHeader)
  const knownAccessToken = userTokens.refresh.get(body.refreshToken)
  if (!knownAccessToken || knownAccessToken !== requestAccessToken) {
    console.log({
      msg: 'Tokens mismatch',
      knownAccessToken,
      requestAccessToken
    })
    throw createError({
      statusCode: 401,
      statusMessage: 'Tokens mismatch - this is not good'
    })
  }

  // Invalidate old access token
  userTokens.access.delete(knownAccessToken)

  const user: User = {
    username: decoded.username,
    picture: decoded.picture,
    name: decoded.name
  }

  const accessToken = sign({ ...user, scope: ['test', 'user'] }, SECRET, {
    expiresIn: 60 * 5 // 5 minutes
  })
  userTokens.refresh.set(refreshToken, accessToken)
  userTokens.access.set(accessToken, refreshToken)

  return {
    token: {
      accessToken,
      refreshToken
    }
  }
})
