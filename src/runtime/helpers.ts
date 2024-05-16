// TODO: This should be merged into `./utils`
import { parseURL } from 'ufo'
import type { DeepRequired } from 'ts-essentials'
import type { SupportedAuthProviders, AuthProviders } from './types'
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
export function jsonPointerGet (
  obj: Record<string, any>,
  pointer: string
): string | Record<string, any> {
  const refTokens = Array.isArray(pointer) ? pointer : jsonPointerParse(pointer)

  for (let i = 0; i < refTokens.length; ++i) {
    const tok = refTokens[i]
    if (!(typeof obj === 'object' && tok in obj)) {
      throw new Error('Invalid reference token: ' + tok)
    }
    obj = obj[tok]
  }
  return obj
}

/**
 * Sets a value on an object
 *
 * RFC / Standard: https://www.rfc-editor.org/rfc/rfc6901
 *
 * Adapted from https://github.com/manuelstofer/json-pointer/blob/931b0f9c7178ca09778087b4b0ac7e4f505620c2/index.js#L68-L103
 */
export function jsonPointerSet (
  obj: Record<string, any>,
  pointer: string | string[],
  value: any
) {
  const refTokens = Array.isArray(pointer) ? pointer : jsonPointerParse(pointer)
  let nextTok: string | number = refTokens[0]

  if (refTokens.length === 0) {
    throw new Error('Can not set the root object')
  }

  for (let i = 0; i < refTokens.length - 1; ++i) {
    let tok: string | number = refTokens[i]
    if (typeof tok !== 'string' && typeof tok !== 'number') {
      tok = String(tok)
    }
    if (tok === '__proto__' || tok === 'constructor' || tok === 'prototype') {
      continue
    }
    if (tok === '-' && Array.isArray(obj)) {
      tok = obj.length
    }
    nextTok = refTokens[i + 1]

    if (!(tok in obj)) {
      if (nextTok.match(/^(\d+|-)$/)) {
        obj[tok] = []
      } else {
        obj[tok] = {}
      }
    }
    obj = obj[tok]
  }
  if (nextTok === '-' && Array.isArray(obj)) {
    nextTok = obj.length
  }
  obj[nextTok] = value
}

/**
 * Creates an object from a value and a pointer.
 * This is equivalent to calling `jsonPointerSet` on an empty object.
 * @returns {Record<string, any>} An object with a value set at an arbitrary pointer.
 * @example objectFromJsonPointer('/refresh', 'someToken') // { refresh: 'someToken' }
 */
export function objectFromJsonPointer (pointer: string | string[], value: any): Record<string, any> {
  const result = {}
  jsonPointerSet(result, pointer, value)
  return result
}

/**
 * Converts a json pointer into a array of reference tokens
 *
 * Adapted from https://github.com/manuelstofer/json-pointer/blob/931b0f9c7178ca09778087b4b0ac7e4f505620c2/index.js#L217-L221
 */
function jsonPointerParse (pointer: string): string[] {
  if (pointer === '') {
    return []
  }
  if (pointer.charAt(0) !== '/') {
    throw new Error('Invalid JSON pointer: ' + pointer)
  }
  return pointer.substring(1).split(/\//).map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))
}
