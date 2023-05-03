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
            id: 'my-module:client',
            name: 'My Module Client Dev'
          }
        )
      }
    })
  ],
  build: {
    transpile: ['jsonwebtoken']
  },
  auth: {
    provider: {
      type: 'local',
      endpoints: {
        getSession: { path: '/user' }
      },
      pages: {
        login: '/'
      },
      token: {
        signInResponseTokenPointer: '/token/accessToken'
      }
    },
    globalAppMiddleware: {
      isEnabled: false
    }
  }
})
