import { H3Event } from "h3"
import type { Session } from "next-auth"
import { authHandler } from '../api/auth'

export const getServerSession = async (event: H3Event) => {
  // Run a session check on the event with an arbitrary target endpoint
  event.context.checkSessionOnNonAuthRequest = true
  const session = await authHandler(event)
  delete event.context.checkSessionOnNonAuthRequest

  // TODO: This check also happens in the `useSession` composable, refactor it into a small util instead to ensure consistency
  if (!session || Object.keys(session).length === 0) {
    return null
  }

  return session as Session
}
