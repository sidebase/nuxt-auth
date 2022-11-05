import { getServerSession } from '#auth'

export default eventHandler(async (event) => {
  // Only protect a certain backend route
  if (!event.req.url.startsWith('/api/protected/middleware')) {
    return
  }

  const session = await getServerSession(event)
  if (!session) {
    throw createError({ statusMessage: 'Unauthenticated', statusCode: 403 })
  }
})
