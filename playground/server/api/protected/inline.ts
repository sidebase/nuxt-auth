import { getServerSession } from '#sidebase/server'

export default eventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session) {
    return { status: 'unauthenticated!' }
  }
  return { status: 'authenticated!', text: 'im protected by an in-endpoint check', ...session }
})
