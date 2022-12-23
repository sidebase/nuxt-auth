import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import useSession from '../composables/useSession'
import { joinPathToApiURL } from '../utils/url'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta.auth === false) {
    return
  }

  const { status, signIn } = useSession()
  if (status.value === 'authenticated') {
    return
  }

  /**
   * Nuxt 3 default behavior is to continue with the route navigation if the middleware does not return a `navigateTo` (see https://nuxt.com/docs/guide/directory-structure/middleware#format).
   *
   * To avoid content-flashes or brief visibility of protected pages, we thus need to:
   * 1. `await signIn` so that it will block and trigger it's internal `navigateTo` call. Using `return signIn(...)` does not work eventhough it internally returns `navigateTo`!
   * 2. fake-return a `navigateTo` here to tell nuxt that the current navigation will be replaced with a new navigation, this avoids the content-flash of the projected page (and should in theory never be triggered due to `signIn` navigating away first!)
   *
   * See https://github.com/sidebase/nuxt-auth/issues/100 for a discussion on this topic.
   * */
  await signIn(undefined, { callbackUrl: to.path, replace: true, redirect: false }, { error: 'SessionRequired' })
  return navigateTo(joinPathToApiURL('signin'))
})
