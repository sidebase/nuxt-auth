import z from 'zod'
import { sign } from 'jsonwebtoken'

export const SECRET = 'dummy'

export default eventHandler(async (event) => {
  const result = z.object({ username: z.string().min(1), password: z.literal('1') }).safeParse(await readBody(event))
  if (!result.success) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized, hint: try `hunter2` as password' })
  }

  const expiresIn = 1500
  const { username } = result.data
  const user = {
    username,
    picture: 'https://github.com/nuxt.png',
    name: 'User ' + username
  }

  const cookieValue = sign({ ...user, scope: ['test', 'user'] }, SECRET, { expiresIn }) // We just use `sign` here to create a payload. The cookie provider does not actually use JWTs. Any user info must come from GetSession

  setCookie(event, 'ApplicationAuth', cookieValue, { httpOnly: true, sameSite: 'lax', secure: true })

  setResponseStatus(event, 200)
  return null
})
