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

    if (!moduleOptions.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }

    // 1. Set up runtime configuration
    const options = defu(moduleOptions, defaults)
    nuxt.options.runtimeConfig.auth = defu(nuxt.options.runtimeConfig.auth, options)

    // 2. Setup NextAuth.js options
    const nextAuthOptions = options.nextAuth
    const providerOptions = nextAuthOptions.options.providers.map(({ id, name, type, options }) => ({ id, name, type, options }))
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

    // 2. Locate runtime directory
    const { resolve } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolve('./runtime') })

    // 3. Add NextAuth.js API endpoints
    const handler = resolve('./runtime/server/api/auth')
    addServerHandler({
      handler,
      middleware: true
    })

    // 4. Add nuxt-auth composables
    const composables = resolve('./runtime/composables')
    addImportsDir(composables)

    // 5. Create virtual imports of server-side `getServerSession`
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
  }
})
