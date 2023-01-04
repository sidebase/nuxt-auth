import { defineNuxtRouteMiddleware, useRuntimeConfig, useNuxtApp } from '#app'
import { joinURL, withQuery } from 'ufo'
import { sendRedirect } from 'h3'
import type { Router } from 'vue-router'
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
   * We do not want to enforce protection on `404` pages (unless the user opts out of it by setting `allow404WithoutAuth: false`).
   *
   * This is to:
   * - improve UX and DX: Having to log-in to see a `404` is not pleasent,
   * - avoid the `Error [ERR_HTTP_HEADERS_SENT]`-error that occurs when we redirect to the sign-in page when the original to-page does not exist. Likely related to https://github.com/nuxt/framework/issues/9438
   *
   */
  const nuxtApp = useNuxtApp()
  const router = nuxtApp.$router as Router
  if (authConfig.globalMiddlewareOptions.allow404WithoutAuth) {
    const matchedRoute = router.getRoutes().find(route => route.path === to.path)
    if (!matchedRoute) {
      // Hands control back to `vue-router`, which will direct to the `404` page
      return
    }
  }

  /**
   * We cannot directly call and/or return `signIn` here as:
   * - `signIn` uses async composables under the hood, leading to "nuxt instance undefined errors", see https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
   * - if `any` or `Promise<any>` that resolves immeadiatly is returned a content-flash would occur, see https://nuxt.com/docs/guide/directory-structure/middleware#format
   *
   * Additionally on the client-side, returning `navigateTo(signInUrl)` leads to a `404` error as the next-auth-signin-page was not registered with the vue-router that is used for routing under the hood. For this reason we need to
   * manually set `window.location.href` on the client **and then fake return a Promise that does not immeadiatly resolve to block navigation (although it will not actually be fully awaited, but just be awaited long enough for the naviation to complete)**.
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
    if (nuxtApp.ssrContext && nuxtApp.ssrContext.event) {
      return nuxtApp.callHook('app:redirected').then(() => sendRedirect(nuxtApp.ssrContext!.event, url, 302))
    }
  }

  window.location.href = url
  // If href contains a hash, the browser does not reload the page. We reload manually.
  if (url.includes('#')) {
    window.location.reload()
  }

  // Wait for the `window.location.href` navigation from above to complete to avoid showing content. If that doesn't work fast enough, delegate navigation back to the `vue-router` (risking a vue-router 404 warning in the console, but still avoiding content-flashes of the protected target page)
  const avoidContentFlashAtAllCosts = new Promise(resolve => setTimeout(resolve, 60 * 1000)).then(() => router.push(url))
  return avoidContentFlashAtAllCosts
})
