// Minimal interface to facilitate unit-testing
export interface NuxtPage {
  meta?: Record<string, unknown>
  children?: NuxtPage[]
}

/**
 * Adds `middleware: ['sidebase-auth']` to pages which use `definePageMeta({ auth: true })` or `definePageMeta({ auth: {} })`.
 * @see https://nuxt.com/docs/4.x/guide/directory-structure/app/middleware#setting-middleware-at-build-time
 */
export function autoAddMiddleware(pages: NuxtPage[], middlewareName: string) {
  for (const page of pages) {
    if (page.meta !== undefined && (page.meta.auth === true || typeof page.meta.auth === 'object')) {
      const previousMiddleware: unknown = page.meta.middleware
      let normalizedMiddleware: unknown[]

      if (previousMiddleware === undefined) {
        normalizedMiddleware = []
      } else if (Array.isArray(previousMiddleware)) {
        normalizedMiddleware = previousMiddleware
      } else {
        normalizedMiddleware = [previousMiddleware]
      }

      if (!normalizedMiddleware.includes(middlewareName)) {
        normalizedMiddleware.push(middlewareName)
        page.meta.middleware = normalizedMiddleware
      }
    }

    if (page.children) {
      autoAddMiddleware(page.children, middlewareName)
    }
  }
}
