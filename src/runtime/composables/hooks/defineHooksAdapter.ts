import type { HooksAdapter } from './types'

export function defineHooksAdapter<SessionDataType = unknown>(hooks: HooksAdapter<SessionDataType>): HooksAdapter<SessionDataType> {
  return hooks
}
