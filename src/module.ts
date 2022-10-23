import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineNuxtModule, useLogger, addServerHandler, addImportsDir } from '@nuxt/kit'

export interface ModuleOptions {
  isEnabled: boolean
}

const PACKAGE_NAME = 'nuxt-user'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'user'
  },
  defaults: {
    isEnabled: true
  },
  setup (moduleOptions) {
    const logger = useLogger(PACKAGE_NAME)

    if (!moduleOptions.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    // add next middleware
    const handler = resolve(runtimeDir, 'handler')
    addServerHandler({
      middleware: true,
      handler
    })

    // // add composable
    // const composables = resolve(runtimeDir, 'composables')
    // addImportsDir(composables)
  }
})
