import { parseURL } from 'ufo'
import { DeepRequired } from 'ts-essentials'
import { SupportedAuthBackends, AuthBackends } from './types'

export const isProduction = process.env.NODE_ENV === 'production'

export const getOriginAndPathnameFromURL = (url: string) => {
  const { protocol, host, pathname } = parseURL(url)

  let origin
  if (host && protocol) {
    origin = `${protocol}//${host}`
  }

  const pathname_ = pathname.length > 0 ? pathname : undefined
  return {
    origin,
    pathname: pathname_
  }
}

// TODO: Wrtie docstring
export const useTypedBackendConfig = <T extends SupportedAuthBackends>(config: ReturnType<typeof useRuntimeConfig>, type: T): Extract<DeepRequired<AuthBackends>, { type: T }> => {
  if (config.auth.backend.type === type) {
    return config.auth.backend as Extract<DeepRequired<AuthBackends>, { type: T }>
  }
  throw new Error('RuntimeError: Type must match at this point')
}

/**
 * TODO: Write docstring
 *
 * Adapted from https://github.com/manuelstofer/json-pointer/blob/931b0f9c7178ca09778087b4b0ac7e4f505620c2/index.js#L48-L59
 *
 * @param obj
 * @param path
 */
export const jsonPointerGet = (obj: Record<string, any>, pointer: string): string | Record<string, any> => {
  const unescape = (str: string) => str.replace(/~1/g, '/').replace(/~0/g, '~')
  const parse = (pointer: string) => {
    if (pointer === '') { return [] }
    if (pointer.charAt(0) !== '/') { throw new Error('Invalid JSON pointer: ' + pointer) }
    return pointer.substring(1).split(/\//).map(unescape)
  }

  const refTokens = Array.isArray(pointer) ? pointer : parse(pointer)

  for (let i = 0; i < refTokens.length; ++i) {
    const tok = refTokens[i]
    if (!(typeof obj === 'object' && tok in obj)) {
      throw new Error('Invalid reference token: ' + tok)
    }
    obj = obj[tok]
  }
  return obj
}
