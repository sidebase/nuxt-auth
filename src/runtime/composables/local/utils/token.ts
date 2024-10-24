import type { ProviderLocalResolvedConfig } from '../../../helpers'

export function formatToken(token: string | null | undefined, config: ProviderLocalResolvedConfig): string | null {
  if (token === null || token === undefined) {
    return null
  }
  return config.token.type.length > 0 ? `${config.token.type} ${token}` : token
}
