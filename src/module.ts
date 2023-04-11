import { defineNuxtModule, useLogger, addImportsDir, createResolver, addTemplate, addPlugin, addServerPlugin } from '@nuxt/kit'
import { defu } from 'defu'
import { joinURL } from 'ufo'
import { getOriginAndPathnameFromURL, isProduction } from './utils'
import type { ModuleOptions } from './types'

const PACKAGE_NAME = 'nuxt-auth'
const defaults = {
  isEnabled: true,
  backend: {
    type: 'authjs',
    baseURL: undefined,
    trustHost: false,
    defaultProvider: undefined,
    addDefaultCallbackUrl: true
  },
  session: {
    enableRefreshPeriodically: false,
    enableRefreshOnWindowFocus: true
  },
  globalAppMiddleware: {
    isEnabled: false,
    allow404WithoutAuth: true,
    addDefaultCallbackUrl: true
  }
} satisfies ModuleOptions

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'auth'
  },
  setup (userOptions, nuxt) {
    const logger = useLogger(PACKAGE_NAME)

    // 0. Load all options

    const { origin, pathname = '/api/auth' } = getOriginAndPathnameFromURL(userOptions.backend?.baseURL ?? '')

    const options = defu(userOptions, defaults, {
      computed: {
        origin,
        pathname,
        fullBaseUrl: joinURL(origin ?? '', pathname)
      }
    })

    // 1. Check if module should be enabled at all
    if (!options.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }

    logger.info('`nuxt-auth` setup starting')

    // 2. Set up runtime configuration
    if (!isProduction) {
      logger.info(`Auth API location is \`${options.backend.baseURL}\`, ensure that \`NuxtAuthHandler({ ... })\` is there, see https://sidebase.io/nuxt-auth/configuration/nuxt-auth-handler`)
    }

    nuxt.options.runtimeConfig = nuxt.options.runtimeConfig || { public: {} }

    // @ts-expect-error
    nuxt.options.runtimeConfig.auth = options
    // @ts-expect-error
    nuxt.options.runtimeConfig.public.auth = options

    // 3. Locate runtime directory
    const { resolve } = createResolver(import.meta.url)

    // 4. Add nuxt-auth composables
    const composables = resolve('./runtime/composables')
    addImportsDir(composables)

    // 5. Create virtual imports for server-side
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.alias = nitroConfig.alias || {}

      // Inline module runtime in Nitro bundle
      nitroConfig.externals = defu(typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {}, {
        inline: [resolve('./runtime')]
      })
      nitroConfig.alias['#auth'] = resolve('./runtime/server/services')
    })

    addTemplate({
      filename: 'types/auth.d.ts',
      getContents: () => [
        'declare module \'#auth\' {',
        `  const getServerSession: typeof import('${resolve('./runtime/server/services')}').getServerSession`,
        `  const getToken: typeof import('${resolve('./runtime/server/services')}').getToken`,
        `  const NuxtAuthHandler: typeof import('${resolve('./runtime/server/services')}').NuxtAuthHandler`,
        '}'
      ].join('\n')
    })

    nuxt.hook('prepare:types', (options) => {
      options.references.push({ path: resolve(nuxt.options.buildDir, 'types/auth.d.ts') })
    })

    // 6. Add plugin for initial load
    addPlugin(resolve('./runtime/plugin'))

    // 7. Add a server-plugin to check the `origin` on production-startup
    addServerPlugin(resolve('./runtime/server/plugins/assertOrigin'))

    logger.success('`nuxt-auth` setup done')
  }
})
