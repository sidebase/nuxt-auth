// TODO: This should be merged into `./utils`
import { parseURL } from 'ufo'
import { DeepRequired } from 'ts-essentials'
import { SupportedAuthProviders, AuthProviders } from './types'
import { useRuntimeConfig } from '#imports'

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

/**
 * Get the backend configuration from the runtime config in a typed manner.
 *
 * @param runtimeConfig The runtime config of the application
 * @param type Backend type to be enforced (e.g.: `local`,`refresh` or `authjs`)
 */
export const useTypedBackendConfig = <T extends SupportedAuthProviders>(
  runtimeConfig: ReturnType<typeof useRuntimeConfig>,
  _type: T
): Extract<DeepRequired<AuthProviders>, { type: T }> => {
  return runtimeConfig.public.auth.provider as Extract<
    DeepRequired<AuthProviders>,
    { type: T }
  >
  // TODO: find better solution to throw errors, when using sub-configs
  // throw new Error('RuntimeError: Type must match at this point')
}

/**
 * Get a property from an object following the JSON Pointer spec.
 *
 * RFC / Standard: https://www.rfc-editor.org/rfc/rfc6901
 *
 * Implementation adapted from https://github.com/manuelstofer/json-pointer/blob/931b0f9c7178ca09778087b4b0ac7e4f505620c2/index.js#L48-L59
 *
 * @param obj
 * @param pointer
 */
export const jsonPointerGet = (
  obj: Record<string, any>,
  pointer: string
): string | Record<string, any> => {
  const unescape = (str: string) => str.replace(/~1/g, '/').replace(/~0/g, '~')
  const parse = (pointer: string) => {
    if (pointer === '') {
      return []
    }
    if (pointer.charAt(0) !== '/') {
      throw new Error('Invalid JSON pointer: ' + pointer)
    }
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
