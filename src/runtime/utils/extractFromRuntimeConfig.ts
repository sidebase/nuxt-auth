import { camelCase } from 'scule'
import type { useRuntimeConfig } from '#imports'

type RuntimeConfig = ReturnType<typeof useRuntimeConfig>

export function extractFromRuntimeConfig(config: RuntimeConfig, envVariableName: string): string | undefined {
  let normalized = envVariableName.startsWith('NUXT_')
    ? envVariableName.slice(5)
    : envVariableName
  normalized = camelCase(normalized, { normalize: true })

  const extracted = config[normalized]
  return typeof extracted === 'string'
    ? extracted
    : undefined
}
