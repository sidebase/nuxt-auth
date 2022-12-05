import { defineNuxtModule, useLogger, addImportsDir, createResolver, addTemplate, addPlugin, extendViteConfig } from '@nuxt/kit'
import defu from 'defu'
import { joinURL } from 'ufo'

interface ModuleOptions {
  /**
   * Whether the module is enabled at all
   */
  isEnabled: boolean
  /**
   * Full url at which the app will run and path to authentication.
   *
   * Can be `undefined` during development but _must_ be set for production. This is the origin-part of the NEXTAUTH_URL. The origin consists out of:
   * - `scheme`: http / https
   * - `host`: e.g., localhost, example.org, google.com
   * - `port`: _empty_ (implies `:80`), :3000, :8888
   *
   * See https://next-auth.js.org/configuration/options#nextauth_url for more on this. Note that nextauth uses the full url as one.
   *
   * @example undefined
   * @example http://localhost:3000
   * @example https://example.org
   * @default http://localhost:3000
   */
  origin: string | undefined
  /**
   * The path to the endpoint that you've added `NuxtAuth` at via `export default NuxtAuthHandler({ ... })`. See the getting started for more: https://github.com/sidebase/nuxt-auth#quick-start
   *
   * @default /api/auth
   */
  basePath: string | undefined
  /**
   * If set to `true`, `NuxtAuth` will use either the `x-forwarded-host` or `host` headers,
   * instead of `auth.origin`
   * Make sure that reading `x-forwarded-host` on your hosting platform can be trusted.
   * - ⚠ **This is an advanced option.** Advanced options are passed the same way as basic options,
   * but **may have complex implications** or side effects.
   * You should **try to avoid using advanced options** unless you are very comfortable using them.
   * @default false
   */
  trustHost: boolean
  /**
   * Whether to refresh the session every `X` milliseconds. Set this to `false` to turn it off. The session will only be refreshed if a session already exists.
   *
   * Setting this to `true` will refresh the session every second.
   * Setting this to `false` will turn off session refresh.
   * Setting this to a number `X` will refresh the session every `X` milliseconds.
   *
   * @example 1000
   * @default false
   *
   */
  enableSessionRefreshPeriodically: number | boolean
  /**
   * Whether to refresh the session every time the browser window is refocused.
   *
   * @example false
   * @default true
   */
  enableSessionRefreshOnWindowFocus: boolean
  /**
   * Whether to add a global authentication middleware that protects all pages.
   *
   * @example true
   * @default false
   */
  enableGlobalAppMiddleware: boolean
}

const PACKAGE_NAME = 'nuxt-auth'
const defaults: ModuleOptions & { basePath: string } = {
  isEnabled: true,
  origin: undefined,
  basePath: '/api/auth',
  trustHost: false,
  enableSessionRefreshPeriodically: false,
  enableSessionRefreshOnWindowFocus: true,
  enableGlobalAppMiddleware: false
}
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'auth'
  },
  defaults,
  setup (moduleOptions, nuxt) {
    const logger = useLogger(PACKAGE_NAME)

    // 1. Check if module should be enabled at all
    if (!moduleOptions.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }

    logger.info('`nuxt-auth` setup starting')

    // 2. Set up runtime configuration
    const isOriginSet = Boolean(moduleOptions.origin)

    const options = defu(moduleOptions, {
      ...defaults,
      basePath: defaults.basePath
    })

    const url = joinURL(options.origin ?? '', options.basePath)
    logger.info(`Using \`${url}\` as the auth API location, make sure the \`[...].ts\` file with the \`export default NuxtAuthHandler({ ... })\` is added there. Use the \`nuxt.config.ts\` \`auth.origin\` and \`auth.basePath\` config keys to change the API location`)
    if (process.env.NODE_ENV === 'production') {
      logger.info('When building for production ensure to (1) set the application origin using `auth.origin` inside your `nuxt.config.ts` and (2) set the secret inside the `NuxtAuthHandler({ secret: ... })`')
    }

    nuxt.options.runtimeConfig = nuxt.options.runtimeConfig || { public: {} }
    nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth, {
      ...options,
      isOriginSet
    })
    nuxt.options.runtimeConfig.public.auth = defu(nuxt.options.runtimeConfig.public.auth, {
      ...options
    })

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

    // 7. Setup next-auth env-variables just to be safe, see https://github.com/nextauthjs/next-auth/blob/6280fe9e10bd123aeab576398d1e807a5ac37edc/apps/playground-nuxt/src/module.ts#L32-L38
    if (!nuxt.options.dev && isOriginSet) {
      extendViteConfig((config) => {
        config.define = config.define || {}
        config.define['process.env.NEXTAUTH_URL'] = JSON.stringify(url)
        config.define['process.env.NEXTAUTH_URL_INTERNAL'] = JSON.stringify(url)
        config.define['process.env.AUTH_TRUST_HOST'] = JSON.stringify(options.trustHost)
        config.define['process.env.VERCEL_URL'] = JSON.stringify(process.env.VERCEL_URL)
      })
    }

    logger.success('`nuxt-auth` setup done')
  }
})
