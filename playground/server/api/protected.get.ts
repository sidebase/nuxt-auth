import { getServerSession } from '../../../src/runtime/server/api/auth'

export default eventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session) {
    return 'unauthenticated!'
  }
  return 'authenticated!'
})
