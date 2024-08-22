import { type H3Event, getCookie } from 'h3'
import { useTypedBackendConfig } from '../../../helpers'
import { formatToken } from '../../../utils/local'
import { useRuntimeConfig } from '#imports'

export function getToken(event: H3Event) {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const rawToken = getCookie(event, config.token.cookieName)
  const token = formatToken(rawToken, config)

  if (!token) {
    return null
  }
  return token
}
