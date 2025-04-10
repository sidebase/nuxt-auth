import { hasProtocol, isScriptProtocol } from 'ufo'
import { type NuxtApp, abortNavigation, callWithNuxt, useRouter } from '#app'

export function navigateToAuthPageWN(nuxt: NuxtApp, href: string, isInternalRouting?: boolean) {
  return callWithNuxt(nuxt, navigateToAuthPage, [nuxt, href, isInternalRouting])
}

const URL_QUOTE_RE = /"/g

/**
 * Function to correctly navigate to auth-routes, necessary as the auth-routes are not part of the nuxt-app itself, so unknown to nuxt / vue-router.
 *
 * More specifically, we need this function to correctly handle the following cases:
 * 1. On the client-side, returning `navigateTo(signInUrl)` leads to a `404` error as the next-auth-signin-page was not registered with the vue-router that is used for routing under the hood. For this reason we need to
 *    manually set `window.location.href` on the client **and then fake return a Promise that does not immediately resolve to block navigation (although it will not actually be fully awaited, but just be awaited long enough for the naviation to complete)**.
 * 2. Additionally on the server-side, we cannot use `navigateTo(signInUrl)` as this uses `vue-router` internally which does not know the "external" sign-in page of next-auth and thus will log a warning which we want to avoid.
 *
 * Adapted from https://github.com/nuxt/nuxt/blob/16d213bbdcc69c0cc72afb355755ff877654a374/packages/nuxt/src/app/composables/router.ts#L119-L217
 *
 * @param nuxt Nuxt app context
 * @param href HREF / URL to navigate to
 */
function navigateToAuthPage(nuxt: NuxtApp, href: string, isInternalRouting = false) {
  const router = useRouter()

  if (import.meta.server) {
    if (nuxt.ssrContext) {
      const isExternalHost = hasProtocol(href, { acceptRelative: true })
      if (isExternalHost) {
        const { protocol } = new URL(href, 'http://localhost')
        if (protocol && isScriptProtocol(protocol)) {
          throw new Error(`Cannot navigate to a URL with '${protocol}' protocol.`)
        }
      }

      // This is a difference with `nuxt/nuxt` - we do not add `app.baseURL` here because all consumers are responsible for it
      // We also skip resolution for internal routing to avoid triggering `No match found` warning from Vue Router
      const location = isExternalHost || isInternalRouting ? href : router.resolve(href).fullPath || '/'

      // TODO: consider deprecating in favour of `app:rendered` and removing
      return nuxt.callHook('app:redirected').then(() => {
        const encodedLoc = location.replace(URL_QUOTE_RE, '%22')
        const encodedHeader = encodeURL(location, isExternalHost)
        nuxt.ssrContext!._renderResponse = {
          statusCode: 302,
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

  // Wait for the `window.location.href` navigation from above to complete to avoid showing content. If that doesn't work fast enough, delegate navigation back to the `vue-router` (risking a vue-router 404 warning in the console, but still avoiding content-flashes of the protected target page)
  const waitForNavigationWithFallbackToRouter = new Promise(resolve => setTimeout(resolve, 60 * 1000))
    .then(() => router.push(href))

  return waitForNavigationWithFallbackToRouter as Promise<void | undefined>
}

/**
 * Adapted from https://github.com/nuxt/nuxt/blob/16d213bbdcc69c0cc72afb355755ff877654a374/packages/nuxt/src/app/composables/router.ts#L270C1-L282C2
 * @internal
 */
export function encodeURL(location: string, isExternalHost = false) {
  const url = new URL(location, 'http://localhost')
  if (!isExternalHost) {
    return url.pathname + url.search + url.hash
  }
  if (location.startsWith('//')) {
    return url.toString().replace(url.protocol, '')
  }
  return url.toString()
}
