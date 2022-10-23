import type { Session } from 'next-auth'
import { ref } from 'vue'
import type { Ref } from 'vue'

interface UseSessionOptions {
  required: boolean
  onUnauthenticated: () => void
}

interface SessionContextNoSession {
  data: null
  status: "unauthenticated" | "loading"
}
interface SessionContextSession {
  data: Session
  status: "authenticated"
}
type SessionContext = SessionContextNoSession | SessionContextSession

const defaultOnUnauthenticated = () => {
  const url = `/api/auth/signin?${new URLSearchParams({
    error: "SessionRequired",
    callbackUrl: window.location.href,
  })}`
  window.location.href = url
}

export default async ({ required, onUnauthenticated }: UseSessionOptions = { required: true, onUnauthenticated: defaultOnUnauthenticated}) => {
  const value: Ref<SessionContext> = ref({
    data: null,
    status: "unauthenticated"
  })

  if (required && value.value.status !== "authenticated") {
    onUnauthenticated()
  }

  return value
}
