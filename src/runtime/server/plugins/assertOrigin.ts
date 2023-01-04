import { getServerOrigin, ERROR_MESSAGES } from '../services/nuxtAuthHandler'
import { defineNitroPlugin } from '#imports'

export default defineNitroPlugin(() => {
  try {
    getServerOrigin()
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(ERROR_MESSAGES.NO_ORIGIN)
    } else {
      throw error
    }
  }
})
