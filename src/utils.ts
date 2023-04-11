import { parseURL } from 'ufo'
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
export const useTypedBackendConfig = <T extends SupportedAuthBackends>(config: ReturnType<typeof useRuntimeConfig>, type: T): Extract<AuthBackends, { type: T }> => {
  if (config.auth.backend.type === type) {
    return config.auth.backend as Extract<AuthBackends, { type: T }>
  }
  throw new Error('RuntimeError: Type must match at this point')
}
