import { createError, eventHandler, getRequestHeader } from 'h3'
import { verify } from 'jsonwebtoken'
import { type JwtPayload, SECRET, extractToken, tokensByUser } from './login.post'

export default eventHandler((event) => {
  const authorizationHeader = getRequestHeader(event, 'Authorization')
  if (typeof authorizationHeader === 'undefined') {
    throw createError({ statusCode: 403, statusMessage: 'Need to pass valid Bearer-authorization header to access this endpoint' })
  }

  const extractedToken = extractToken(authorizationHeader)
  let decoded: JwtPayload
  try {
    decoded = verify(extractedToken, SECRET) as JwtPayload
  }
  catch (error) {
    console.error({
      msg: 'Login failed. Here\'s the raw error:',
      error
    })
    throw createError({ statusCode: 403, statusMessage: 'You must be logged in to use this endpoint' })
  }

  // Check against known token
  const userTokens = tokensByUser.get(decoded.username)
  if (!userTokens || !userTokens.access.has(extractedToken)) {
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
