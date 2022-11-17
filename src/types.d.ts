import type { Session } from 'next-auth'

type AuthSession = {
  status: 'authenticated'
  data: Session
}
type LoadingSession = {
  status: 'loading'
}
type UnauthSession = {
  status: 'unauthenticated'
}
export type NuxtSessionUniversal = AuthSession | LoadingSession | UnauthSession
export type NuxtSessionServer = AuthSession | UnauthSession
export type NextSessionData = Session
