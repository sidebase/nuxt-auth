import { defineNuxtModule, useLogger, addServerHandler, addImportsDir, createResolver, resolveModule, addTemplate } from '@nuxt/kit'
import defu from 'defu'

export interface ModuleOptions {
  isEnabled: boolean
  nextAuth: {
    url?: string
    secret?: string
    providers: any
  }
}

const PACKAGE_NAME = 'nuxt-user'
const defaults = {
  isEnabled: true,
  nextAuth: {
    url: 'http://localhost:3000/api/auth/',
    secret: undefined,
    providers: []
  }

}
export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'user'
  },
  defaults,
  setup (moduleOptions, nuxt) {
    const logger = useLogger(PACKAGE_NAME)

    if (!moduleOptions.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }

    // -1. Set up runtime configuration
    const options = defu(moduleOptions, defaults)
    nuxt.options.runtimeConfig.user = defu(nuxt.options.runtimeConfig.user, options)

    // 0. Locate runtime directory
    const { resolve } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolve('./runtime') })

    // 1. Add NextAuth.js API endpoints
    const handler = resolve('./runtime/server/api/auth')
    addServerHandler({
      handler,
      middleware: true
    })

    // 2. Add nuxt-user composables
    const composables = resolve('./runtime/composables')
    addImportsDir(composables)

    // 3. Create virtual imports of server-side `getServerSession`
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
