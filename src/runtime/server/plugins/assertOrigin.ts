import { getServerOrigin, ERROR_MESSAGES } from '../services/nuxtAuthHandler'

// `#imports` is defined within the nuxt-app but for some reason not picked up in the server-plugins
// eslint-disable-next-line import/named
import { defineNitroPlugin } from '#imports'

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
