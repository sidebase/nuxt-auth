import { joinURL } from 'ufo'
import _getURL from 'requrl'
import { useRequestEvent } from '#app'
import { useRuntimeConfig, navigateTo as _navigateTo } from '#imports'

const getApiURL = () => {
  const origin = useRuntimeConfig().public.auth.origin ?? (process.env.NODE_ENV !== 'production' ? getRequestURL(false) : '')
  return joinURL(origin, useRuntimeConfig().public.auth.basePath)
}

export const getRequestURL = (includePath = true) => _getURL(useRequestEvent()?.node.req, includePath)
export const joinPathToApiURL = (path: string) => joinURL(getApiURL(), path)

export const navigateTo = (href: string, options?: { external?: boolean, replace?: boolean }) => {
  const { external = true, replace = false } = options ?? {}

  if (process.server) {
    return _navigateTo(href, { external })
  }

  if (!external) {
    return _navigateTo(href, { external, replace })
  }

  // Replicate `navigateTo` behaviour: https://github.com/nuxt/framework/blob/main/packages/nuxt/src/app/composables/router.ts#L106
  if (replace) {
    window.location.replace(href)
  } else {
    window.location.href = href
  }

  // But if href contains a hash, the browser does not reload the page. We reload manually
  if (href.includes('#')) {
    window.location.reload()
  }

  return Promise.resolve()
}
