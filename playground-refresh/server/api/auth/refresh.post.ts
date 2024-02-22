import { createError, eventHandler, readBody } from 'h3'
import { sign, verify } from 'jsonwebtoken'

export const SECRET = 'dummy'

interface User {
  username: string;
  name: string;
  picture: string;
}

interface JwtPayload extends User {
  scope: Array<'test' | 'user'>;
  exp: number;
}

export default eventHandler(async (event) => {
  const body = await readBody<{ refreshToken: string }>(event)

  if (!body.refreshToken) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized, no refreshToken in payload'
    })
  }

  const decoded = verify(body.refreshToken, SECRET) as JwtPayload | undefined

  if (!decoded) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized, refreshToken can`t be verified'
    })
  }

  const expiresIn = 60 * 5 // 5 minutes

  const user: User = {
    username: decoded.username,
    picture: decoded.picture,
    name: decoded.name
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
