import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { withQuery } from 'ufo'
import useSession from '../composables/useSession'

declare module '#app' {
  interface PageMeta {
    auth?: boolean
  }
}

export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.auth === false) {
    return
  }

  const { status } = useSession()
  if (status.value === 'authenticated') {
    return
  }

  /**
   * We cannot directly call and/or return `signIn` here as:
   * - `signIn` uses async composables under the hood, leading to "nuxt instance undefined errors", see https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
   * - if something different than `navigateTo` is returned the navigation will not be blocked, so a content-flash would occur, see https://nuxt.com/docs/guide/directory-structure/middleware#format
   *
   * So we assemble our own call and return `navigateTo`.
   *  */
  const url = withQuery('/api/auth/signin', {
    callbackUrl: to.path,
    error: 'SessionRequired'
  })
  return navigateTo(url)
})
