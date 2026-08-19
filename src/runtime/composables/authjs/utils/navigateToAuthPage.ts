import { hasProtocol, isScriptProtocol } from 'ufo'
import { callWithNuxt, useRouter } from '#app'
import type { NuxtApp } from '#app'

export function navigateToAuthPageWN(nuxt: NuxtApp, href: string, isInternalRouting?: boolean) {
  return callWithNuxt(nuxt, navigateToAuthPage, [nuxt, href, isInternalRouting])
}

// Adapted from https://github.com/nuxt/nuxt/blob/df18c4a8f1fa9b8577d3cc29a8965f6449adf698/packages/nuxt/src/app/composables/router.ts#L150-L160
const HTML_ATTR_UNSAFE_RE = /[&"'<>]/g
const HTML_ATTR_ENCODE_MAP: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  '\'': '&#x27;',
  '<': '&lt;',
  '>': '&gt;',
}
function encodeForHtmlAttr(value: string): string {
  return value.replace(HTML_ATTR_UNSAFE_RE, c => HTML_ATTR_ENCODE_MAP[c]!)
}

/**
 * Function to correctly navigate to auth-routes, necessary as the auth-routes are not part of the nuxt-app itself, so unknown to nuxt / vue-router.
 *
 * More specifically, we need this function to correctly handle the following cases:
 * 1. On the client-side, returning `navigateTo(signInUrl)` leads to a `404` error as the next-auth-signin-page was not registered with the vue-router that is used for routing under the hood. For this reason we need to
 *    manually set `window.location.href` on the client **and then fake return a Promise that does not immediately resolve to block navigation (although it will not actually be fully awaited, but just be awaited long enough for the naviation to complete)**.
 * 2. Additionally on the server-side, we cannot use `navigateTo(signInUrl)` as this uses `vue-router` internally which does not know the "external" sign-in page of next-auth and thus will log a warning which we want to avoid.
 *
 * Adapted from https://github.com/nuxt/nuxt/blob/0644379fa71a9aac427b1483cfc8b4bf9e9441fe/packages/nuxt/src/app/composables/router.ts#L171-L304
 *
 * @param nuxtApp Nuxt app context
 * @param href HREF / URL to navigate to
 */
function navigateToAuthPage(nuxtApp: NuxtApp, href: string, isInternalRouting = false): string | false | Promise<false | void> {
  // This is a slight difference with `nuxt/nuxt` - we treat `isInternalRouting` as `options.external`
  // due to the routes being server-only, i.e. not resolvable app-side
  const isExternalHost = hasProtocol(href, { acceptRelative: true })
  const isExternal = isExternalHost || isInternalRouting
  // Here we always check the protocol instead of only for external routes
  const { protocol } = new URL(href, 'http://localhost')
  if (protocol && isScriptProtocol(protocol)) {
    throw new Error(`Cannot navigate to a URL with '${protocol}' protocol.`)
  }

  // https://github.com/nuxt/nuxt/blob/dc69e26c5b9adebab3bf4e39417288718b8ddf07/packages/nuxt/src/app/composables/router.ts#L84-L93
  const inMiddleware = Boolean(nuxtApp._processingMiddleware)

  // Early redirect on client-side
  if (import.meta.client && !isExternal && inMiddleware) {
    return href || '/'
  }

  const router = useRouter()

  if (import.meta.server) {
    if (nuxtApp.ssrContext) {
      // This is a difference with `nuxt/nuxt` - we do not add `app.baseURL` here because all consumers are responsible for it
      // We also skip resolution for internal routing to avoid triggering `No match found` warning from Vue Router
      const location = isExternal ? href : router.resolve(href).fullPath || '/'

      async function redirect(response: false | undefined) {
        // TODO: consider deprecating in favour of `app:rendered` and removing
        await nuxtApp.callHook('app:redirected')
        const encodedHeader = encodeURL(location, isExternalHost)
        const encodedLoc = encodeForHtmlAttr(encodedHeader)

        nuxtApp.ssrContext!._renderResponse = {
          statusCode: 302,
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`,
          headers: { location: encodedHeader },
        }
        return response
      }

      // We wait to perform the redirect last in case any other middleware will intercept the redirect
      // and redirect somewhere else instead.
      if (!isExternal && inMiddleware) {
        // vue-router normalises queries so in this case we need to resolve instead of directly comparing
        let expectedPath = location
        if (href.includes('?')) {
          const target = router.resolve(href)
          expectedPath = router.resolve({ path: target.path, query: target.query, hash: target.hash }).fullPath || '/'
        }
        router.afterEach(final => final.fullPath === expectedPath ? redirect(false) : undefined)
        return href
      }
      // For relative server-only auth routes, this deviates from @sidebase/nuxt-auth <= 1.3.1, which
      // returned `undefined`. Returning `false` matches Nuxt and aborts remaining middleware after the
      // redirect response has already been set.
      return redirect(!inMiddleware ? undefined : /* abort further route navigation */ false)
    }
  }

  // Client-side redirection using vue-router.
  // The internal routes like `/api/auth/signin` are server-only so trying to `router.resolve` or `router.push` would 404
  // Run any cleanup steps for the current scope, like ending BroadcastChannel
  nuxtApp._scope.stop()

  location.href = href
  // If href contains a hash, the browser may not reload the page. We force reload manually.
  if (href.includes('#')) {
    location.reload()
  }

  // Within a Nuxt route middleware handler
  if (inMiddleware) {
    // Abort navigation when app is hydrated
    if (!nuxtApp.isHydrating) {
      return false
    }
    // When app is hydrating (i.e. on page load), we don't want to abort navigation as
    // it would lead to a 404 error / page that's blinking before location changes.
    return new Promise(() => {})
  }
  return Promise.resolve()
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
