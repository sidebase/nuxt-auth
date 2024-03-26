import { useTypedBackendConfig } from '../helpers'
import { useRuntimeConfig } from '#imports'

export const formatToken = (token: string | null) => {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')

  if (token === null) {
    return null
  }
  return config.token.type.length > 0 ? `${config.token.type} ${token}` : token
}
