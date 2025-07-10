import { _fetch } from '../utils/fetch'
import { jsonPointerGet, objectFromJsonPointer, useTypedBackendConfig } from '../helpers'
import { defineNuxtPlugin, useAuthState, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin({
  name: 'refresh-token-plugin',
  enforce: 'pre',
  async setup(nuxtApp) {
    const { rawToken, rawRefreshToken, refreshToken, token, lastRefreshedAt }
      = useAuthState()

    if (refreshToken.value && token.value) {
      const provider = useTypedBackendConfig(useRuntimeConfig(), 'local')

      const { path, method } = provider.refresh.endpoint
      const refreshRequestTokenPointer = provider.refresh.token.refreshRequestTokenPointer

      // include header in case of auth is required to avoid 403 rejection
      const headers = new Headers({
        [provider.token.headerName]: token.value
      } as HeadersInit)

      try {
        const response = await _fetch<Record<string, any>>(nuxtApp, path, {
          method,
          body: objectFromJsonPointer(refreshRequestTokenPointer, refreshToken.value),
          headers
        })

        const tokenPointer = provider.refresh.token.refreshResponseTokenPointer || provider.token.signInResponseTokenPointer
        const extractedToken = jsonPointerGet(
          response,
          tokenPointer
        )
        if (typeof extractedToken !== 'string') {
          console.error(
            `Auth: string token expected, received instead: ${JSON.stringify(
              extractedToken
            )}. Tried to find token at ${tokenPointer
            } in ${JSON.stringify(response)}`
          )
          return
        }

        // check if refreshTokenOnly
        if (!provider.refresh.refreshOnlyToken) {
          const extractedRefreshToken = jsonPointerGet(
            response,
            provider.refresh.token.signInResponseRefreshTokenPointer
          )
          if (typeof extractedRefreshToken !== 'string') {
            console.error(
              `Auth: string token expected, received instead: ${JSON.stringify(
                extractedRefreshToken
              )}. Tried to find token at ${provider.refresh.token.signInResponseRefreshTokenPointer
              } in ${JSON.stringify(response)}`
            )
            return
          }
          rawRefreshToken.value = extractedRefreshToken
        }

        rawToken.value = extractedToken

        lastRefreshedAt.value = new Date()
      }
      catch (err) {
        console.error(err)
        rawRefreshToken.value = null
        rawToken.value = null
      }
    }
  }
})
