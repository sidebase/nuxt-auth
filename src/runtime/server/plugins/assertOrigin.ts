/**
 * Due to an upstream bug in Nuxt 3 we need to stub the plugin here, track:https://github.com/nuxt/nuxt/issues/18556
 * */
import type { NitroApp } from 'nitropack'
import { getServerOrigin, ERROR_MESSAGES } from '../services/nuxtAuthHandler'

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
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(ERROR_MESSAGES.NO_ORIGIN)
    } else {
      throw error
    }
  }
})
