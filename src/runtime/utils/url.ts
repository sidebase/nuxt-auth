import { joinURL, parseURL } from 'ufo'
import { useRuntimeConfig } from '#imports'

const _getBasePath = () => parseURL(useRuntimeConfig().public.auth.url).pathname
export const joinPathToBase = (path: string) => joinURL(_getBasePath(), path)
