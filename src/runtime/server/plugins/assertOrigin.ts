import { getServerOrigin, ERROR_MESSAGES } from '../services/nuxtAuthHandler'

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
