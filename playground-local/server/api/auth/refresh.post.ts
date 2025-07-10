import { createError, eventHandler, getRequestHeader, readBody } from 'h3'
import { checkUserTokens, decodeToken, extractTokenFromAuthorizationHeader, getTokensByUser, refreshUserAccessToken } from '~/server/utils/session'

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
      message: 'Unauthorized, no refreshToken or no Authorization header'
    })
  }

  // Verify
  const decoded = decodeToken(refreshToken)
  if (!decoded) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized, refreshToken can\'t be verified'
    })
  }

  // Get the helper (only for demo, use a DB in your implementation)
  const userTokens = getTokensByUser(decoded.username)
  if (!userTokens) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized, user is not logged in'
    })
  }

  // Check against known token
  const requestAccessToken = extractTokenFromAuthorizationHeader(authorizationHeader)
  const tokensValidityCheck = checkUserTokens(userTokens, requestAccessToken, refreshToken)
  if (!tokensValidityCheck.valid) {
    console.log({
      msg: 'Tokens mismatch',
      knownAccessToken: tokensValidityCheck.knownAccessToken,
      requestAccessToken
    })
    throw createError({
      statusCode: 401,
      message: 'Tokens mismatch - this is not good'
    })
  }

  // Call the token refresh logic
  const tokens = await refreshUserAccessToken(userTokens, refreshToken)

  return {
    token: tokens
  }
})
