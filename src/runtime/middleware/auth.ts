import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { withQuery } from 'ufo'
import useSession from '../composables/useSession'
import { joinPathToApiURL } from '../utils/url'

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) {
    return
  }

  const { status } = useSession()
  if (status.value === 'authenticated') {
    return
  }

  /**
   * Nuxt 3 default behavior is to continue with the route navigation if the middleware does not return a `navigateTo` (see https://nuxt.com/docs/guide/directory-structure/middleware#format).
   *
   * For this reason we build and return a custom `navigateTo` instead of returning `signIn(...)`
   * */
  const url = withQuery(joinPathToApiURL('signin'), {
    callbackUrl: to.path
  })
  return navigateTo('/api/auth/signin')
})
