import { defineNuxtModule, useLogger, addImportsDir, createResolver, resolveModule, addTemplate } from '@nuxt/kit'
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
}

const PACKAGE_NAME = 'nuxt-auth'
const defaults: ModuleOptions & { basePath: string } = {
  isEnabled: true,
  origin: undefined,
  basePath: '/api/auth'
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

    logger.info('Setting up auth...')

    // 2. Set up runtime configuration
    let usedOrigin = moduleOptions.origin
    const isOriginSet = typeof usedOrigin !== 'undefined'
    if (!isOriginSet) {
      // TODO: see if we can figure out localhost + port dynamically from the nuxt instance
      const usingHTTPS = (typeof nuxt.options.server.https !== 'object' ? nuxt.options.server.https : false) || Boolean(process.env.HTTPS) || Boolean(process.env.NITRO_HTTPS) || false

      const usedProtocol = usingHTTPS ? 'https' : 'http'
      const usedHost = nuxt.options.server.host || process.env.HOST || process.env.NITRO_HOST || 'localhost'
      const usedPort = nuxt.options.server.port || process.env.PORT || process.env.NITRO_PORT || 3000

      usedOrigin = `${usedProtocol}://${usedHost}:${usedPort}`
    }

    const options = defu(moduleOptions, {
      ...defaults,
      basePath: defaults.basePath,
      origin: usedOrigin
    })

    const url = joinURL(options.origin, options.basePath)
    logger.info(`Using \`${url}\` as the auth API location, make sure the \`[...].ts\` file with the \`export default NuxtAuthHandler({ ... })\` is added there. Use the \`nuxt.config.ts\` \`auth.origin\` and \`auth.basePath\` config keys to change the API location`)
    if (process.env.NODE_ENV === 'production') {
      logger.info('When building for production ensure to (1) set the application origin using `auth.origin` inside your `nuxt.config.ts` and (2) set the secret inside the `NuxtAuthHandler({ secret: ... })`')
    }

    nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth, {
      ...options,
      url,
      isOriginSet
    })
    nuxt.options.runtimeConfig.public.auth = defu(nuxt.options.runtimeConfig.public.auth, {
      url
    })

    // 3. Locate runtime directory
    const { resolve } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolve('./runtime') })

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
      nitroConfig.alias['#auth'] = resolveRuntimeModule('./server/services')
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

    logger.success('Auth module setup done')
  }
})
