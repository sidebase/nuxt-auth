import {
  defineNuxtModule,
  useLogger,
  createResolver,
  addTemplate,
  addPlugin,
  addServerPlugin,
  addImports,
  addRouteMiddleware
} from '@nuxt/kit'
import { defu } from 'defu'
import { joinURL } from 'ufo'
import { genInterface } from 'knitwork'
import type { DeepRequired } from 'ts-essentials'
import type { NuxtModule } from 'nuxt/schema'
import { getOriginAndPathnameFromURL, isProduction } from './runtime/helpers'
import type {
  ModuleOptions,
  SupportedAuthProviders,
  AuthProviders
} from './runtime/types'

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

const defaultsByBackend: {
  [key in SupportedAuthProviders]: DeepRequired<
    Extract<AuthProviders, { type: key }>
  >;
} = {
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
      signInResponseTokenPointer: '/token',
      type: 'Bearer',
      cookieName: 'auth.token',
      headerName: 'Authorization',
      maxAgeInSeconds: 30 * 60,
      sameSiteAttribute: 'lax'
    },
    sessionDataType: { id: 'string | number' }
  },

  refresh: {
    type: 'refresh',
    pages: {
      login: '/login'
    },
    refreshOnlyToken: true,
    endpoints: {
      signIn: { path: '/login', method: 'post' },
      signOut: { path: '/logout', method: 'post' },
      signUp: { path: '/register', method: 'post' },
      getSession: { path: '/session', method: 'get' },
      refresh: { path: '/refresh', method: 'post' }
    },
    token: {
      signInResponseTokenPointer: '/token',
      type: 'Bearer',
      cookieName: 'auth.token',
      headerName: 'Authorization',
      maxAgeInSeconds: 5 * 60,
      sameSiteAttribute: 'none' // 5 minutes
    },
    refreshToken: {
      signInResponseRefreshTokenPointer: '/refreshToken',
      refreshRequestTokenPointer: '/refreshToken',
      cookieName: 'auth.refresh-token',
      maxAgeInSeconds: 60 * 60 * 24 * 7 // 7 days
    },
    sessionDataType: { id: 'string | number' }
  },

  authjs: {
    type: 'authjs',
    trustHost: false,
    defaultProvider: '', // this satisfies Required and also gets caught at `!provider` check
    addDefaultCallbackUrl: true
  }
}

const PACKAGE_NAME = 'sidebase-auth'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'auth'
  },
  setup (userOptions, nuxt) {
    const logger = useLogger(PACKAGE_NAME)

    // 0. Assemble all options
    const { origin, pathname = '/api/auth' } = getOriginAndPathnameFromURL(
      userOptions.baseURL ?? ''
    )

    const selectedProvider = userOptions.provider?.type ?? 'authjs'

    const options = {
      ...defu(userOptions, topLevelDefaults, {
        computed: {
          origin,
          pathname,
          fullBaseUrl: joinURL(origin ?? '', pathname)
        }
      }),
      // We use `as` to infer backend types correctly for runtime-usage (everything is set, although for user everything was optional)
      provider: defu(
        userOptions.provider,
        defaultsByBackend[selectedProvider]
      ) as DeepRequired<AuthProviders>
    }

    // 1. Check if module should be enabled at all
    if (!options.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }

    logger.info('`nuxt-auth` setup starting')

    // 2. Set up runtime configuration
    if (!isProduction) {
      const authjsAddition =
        selectedProvider === 'authjs'
          ? ', ensure that `NuxtAuthHandler({ ... })` is there, see https://sidebase.io/nuxt-auth/configuration/nuxt-auth-handler'
          : ''
      logger.info(
        `Selected provider: ${selectedProvider}. Auth API location is \`${options.computed.fullBaseUrl}\`${authjsAddition}`
      )
    }

    nuxt.options.runtimeConfig = nuxt.options.runtimeConfig || { public: {} }
    nuxt.options.runtimeConfig.public.auth = options

    // 3. Locate runtime directory
    const { resolve } = createResolver(import.meta.url)

    // 4. Add the correct nuxt-auth app composable, for the desired backend
    addImports([
      {
        name: 'useAuth',
        from: resolve(`./runtime/composables/${options.provider.type}/useAuth`)
      },
      {
        name: 'useAuthState',
        from: resolve(
          `./runtime/composables/${options.provider.type}/useAuthState`
        )
      }
    ])

    // 5. Create virtual imports for server-side
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.alias = nitroConfig.alias || {}

      // Inline module runtime in Nitro bundle
      nitroConfig.externals = defu(
        typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {},
        {
          inline: [resolve('./runtime')]
        }
      )
      nitroConfig.alias['#auth'] = resolve('./runtime/server/services')
    })

    addTemplate({
      filename: 'types/auth.d.ts',
      getContents: () =>
        [
          "declare module '#auth' {",
          `  const getServerSession: typeof import('${resolve(
            './runtime/server/services'
          )}').getServerSession`,
          `  const getToken: typeof import('${resolve(
            './runtime/server/services'
          )}').getToken`,
          `  const NuxtAuthHandler: typeof import('${resolve(
            './runtime/server/services'
          )}').NuxtAuthHandler`,
          options.provider.type === 'local'
            ? genInterface(
              'SessionData',
              (options.provider as any).sessionDataType
            )
            : '',
          '}'
        ].join('\n')
    })

    nuxt.hook('prepare:types', (options) => {
      options.references.push({
        path: resolve(nuxt.options.buildDir, 'types/auth.d.ts')
      })
    })

    // 6. Register middleware for autocomplete in definePageMeta
    addRouteMiddleware({
      name: 'auth',
      path: resolve('./runtime/middleware/auth')
    })

    // 7. Add plugin for initial load
    addPlugin(resolve('./runtime/plugin'))

    // 8. Add a server-plugin to check the `origin` on production-startup
    if (selectedProvider === 'authjs') {
      addServerPlugin(resolve('./runtime/server/plugins/assertOrigin'))
    }

    // 7.2 Add a server-plugin to refresh the token on production-startup
    if (selectedProvider === 'refresh') {
      addPlugin(resolve('./runtime/plugins/refresh-token.server'))
    }

    logger.success('`nuxt-auth` setup done')
  }
}) satisfies NuxtModule<ModuleOptions>
