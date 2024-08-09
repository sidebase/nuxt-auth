import { getCookie, type H3Event } from 'h3'
import { useRuntimeConfig } from '#app'
import { useTypedBackendConfig } from '../../../helpers'

export function getLocalServerToken (event: H3Event) {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
  return getCookie(event, config.token.cookieName)
}
