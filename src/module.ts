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
import { joinURL } from 'ufo'
import { genInterface } from 'knitwork'
import type { DeepRequired } from 'ts-essentials'
import type { NuxtModule } from 'nuxt/schema'
import { getOriginAndPathnameFromURL, isProduction } from './runtime/helpers'
import type {
  AuthProviders,
  ModuleOptions,
  ModuleOptionsNormalized,
  RefreshHandler,
  SupportedAuthProviders
} from './runtime/types'

const topLevelDefaults = {
  isEnabled: true,
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

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'auth'
  },
  setup(userOptions, nuxt) {
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
      const authjsAddition
        = selectedProvider === 'authjs'
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

    addTypeTemplate({
      filename: 'types/auth.d.ts',
      getContents: () =>
        [
          '// AUTO-GENERATED BY @sidebase/nuxt-auth',
          'declare module \'#auth\' {',
          `  const { getServerSession, getToken, NuxtAuthHandler }: typeof import('${resolve('./runtime/server/services')}')`,
          ...(options.provider.type === 'local'
            ? [genInterface(
                'SessionData',
                (options.provider as any).session.dataType
              )]
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
    // const generatedRefreshHandlerPath = resolve('./runtime/refreshHandler.ts')
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
      name: 'auth',
      path: resolve('./runtime/middleware/auth')
    })

    // 7. Add plugin for initial load
    addPlugin(resolve('./runtime/plugin'))

    // 8. Add a server-plugin to check the `origin` on production-startup
    if (selectedProvider === 'authjs') {
      addServerPlugin(resolve('./runtime/server/plugins/assertOrigin'))
    }

    // 9. Add a plugin to refresh the token on production-startup
    if (options.provider.type === 'local' && options.provider.refresh.isEnabled) {
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
