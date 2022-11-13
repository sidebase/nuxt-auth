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
    if (typeof usedOrigin === 'undefined') {
      // TODO: see if we can figure out localhost + port dynamically from the nuxt instance
      if (process.env.NODE_ENV === 'production') {
        logger.error('You must provide `origin` for production. The origin is the scheme, host and port of your target deployment, e.g., `https://example.org` (port ist 80 implicitly)')
        throw new Error('Bad production config - please set `auth.origin`')
      } else {
        usedOrigin = 'http://localhost:3000'
        logger.warn(`\`origin\` not set - an origin is mandatory for production. Using "${usedOrigin}" as a fallback`)
      }
    }

    const options = defu(moduleOptions, {
      ...defaults,
      basePath: defaults.basePath,
      origin: usedOrigin
    })

    const url = joinURL(options.origin, options.basePath)
    logger.info(`Using "${url}" as the auth API location, make sure the \`[...].ts\` auth-handler is added there. Use the \`auth.orign\` and \`auth.basePath\` config keys to change the API location`)

    nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth, {
      ...options,
      url
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
