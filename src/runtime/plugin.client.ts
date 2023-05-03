import { defineNuxtPlugin } from 'nuxt/app'
import { useAuth } from './composables/local/useAuth'

export default defineNuxtPlugin(() => {
  const auth = useAuth()
  return {
    provide: {
      auth
    }
  }
})
