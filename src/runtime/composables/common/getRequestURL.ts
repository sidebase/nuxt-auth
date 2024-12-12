import getURL from 'requrl'
import { type NuxtApp, callWithNuxt, useRequestEvent } from '#app'

export function getRequestURL(includePath = true) {
  return getURL(useRequestEvent()?.node.req, includePath)
}

export function getRequestURLWN(nuxt: NuxtApp) {
  return callWithNuxt(nuxt, getRequestURL)
}
