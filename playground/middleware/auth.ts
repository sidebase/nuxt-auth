import { defineNuxtRouteMiddleware } from '#app'
import { useSession } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  console.info('in named middleware! protecting secrets')
  await useSession({ callbackUrl: to.path })
})
