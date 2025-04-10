import { createError, eventHandler, getRequestHeader } from 'h3'
import { type JwtPayload, checkUserAccessToken, decodeToken, extractTokenFromAuthorizationHeader, getTokensByUser } from '~/server/utils/session'

export default eventHandler((event) => {
  const authorizationHeader = getRequestHeader(event, 'Authorization')
  if (typeof authorizationHeader === 'undefined') {
    throw createError({ statusCode: 403, statusMessage: 'Need to pass valid Bearer-authorization header to access this endpoint' })
  }

  const requestAccessToken = extractTokenFromAuthorizationHeader(authorizationHeader)
  let decoded: JwtPayload
  try {
    const decodeTokenResult = decodeToken(requestAccessToken)

    if (!decodeTokenResult) {
      throw new Error('Expected decoded JwtPayload to be non-empty')
    }
    decoded = decodeTokenResult
  }
  catch (error) {
    console.error({
      msg: 'Login failed. Here\'s the raw error:',
      error
    })
    throw createError({ statusCode: 403, statusMessage: 'You must be logged in to use this endpoint' })
  }

  // Get tokens of a user (only for demo, use a DB in your implementation)
  const userTokens = getTokensByUser(decoded.username)
  if (!userTokens) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  // Check against known token
  const tokensValidityCheck = checkUserAccessToken(userTokens, requestAccessToken)
  if (!tokensValidityCheck.valid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized, user is not logged in'
    })
  }

  // All checks successful
  const { username, name, picture, scope } = decoded
  return {
    username,
    name,
    picture,
    scope
  }
})
