import { getRequestURL, joinPathToApiURL, navigateToAuthPages } from './url'
import type { NuxtApp } from '#app/nuxt'
import { callWithNuxt } from '#app/nuxt'

export const navigateToAuthPageWN = (nuxt: NuxtApp, href: string) => callWithNuxt(nuxt, navigateToAuthPages, [href])
export const getRequestURLWN = (nuxt: NuxtApp) => callWithNuxt(nuxt, getRequestURL)
export const joinPathToApiURLWN = (nuxt: NuxtApp, path: string) => callWithNuxt(nuxt, joinPathToApiURL, [path])

export const makeCWN = (func: (...args: any) => unknown) => (nuxt: NuxtApp) => callWithNuxt(nuxt, func)
