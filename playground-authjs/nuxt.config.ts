import { resolve } from 'path'
import { defineNuxtModule } from '@nuxt/kit'
import { startSubprocess } from '@nuxt/devtools-kit'

export default defineNuxtConfig({
  modules: [
    '../src/module.ts',
    '@nuxt/devtools',
    defineNuxtModule({
      setup (_, nuxt) {
        if (!nuxt.options.dev) {
          return
        }

        startSubprocess(
          {
            command: 'npx',
            args: ['nuxi', 'dev', '--port', '3300'],
            cwd: resolve(__dirname, '../client')
          },
          {
            id: 'nuxt-auth:client',
            name: 'Auth DevTools'
          }
        )
      }
    })
  ],
  auth: {
    provider: {
      type: 'authjs'
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
