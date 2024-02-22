import { createError, eventHandler, readBody } from 'h3'
import { z } from 'zod'
import { sign } from 'jsonwebtoken'

const refreshTokens: Record<number, Record<string, any>> = {}
export const SECRET = 'dummy'

export default eventHandler(async (event) => {
  const result = z.object({ username: z.string().min(1), password: z.literal('hunter2') }).safeParse(await readBody(event))
  if (!result.success) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized, hint: try `hunter2` as password' })
  }

  const expiresIn = 15
  const refreshToken = Math.floor(Math.random() * (1000000000000000 - 1 + 1)) + 1
  const { username } = result.data
  const user = {
    username,
    picture: 'https://github.com/nuxt.png',
    name: 'User ' + username
  }

  const accessToken = sign({ ...user, scope: ['test', 'user'] }, SECRET, { expiresIn })
  refreshTokens[refreshToken] = {
    accessToken,
    user
  }

  return {
    token: {
      accessToken,
      refreshToken
    }
  }
})
