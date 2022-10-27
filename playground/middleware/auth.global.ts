import { defineNuxtRouteMiddleware } from '#app'
import { useSession } from '#imports'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/protected/globally') {
    return
  }

  console.info('in global middleware! protecting secrets')
  await useSession({ callbackUrl: to.path })
})
