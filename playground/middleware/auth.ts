import { defineNuxtRouteMiddleware } from '#app'
import useSession from '~/composables/useSession'

export default defineNuxtRouteMiddleware(async () => {
  console.info('in named middleware! protecting secrets')
  await useSession()
})
