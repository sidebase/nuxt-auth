import { NitroRouteConfig } from 'nitropack'
import { withoutBase, withoutTrailingSlash } from 'ufo'
import { createRouter, toRouteMatcher } from 'radix3'
import { defu } from 'defu'
import { RouteOptions } from '../types'
import { useRuntimeConfig } from '~/.nuxt/imports'

/**
 * Removes query params from url path.
 */
export const withoutQuery = (path: string) => {
  return path.split('?')[0]
}

/**
 * Creates a route matcher using the user's paths.
 *
 * In the returned function, enter a path to retrieve the routeRules that applies to that page.
 */
export const createNitroRouteRuleMatcher = (): ((path: string) => NitroRouteConfig & {auth?: RouteOptions}) => {
  const { nitro, app } = useRuntimeConfig()
  const _routeRulesMatcher = toRouteMatcher(
    createRouter({
      routes: Object.fromEntries(
        Object.entries(nitro?.routeRules || {})
          .map(([path, rules]) => [withoutTrailingSlash(path), rules])
      )
    })
  )

  return (path: string) => {
    return defu({}, ..._routeRulesMatcher.matchAll(
      // radix3 does not support trailing slashes
      withoutBase(withoutTrailingSlash(withoutQuery(path)), app.baseURL)
    ).reverse()) as NitroRouteConfig & {auth?: RouteOptions}
  }
}
