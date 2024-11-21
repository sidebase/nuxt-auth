import { createError, eventHandler } from 'h3'
import { getServerSession } from '#auth'

export default eventHandler(async (event) => {
  // Only protect a certain backend route
  if (!event.node.req.url?.startsWith('/api/protected/middleware')) {
    return
  }

  const session = await getServerSession(event)
  if (!session) {
    throw createError({ statusMessage: 'Unauthenticated', statusCode: 403 })
  }
})
