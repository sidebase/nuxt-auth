import { joinURL } from 'ufo'
import getURL from 'requrl'
import { sendRedirect } from 'h3'
import type { ModuleOptionsNormalized } from '../types'
import { useRequestEvent, useNuxtApp, abortNavigation, useAuthState } from '#imports'

export const getRequestURL = (includePath = true) => getURL(useRequestEvent()?.node.req, includePath)
export const joinPathToApiURL = (path: string) => joinURL(useAuthState()._internal.baseURL, path)

/**
 * Function to correctly navigate to auth-routes, necessary as the auth-routes are not part of the nuxt-app itself, so unknown to nuxt / vue-router.
 *
 * More specifically, we need this function to correctly handle the following cases:
 * 1. On the client-side, returning `navigateTo(signInUrl)` leads to a `404` error as the next-auth-signin-page was not registered with the vue-router that is used for routing under the hood. For this reason we need to
 *    manually set `window.location.href` on the client **and then fake return a Promise that does not immediately resolve to block navigation (although it will not actually be fully awaited, but just be awaited long enough for the naviation to complete)**.
 * 2. Additionally on the server-side, we cannot use `navigateTo(signInUrl)` as this uses `vue-router` internally which does not know the "external" sign-in page of next-auth and thus will log a warning which we want to avoid.
 *
 * Adapted from: https://github.com/nuxt/framework/blob/ab2456c295fc8c7609a7ef7ca1e47def5d087e87/packages/nuxt/src/app/composables/router.ts#L97-L115
 *
 * @param href HREF / URL to navigate to
 */
export const navigateToAuthPages = (href: string) => {
  const nuxtApp = useNuxtApp()

  if (process.server) {
    if (nuxtApp.ssrContext && nuxtApp.ssrContext.event) {
      return nuxtApp.callHook('app:redirected').then(() => {
        sendRedirect(nuxtApp.ssrContext!.event, href, 302)

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
  const router = nuxtApp.$router as { push(href: string): void }

  // Wait for the `window.location.href` navigation from above to complete to avoid showing content. If that doesn't work fast enough, delegate navigation back to the `vue-router` (risking a vue-router 404 warning in the console, but still avoiding content-flashes of the protected target page)
  const waitForNavigationWithFallbackToRouter = new Promise(resolve => setTimeout(resolve, 60 * 1000))
    .then(() => router.push(href))
  return waitForNavigationWithFallbackToRouter as Promise<void | undefined>
}

/**
 * Determins the desired callback url based on the users desires. Either:
 * - uses a hardcoded path the user provided,
 * - determines the callback based on the target the user wanted to reach
 *
 * @param authConfig Authentication runtime module config
 * @param getOriginalTargetPath Function that returns the original location the user wanted to reach
 */
export const determineCallbackUrl = <T extends string | Promise<string>>(authConfig: ModuleOptionsNormalized, getOriginalTargetPath: () => T): T | string | undefined => {
  const authConfigCallbackUrl = typeof authConfig.globalAppMiddleware === 'object'
    ? authConfig.globalAppMiddleware.addDefaultCallbackUrl
    : undefined

  if (typeof authConfigCallbackUrl !== 'undefined') {
    // If string was set, always callback to that string
    if (typeof authConfigCallbackUrl === 'string') {
      return authConfigCallbackUrl
    }

    // If boolean was set, set to current path if set to true
    if (typeof authConfigCallbackUrl === 'boolean') {
      if (authConfigCallbackUrl) {
        return getOriginalTargetPath()
      }
    }
  } else if (authConfig.globalAppMiddleware === true) {
    return getOriginalTargetPath()
  }
}
