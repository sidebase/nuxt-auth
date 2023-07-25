/**
 * Due to an upstream bug in Nuxt 3 we need to stub the plugin here, track: https://github.com/nuxt/nuxt/issues/18556
 * */
import type { NitroApp } from 'nitropack'
import { ERROR_MESSAGES } from '../services/errors'
import { isProduction } from '../../helpers'
import { getServerOrigin } from '../services/utils'

// type stub
type NitroAppPlugin = (nitro: NitroApp) => void

function defineNitroPlugin (def: NitroAppPlugin): NitroAppPlugin {
  return def
}

// Export runtime plugin
export default defineNitroPlugin(() => {
  try {
    getServerOrigin()
  } catch (error) {
    if (!isProduction) {
      console.info(ERROR_MESSAGES.NO_ORIGIN)
    } else {
      throw error
    }
  }
})
