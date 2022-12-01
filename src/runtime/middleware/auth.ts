import { defineNuxtRouteMiddleware } from '#app'
import useSession from '../composables/useSession'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.auth === false) {
    return
  }

  const { status, signIn } = useSession()
  if (status.value === 'authenticated') {
    return
  }

  await signIn(undefined, { callbackUrl: to.path }, { error: 'SessionRequired' })
})
