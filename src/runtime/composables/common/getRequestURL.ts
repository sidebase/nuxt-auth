import getURL from 'requrl'
import { callWithNuxt, useRequestEvent } from '#app'
import type { NuxtApp } from '#app'

export function getRequestURL(includePath = true) {
  return getURL(useRequestEvent()?.node.req, includePath)
}

export function getRequestURLWN(nuxt: NuxtApp) {
  return callWithNuxt(nuxt, getRequestURL)
}
