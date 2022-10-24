import { defineNuxtConfig } from 'nuxt/config'
import GithubProvider from 'next-auth/providers/github'
import MyModule from '..'

export default defineNuxtConfig({
  modules: [
    MyModule
  ],
  user: {
    isEnabled: true,
    nextAuth: {
      providers: [GithubProvider.default({
        clientId: '6d8a47f9ebd9f1edd1db',
        clientSecret: 'ae712565e3b2be5eb26bfba8e4cfc8025dd64bd8'
      })]
    }
  }
})
