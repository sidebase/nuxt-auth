import type { DeepRequired } from 'ts-essentials'
import type { ProviderAuthjs } from './types'
import type { useRuntimeConfig } from '#imports'

export const isProduction = process.env.NODE_ENV === 'production'

// We use `DeepRequired` here because options are actually enriched using `defu`
// but due to a build error we can't use `DeepRequired` inside runtime config definition.
type RuntimeConfig = ReturnType<typeof useRuntimeConfig>
export type ProviderAuthjsResolvedConfig = DeepRequired<ProviderAuthjs>

/**
 * Get the backend configuration from the runtime config in a typed manner.
 *
 * @param runtimeConfig The runtime config of the application
 */
export function useTypedBackendConfig(
  runtimeConfig: RuntimeConfig,
): ProviderAuthjsResolvedConfig {
  return runtimeConfig.public.auth.provider as ProviderAuthjsResolvedConfig
}
