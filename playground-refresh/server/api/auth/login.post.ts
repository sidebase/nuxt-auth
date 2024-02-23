import { createError, eventHandler, readBody } from 'h3'
import { z } from 'zod'
import { sign } from 'jsonwebtoken'

export const SECRET = 'dummy'

export default eventHandler(async (event) => {
  const result = z
    .object({ username: z.string().min(1), password: z.literal('hunter2') })
    .safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized, hint: try `hunter2` as password'
    })
  }

  const expiresIn = 15

  const { username } = result.data

  const user = {
    username,
    picture: 'https://github.com/nuxt.png',
    name: 'User ' + username
  }

  const accessToken = sign({ ...user, scope: ['test', 'user'] }, SECRET, {
    expiresIn
  })
  const refreshToken = sign({ ...user, scope: ['test', 'user'] }, SECRET, {
    expiresIn: 60 * 60 * 24
  })

  return {
    token: {
      accessToken,
      refreshToken
    }
  }
})
