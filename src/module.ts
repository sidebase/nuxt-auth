import { defineNuxtModule, useLogger, createResolver, addTemplate, addPlugin, addServerPlugin, addImports } from '@nuxt/kit'
import { defu } from 'defu'
import { joinURL } from 'ufo'
import type { DeepRequired } from 'ts-essentials'
import { getOriginAndPathnameFromURL, isProduction } from './utils'
import type { ModuleOptions, SupportedAuthBackends, AuthBackends } from './types'

const topLevelDefaults = {
  isEnabled: true,
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

const defaultsByBackend: { [key in SupportedAuthBackends]: DeepRequired<Extract<AuthBackends, { type: key }>> } = {
  local: {
    type: 'local',
    pages: {
      login: '/login'
    },
    endpoints: {
      signIn: { path: '/login', method: 'post' },
      signOut: { path: '/logout', method: 'post' },
      signUp: { path: '/register', method: 'post' },
      getSession: { path: '/session', method: 'get' }
    },
    token: {
      signInResponseJsonPointerToToken: '/token',
      type: 'Bearer',
      headerName: 'Authorization',
      maxAgeInSeconds: 30 * 60
    }
  },
  authjs: {
    type: 'authjs',
    trustHost: false,
    defaultProvider: undefined,
    addDefaultCallbackUrl: true
  }
}

const PACKAGE_NAME = 'nuxt-auth'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'auth'
  },
  setup (userOptions, nuxt) {
    const logger = useLogger(PACKAGE_NAME)

    // 0. Assemble all options
    const { origin, pathname = '/api/auth' } = getOriginAndPathnameFromURL(userOptions.baseURL ?? '')

    const selectedBackend = userOptions.backend?.type ?? 'authjs'

    const options = {
      ...defu(
        userOptions,
        topLevelDefaults,
        {
          computed: {
            origin,
            pathname,
            fullBaseUrl: joinURL(origin ?? '', pathname)
          }
        }),
      // We use `as` to infer backend types correclty for runtime-usage (everything is set, although for user everything was optional)
      backend: defu(userOptions.backend, defaultsByBackend[selectedBackend]) as DeepRequired<Extract<AuthBackends, { type: typeof selectedBackend }>>
    }

    // 1. Check if module should be enabled at all
    if (!options.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }

    logger.info('`nuxt-auth` setup starting')

    // 2. Set up runtime configuration
    if (!isProduction) {
      logger.info(`Auth API location is \`${options.baseURL}\`, ensure that \`NuxtAuthHandler({ ... })\` is there, see https://sidebase.io/nuxt-auth/configuration/nuxt-auth-handler`)
    }

    nuxt.options.runtimeConfig = nuxt.options.runtimeConfig || { public: {} }

    // @ts-expect-error
    nuxt.options.runtimeConfig.auth = options

    // @ts-expect-error
    nuxt.options.runtimeConfig.public.auth = options

    // 3. Locate runtime directory
    const { resolve } = createResolver(import.meta.url)

    // 4. Add the correct nuxt-auth app composable, for the desired backend
    addImports([
      {
        name: 'useAuth',
        from: resolve(`./runtime/composables/${options.backend.type}/useAuth`)
      },
      {
        name: 'useAuthState',
        from: resolve(`./runtime/composables/${options.backend.type}/useAuthState`)
      }
    ])

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
