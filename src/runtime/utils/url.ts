import { joinURL } from 'ufo'
import _getURL from 'requrl'
import { useRequestEvent } from '#app'
import { useRuntimeConfig, navigateTo as _navigateTo } from '#imports'

const getApiURL = () => joinURL(getRequestURL(false), useRuntimeConfig().public.auth.basePath)

export const getRequestURL = (includePath = true) => _getURL(useRequestEvent()?.node.req, includePath)
export const joinPathToApiURL = (path: string) => joinURL(getApiURL(), path)

export const navigateTo = (href: string, { external } = { external: true }) => {
  if (process.client) {
    window.location.href = href

    // If href contains a hash, the browser does not reload the page. We reload manually
    if (href.includes('#')) {
      window.location.reload()
    }
  } else {
    return _navigateTo(href, { external })
  }
}
