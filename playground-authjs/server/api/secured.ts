import { createError, eventHandler } from 'h3'
import { getServerSession } from '#auth'

export default eventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session) {
    throw createError({ statusCode: 403, message: 'Unauthenticated' })
  }
  return { status: 'ok', session }
})
