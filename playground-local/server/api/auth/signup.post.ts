import { createError, eventHandler, readBody } from 'h3'
import { z } from 'zod'
import { sign } from 'jsonwebtoken'

export const SECRET = 'dummy'

export default eventHandler(async (event) => {
  // Define the schema for validating the incoming data
  const result = z.object({
    username: z.string(),
    password: z.string().min(6)
  }).safeParse(await readBody(event))

  // If validation fails, return an error
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input, please provide a valid email and a password of at least 6 characters.'
    })
  }

  const { username, password } = result.data

  const expiresIn = '1h' //token expiry (1 hour)
  const user = { username } // Payload for the token, includes the email

  // Sign the JWT with the user payload and secret
  const accessToken = sign(user, SECRET, { expiresIn })

  // Return a success response with the email and the token
  return {
    message: 'Signup successful!',
    user: {
      username
    },
    token: {
      accessToken
    }
  }
})