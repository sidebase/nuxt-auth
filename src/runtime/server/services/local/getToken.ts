import { getCookie, type H3Event } from 'h3'
import { useTypedBackendConfig } from '../../../helpers'
import { formatToken } from '../../../utils/local'
import { useRuntimeConfig } from '#imports'

export function getToken (event: H3Event) {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  const token = getCookie(event, config.token.cookieName)
  if (!token) {
    return null
  }

  return formatToken(token)
}
