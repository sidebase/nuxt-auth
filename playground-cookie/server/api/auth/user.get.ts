import { H3Event } from 'h3'
import { verify } from 'jsonwebtoken'
import { SECRET } from '~/server/api/auth/login.post'

const ensureAuth = (event: H3Event) => {
  const cookieValue = getCookie(event, 'ApplicationAuth')

  if (typeof cookieValue === 'undefined') {
    throw createError({ statusCode: 403, statusMessage: 'no cookie found' })
  }

  try {
    return verify(cookieValue, SECRET) // This is just a sample page. The cookie provider does not actually use JWTs.
  } catch (error) {
    console.error('Login failed. Here\'s the raw error:', error)
    throw createError({ statusCode: 403, statusMessage: 'You must be logged in to use this endpoint' })
  }
}

export default eventHandler((event) => {
  return ensureAuth(event)
})
