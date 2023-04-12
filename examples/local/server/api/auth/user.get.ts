import { H3Event } from 'h3'
import { verify } from 'jsonwebtoken'
import { SECRET } from './login.post'

const ensureAuth = (event: H3Event) => {
  const authHeader = getRequestHeader(event, 'authorization')
  if (typeof authHeader === 'undefined') {
    throw createError({ statusCode: 403, statusMessage: 'Need to pass valid Bearer-authorization header to access this endpoint' })
  }

  const [, token] = authHeader.split('Bearer ')
  try {
    return verify(token, SECRET)
  } catch (error) {
    throw createError({ statusCode: 403, statusMessage: 'You must be logged in to use this endpoint' })
  }
}

export default eventHandler((event) => {
  const user = ensureAuth(event)
  return user
})
