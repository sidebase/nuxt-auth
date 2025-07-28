/**
 * Due to an upstream bug in Nuxt 4 we need to stub the plugin here, track: https://github.com/nuxt/nuxt/issues/18556
 */
import type { NitroApp } from 'nitropack/types'
import { ERROR_MESSAGES } from '../services/errors'
import { isProduction, useTypedBackendConfig } from '../../helpers'
import { getServerBaseUrl } from '../services/authjs/utils'
import { useRuntimeConfig } from '#imports'

// type stub
type NitroAppPlugin = (nitro: NitroApp) => void

function defineNitroPlugin(def: NitroAppPlugin): NitroAppPlugin {
  return def
}

// Export runtime plugin
export default defineNitroPlugin(() => {
  try {
    const runtimeConfig = useRuntimeConfig()
    const trustHostUserPreference = useTypedBackendConfig(runtimeConfig, 'authjs').trustHost
    getServerBaseUrl(runtimeConfig, false, trustHostUserPreference, isProduction)
  }
  catch (error) {
    if (!isProduction) {
      console.info(ERROR_MESSAGES.NO_ORIGIN)
    }
    else {
      throw error
    }
  }
})
