import { withoutBase, withoutTrailingSlash } from 'ufo'
import { type RouteMatcher, createRouter, toRouteMatcher } from 'radix3'
import type { RouteOptions } from '../types'
import { useRuntimeConfig } from '#imports'

/**
 * Removes query params from url path.
 */
export function withoutQuery(path: string) {
  return path.split('?')[0]
}

let routeMatcher: RouteMatcher

/**
 * Creates a route matcher using the user's paths.
 *
 * In the returned function, enter a path to retrieve the routeRules that applies to that page.
 */
export function getNitroRouteRules(path: string): Partial<RouteOptions> {
  const { nitro, app } = useRuntimeConfig()

  if (!routeMatcher) {
    routeMatcher = toRouteMatcher(
      createRouter({
        routes: Object.fromEntries(
          Object.entries(nitro?.routeRules || {})
            .map(([path, rules]) => [withoutTrailingSlash(path), rules])
        )
      })
    )
  }

  const options: Partial<RouteOptions> = {}

  const matches = routeMatcher.matchAll(
    withoutBase(withoutTrailingSlash(withoutQuery(path)), app.baseURL)
  ).reverse()

  for (const match of matches) {
    options.disableServerSideAuth ??= match.auth?.disableServerSideAuth
  }

  return options
}
