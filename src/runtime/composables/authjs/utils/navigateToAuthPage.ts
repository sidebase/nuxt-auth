import { sanitizeStatusCode } from 'h3'
import { type NuxtApp, abortNavigation, callWithNuxt, useNuxtApp } from '#app'

export function navigateToAuthPageWN(nuxt: NuxtApp, href: string) {
  return callWithNuxt(nuxt, navigateToAuthPage, [href])
}

/**
 * Function to correctly navigate to auth-routes, necessary as the auth-routes are not part of the nuxt-app itself, so unknown to nuxt / vue-router.
 *
 * More specifically, we need this function to correctly handle the following cases:
 * 1. On the client-side, returning `navigateTo(signInUrl)` leads to a `404` error as the next-auth-signin-page was not registered with the vue-router that is used for routing under the hood. For this reason we need to
 *    manually set `window.location.href` on the client **and then fake return a Promise that does not immediately resolve to block navigation (although it will not actually be fully awaited, but just be awaited long enough for the naviation to complete)**.
 * 2. Additionally on the server-side, we cannot use `navigateTo(signInUrl)` as this uses `vue-router` internally which does not know the "external" sign-in page of next-auth and thus will log a warning which we want to avoid.
 *
 * Adapted from: https://github.com/nuxt/nuxt/blob/d188542a35bb541c7ed2e4502c687c2132979882/packages/nuxt/src/app/composables/router.ts#L161-L188
 *
 * @param href HREF / URL to navigate to
 */
export function navigateToAuthPage(href: string) {
  const nuxtApp = useNuxtApp()

  if (import.meta.server) {
    if (nuxtApp.ssrContext) {
      // TODO: consider deprecating in favour of `app:rendered` and removing
      return nuxtApp.callHook('app:redirected').then(() => {
        const encodedLoc = href.replace(/"/g, '%22')
        const encodedHeader = new URL(href).toString()
        nuxtApp.ssrContext!._renderResponse = {
          statusCode: sanitizeStatusCode(302, 302),
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          headers: { location: encodedHeader },
        }
        abortNavigation()
      })
    }
  }

  window.location.href = href
  // If href contains a hash, the browser does not reload the page. We reload manually.
  if (href.includes('#')) {
    window.location.reload()
  }

  // TODO: Sadly, we cannot directly import types from `vue-router` as it leads to build failures. Typing the router about should help us to avoid manually typing `route` below
  const router = nuxtApp.$router as { push: (href: string) => void }

  // Wait for the `window.location.href` navigation from above to complete to avoid showing content. If that doesn't work fast enough, delegate navigation back to the `vue-router` (risking a vue-router 404 warning in the console, but still avoiding content-flashes of the protected target page)
  const waitForNavigationWithFallbackToRouter = new Promise(resolve => setTimeout(resolve, 60 * 1000))
    .then(() => router.push(href))

  return waitForNavigationWithFallbackToRouter as Promise<void | undefined>
}
