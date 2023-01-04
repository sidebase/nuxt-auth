import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig, useRequestEvent, useRouter, useNuxtApp } from '#app'
import { joinURL, withQuery } from 'ufo'
import { sendRedirect } from 'h3'
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

  const authConfig = useRuntimeConfig().public.auth

  /**
   * We do not want to enforce protection on `404` pages (unless the user opts out of it by setting `enableEarly404Redirect: false`).
   *
   * This is to:
   * - improve UX and DX: Having to log-in to see a `404` is not pleasent,
   * - avoid the `Error [ERR_HTTP_HEADERS_SENT]`-error that occurs when we redirect to the sign-in page when the original to-page does not exist. Likely related to https://github.com/nuxt/framework/issues/9438
   *
   */
  if (authConfig.globalMiddlewareOptions.enableEarly404Redirect) {
    const matchedRoute = useRouter().getRoutes().find(route => route.path === to.path)
    if (!matchedRoute) {
      // Hands control back to `vue-router`, which will direct to the `404` page
      return
    }
  }

  /**
   * We cannot directly call and/or return `signIn` here as:
   * - `signIn` uses async composables under the hood, leading to "nuxt instance undefined errors", see https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
   * - if something different than `navigateTo` is returned the navigation will not be blocked, so a content-flash would occur, see https://nuxt.com/docs/guide/directory-structure/middleware#format
   *
   * Additionally on the client-side, returning `navigateTo(signInUrl)` leads to a `404` error as the next-auth-signin-page was not registered with the vue-router that is used for routing under the hood. For this reason we need to
   * manually set `window.location.href` on the client **and then fake return a navigateTo to block navigation (although it will not actually be called, but nuxt magically registers the `navigateTo` return and blocks navigation, avoiding
   * content-flashes of the protected page)**.
   *
   * Additionally on the server-side, we cannot use `navigateTo(signInUrl)` as this uses `vue-router` internally which does not know the "external" sign-in page of next-auth and thus will log a warning which we want to avoid.
   *
   *  */
  const signInUrl = joinURL(authConfig.basePath, 'signin')
  const url = withQuery(signInUrl, {
    callbackUrl: to.path,
    error: 'SessionRequired'
  })

  // adapted from: https://github.com/nuxt/framework/blob/ab2456c295fc8c7609a7ef7ca1e47def5d087e87/packages/nuxt/src/app/composables/router.ts#L97-L115
  if (process.server) {
    const nuxtApp = useNuxtApp()
    if (nuxtApp.ssrContext && nuxtApp.ssrContext.event) {
      return nuxtApp.callHook('app:redirected').then(() => sendRedirect(nuxtApp.ssrContext!.event, url, 302))
    }
  }

  window.location.href = url
  return navigateTo(undefined)
})
