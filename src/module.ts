import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineNuxtModule, useLogger, addServerHandler, addImportsDir } from '@nuxt/kit'
import nextAuth from 'next-auth'

export interface ModuleOptions {
  isEnabled: boolean
  nextAuth: {
    providers: any
  }
}

const PACKAGE_NAME = 'nuxt-user'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PACKAGE_NAME,
    configKey: 'user'
  },
  defaults: {
    isEnabled: true,
    nextAuth: {
      providers: []
    }
  },
  setup (moduleOptions) {
    const logger = useLogger(PACKAGE_NAME)

    if (!moduleOptions.isEnabled) {
      logger.info(`Skipping ${PACKAGE_NAME} setup, as module is disabled`)
      return
    }
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    // 1. Add NextAuth.js API endpoints
    const handler = resolve(runtimeDir, 'server/api/auth')
    addServerHandler({
      handler,
      middleware: true
    })

    // 2. Add nuxt-user composables
    const composables = resolve(runtimeDir, 'composables')
    addImportsDir(composables)
  }
})
