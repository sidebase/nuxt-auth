import { defineNuxtRouteMiddleware } from '#app'
import useSession from '../composables/useSession'

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) {
    return
  }

  const { status, signIn } = useSession()
  if (status.value === 'authenticated') {
    return
  }

  return signIn(undefined, { callbackUrl: to.path }, { error: 'SessionRequired' })
})
