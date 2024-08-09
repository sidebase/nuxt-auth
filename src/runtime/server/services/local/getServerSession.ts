import type { H3Event } from 'h3'
import { useRuntimeConfig } from '#app'
import { useTypedBackendConfig } from '../../../helpers'

export function getServerSession (event: H3Event) {
  const config = useTypedBackendConfig(useRuntimeConfig(), 'local')
}
