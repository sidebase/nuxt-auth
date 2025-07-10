import { createError, eventHandler, readBody } from 'h3'
import { createUserTokens, credentialsSchema, getUser } from '~/server/utils/session'

export default eventHandler(async (event) => {
  const result = credentialsSchema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 400,
      message: `Invalid input, please provide a valid username, and a password must be 'hunter2' for this demo.`
    })
  }

  // Emulate successful registration
  const user = await getUser(result.data.username)

  // Create the sign-in tokens
  const tokens = await createUserTokens(user)

  // Return a success response with the email and the token
  return {
    user,
    token: tokens
  }
})
