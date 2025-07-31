import {
  addImports,
  addPlugin,
  addRouteMiddleware,
  addServerPlugin,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  resolvePath,
  useLogger
} from '@nuxt/kit'
import { defu } from 'defu'
import type { DeepRequired } from 'ts-essentials'
import type { NuxtModule } from 'nuxt/schema'
import { isProduction } from './runtime/helpers'
import type {
  AuthProviders,
  ModuleOptions,
  ModuleOptionsNormalized,
  RefreshHandler,
  SupportedAuthProviders
} from './runtime/types'
import { autoAddMiddleware } from './build/autoAddMiddleware'

const topLevelDefaults = {
  isEnabled: true,
  baseURL: '/api/auth',
  disableInternalRouting: false as boolean,
  disableServerSideAuth: false,
  originEnvKey: 'AUTH_ORIGIN',
  sessionRefresh: {
    enablePeriodically: false,
    enableOnWindowFocus: true,
    handler: undefined
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
      maxAgeInSeconds: 30 * 60, // 30 minutes
      sameSiteAttribute: 'lax',
      secureCookieAttribute: false,
      cookieDomain: '',
      httpOnlyCookieAttribute: false
    },
    session: {
      dataType: { id: 'string | number' },
      dataResponsePointer: '/'
    },
    refresh: {
      isEnabled: false,
      endpoint: { path: '/refresh', method: 'post' },
      refreshOnlyToken: true,
      token: {
        signInResponseRefreshTokenPointer: '/refreshToken',
        refreshResponseTokenPointer: '',
        refreshRequestTokenPointer: '/refreshToken',
        cookieName: 'auth.refresh-token',
        maxAgeInSeconds: 60 * 60 * 24 * 7, // 7 days
        sameSiteAttribute: 'lax',
        secureCookieAttribute: false,
        cookieDomain: '',
        httpOnlyCookieAttribute: false
      }
    }
  },

  authjs: {
    type: 'authjs',
    trustHost: false,
    defaultProvider: '', // this satisfies Required and also gets caught at `!provider` check
    addDefaultCallbackUrl: true
  }
}

const PACKAGE_NAME = 'sidebase-auth'
const MIDDLEWARE_NAME = PACKAGE_NAME

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'auth'
  },
  setup(userOptions, nuxt) {
    const logger = useLogger(PACKAGE_NAME)

    // 0. Assemble all options

    const selectedProvider = userOptions.provider?.type ?? 'authjs'

    const options = defu({
      // We use `as` to infer backend types correctly for runtime-usage (everything is set, although for user everything was optional)
      provider: defu(
        userOptions.provider,
        defaultsByBackend[selectedProvider]
      ) as DeepRequired<AuthProviders>
    }, userOptions, topLevelDefaults)

    // 1. Check if module should be enabled at all
    if (!options.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }

    logger.info('`nuxt-auth` setup starting')

    // 2.1. Disable internal routing for `local` provider when not specified otherwise
    // https://github.com/sidebase/nuxt-auth/issues/797
    if (userOptions.disableInternalRouting === undefined && selectedProvider === 'local') {
      options.disableInternalRouting = true
    }

    // 2.2. Set up runtime configuration
    if (!isProduction) {
      const loggerMessages = [
        `Selected provider: ${selectedProvider}.`,
        `Auth API location is \`${options.baseURL}\`, if you would like to change this, see https://auth.sidebase.io/guide/application-side/configuration#baseurl.`
      ]
      if (selectedProvider === 'authjs') {
        loggerMessages.push('Ensure that the `NuxtAuthHandler({ ... })` is there, see https://auth.sidebase.io/guide/authjs/nuxt-auth-handler')
      }

      logger.info(loggerMessages.join(' '))
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

    addTypeTemplate({
      filename: 'types/auth.d.ts',
      getContents: () =>
        [
          '// AUTO-GENERATED BY @sidebase/nuxt-auth',
          'declare module \'#auth\' {',
          `  const { getServerSession, getToken, NuxtAuthHandler }: typeof import('${resolve('./runtime/server/services')}')`,
          ...(options.provider.type === 'local'
            ? [
                'interface SessionData {',
                ...Object.entries((options.provider as any).session.dataType).map(
                  ([key, value]) => `  ${key}: ${value};`
                ),
                '}',
              ]
            : []
          ),
          '}',
          ''
        ].join('\n')
    })

    addTypeTemplate({
      filename: 'types/auth-misc.d.ts',
      getContents: () => [
        '// AUTO-GENERATED BY @sidebase/nuxt-auth',
        `import { RouteOptions } from '${resolve('./runtime/types.ts')}'`,
        'declare module \'nitropack\' {',
        '  interface NitroRouteRules {',
        '    auth?: RouteOptions',
        '  }',
        '  interface NitroRouteConfig {',
        '    auth?: RouteOptions',
        '  }',
        '}',
        ''
      ].join('\n')
    })

    // 5.2. Create refresh handler
    const generatedRefreshHandlerPath = addTemplate({
      filename: './refreshHandler.ts',
      async getContents() {
        if (options.sessionRefresh.handler) {
          const path = (await resolvePath(options.sessionRefresh.handler)).replace(/\.ts$/, '')
          return `export { default as _refreshHandler } from '${path}'`
        }

        return [
          `import { DefaultRefreshHandler } from '${resolve('./runtime/utils/refreshHandler')}'`,
          `export const _refreshHandler = new DefaultRefreshHandler(${JSON.stringify(options.sessionRefresh)})`
        ].join('\n')
      },
      write: true
    }).dst
    addImports([{
      name: '_refreshHandler',
      from: generatedRefreshHandlerPath
    }])

    // 6. Register middleware for autocomplete in definePageMeta
    addRouteMiddleware({
      name: MIDDLEWARE_NAME,
      path: resolve('./runtime/middleware/sidebase-auth')
    })

    // 6.5. Automatically add the middleware when `definePageMeta({ auth: true })` usage is detected
    if (!options.globalAppMiddleware || !options.globalAppMiddleware.isEnabled) {
      nuxt.hook('pages:extend', pages => autoAddMiddleware(pages, MIDDLEWARE_NAME))
    }

    // 7. Add plugin for initial load
    addPlugin(resolve('./runtime/plugin'))

    // 8. Add a server-plugin to check the `origin` on production-startup
    if (selectedProvider === 'authjs') {
      addServerPlugin(resolve('./runtime/server/plugins/assertOrigin'))
    }

    // 9. Add a plugin to refresh the token on production-startup
    if (options.provider.type === 'local' && options.provider.refresh.isEnabled && !options.disableServerSideAuth) {
      addPlugin(resolve('./runtime/plugins/refresh-token.server'))
    }

    logger.success('`nuxt-auth` setup done')
  }
}) satisfies NuxtModule<ModuleOptions>

// Used by nuxt/module-builder for `types.d.ts` generation
export type { ModuleOptions, RefreshHandler }
export interface ModulePublicRuntimeConfig {
  auth: ModuleOptionsNormalized
}

// Augment types for type inference in source code
declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    auth: ModuleOptionsNormalized
  }
}
