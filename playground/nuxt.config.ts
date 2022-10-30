import { defineNuxtConfig } from 'nuxt/config'
import GithubProvider from 'next-auth/providers/github'
import NuxtAuth from '..'

export default defineNuxtConfig({
  modules: [
    NuxtAuth
  ],
  auth: {
    nextAuth: {
      options: {
        providers: [GithubProvider({
          clientId: 'enter-your-client-id-here',
          clientSecret: 'enter-your-client-secret-here'
        })]
      }
    }
  }
})
