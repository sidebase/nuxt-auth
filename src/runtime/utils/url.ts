import { joinURL, parseURL } from 'ufo'
import _getURL from 'requrl'
import { useRequestEvent } from '#app'
import { useRuntimeConfig, navigateTo as _navigateTo } from '#imports'

const _getBasePath = () => parseURL(useRuntimeConfig().public.auth.url).pathname
export const joinPathToBase = (path: string) => joinURL(_getBasePath(), path)

export const getRequestUrl = (includePath = true) => _getURL(useRequestEvent()?.node.req, includePath)
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
