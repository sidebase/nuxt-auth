import { defineNuxtModule, useLogger, addServerHandler, addImportsDir, createResolver, resolveModule, addTemplate } from '@nuxt/kit'
import defu from 'defu'
import { NextAuthOptions } from 'next-auth'

export interface NextAuthConfig {
  /**
   * Configure the NEXTAUTH_URL, see https://next-auth.js.org/configuration/options#nextauth_url
   */
  url?: string
  /**
   * All other NextAuth.js options like loggers, secret, providers, ...
   */
  options: NextAuthOptions
}

export interface ModuleOptions {
  /**
   * Whether the module is enabled at all
   */
  isEnabled: boolean
  /**
   * Options that are passed directly to next-auth. Find the documentation here: https://next-auth.js.org/configuration/options#options
   */
  nextAuth: NextAuthConfig
}

const PACKAGE_NAME = 'nuxt-auth'
const defaults: ModuleOptions = {
  isEnabled: true,
  nextAuth: {
    url: 'http://localhost:3000/api/auth/',
    options: {
      secret: undefined,
      providers: []
    }
  }

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
    const options = defu(moduleOptions, defaults)
    nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth, options)
    nuxt.options.runtimeConfig.public.auth = defu(nuxt.options.runtimeConfig.public.auth, {
      url: options.nextAuth.url
    })

    // 3. Setup NextAuth.js options
    // 3.1. Get options
    const nextAuthOptions = options.nextAuth

    // 3.2. Reduce the providers to id, name, type and options. This allows us to do two things:
    //      - the `options` are what was used to instantiate the provider by the user in the `nuxt.config.ts`, we can use them for later re-instantiation in the auth-middleware
    //      - serialize the whole config correctly in step 2.3., as additional non-serializable properties (that we can get back by re-instatiating) are filtered out
    const providerOptions = nextAuthOptions.options.providers.map(({ id, name, type, options }) => ({ id, name, type, options }))

    // 3.3. Create virtual imports
    const deduplicatedProviderIds = Array.from(new Set(providerOptions.map(({ id }) => id)))
    const providerImports = deduplicatedProviderIds.map(id => `import ${id} from "next-auth/providers/${id}"`)
    const providerExports = deduplicatedProviderIds.map(id => `"${id}": ${id}`)

    const providerModule = `
        ${providerImports.join('\n')}

        export default {
          ${providerExports.join(', ')}
        }
    `
    nuxt.options.nitro.virtual = defu(nuxt.options.nitro.virtual, {
      '#sidebase/providers': providerModule
    })
    nuxt.options.nitro.virtual = defu(nuxt.options.nitro.virtual,
      {
        '#sidebase/auth': `export default ${JSON.stringify({
          ...nextAuthOptions,
          options: {
            ...nextAuthOptions.options,
            providers: providerOptions
          }
        })};`
      })

    // 4. Locate runtime directory
    const { resolve } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolve('./runtime') })

    // 5. Add NextAuth.js API endpoints
    const handler = resolve('./runtime/server/api/auth')
    addServerHandler({
      handler,
      middleware: true
    })

    // 6. Add nuxt-auth composables
    const composables = resolve('./runtime/composables')
    addImportsDir(composables)

    // 7. Create virtual imports of server-side `getServerSession`
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.alias = nitroConfig.alias || {}

      // Inline module runtime in Nitro bundle
      nitroConfig.externals = defu(typeof nitroConfig.externals === 'object' ? nitroConfig.externals : {}, {
        inline: [resolve('./runtime')]
      })
      nitroConfig.alias['#sidebase/server'] = resolveRuntimeModule('./server/services')
    })

    addTemplate({
      filename: 'types/sidebase.d.ts',
      getContents: () => [
        'declare module \'#sidebase/server\' {',
        `  const getServerSession: typeof import('${resolve('./runtime/server/services')}').getServerSession`,
        '}'
      ].join('\n')
    })

    nuxt.hook('prepare:types', (options) => {
      options.references.push({ path: resolve(nuxt.options.buildDir, 'types/sidebase.d.ts') })
    })

    logger.success('Auth setup complete')
  }
})
