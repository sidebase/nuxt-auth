import { createError, eventHandler, readBody } from 'h3'
import { createUserTokens, credentialsSchema, getUser } from '~/server/utils/session'

/*
 * DISCLAIMER!
 * This is a demo implementation, please create your own handlers
 */

export default eventHandler(async (event) => {
  const result = credentialsSchema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 403,
      message: 'Unauthorized, hint: try `hunter2` as password'
    })
  }

  // Emulate successful login
  const user = await getUser(result.data.username)

  // Sign the tokens
  const tokens = await createUserTokens(user)

  return {
    token: tokens
  }
})
