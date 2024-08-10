import { getCookie, type H3Event } from 'h3'
import { useTypedBackendConfig } from '../../../helpers'
import { useRuntimeConfig } from '#imports'

export function getRefreshToken (event: H3Event) {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'refresh')
  const token = getCookie(event, config.refreshToken.cookieName)
  if (!token) {
    return null
  }

  return token
}
