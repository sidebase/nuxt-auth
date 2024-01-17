import { _fetch } from '../utils/fetch'
import { jsonPointerGet, useTypedBackendConfig } from '../helpers'
import { defineNuxtPlugin, useAuthState, useRuntimeConfig } from '#imports'
export default defineNuxtPlugin({
  name: 'refresh-token-plugin',
  enforce: 'pre',
  async setup (nuxtApp) {
    const { rawToken, rawRefreshToken, refreshToken, token, lastRefreshedAt } =
      useAuthState()

    if (refreshToken.value && token.value) {
      const config = nuxtApp.$config.public.auth
      const configToken = useTypedBackendConfig(useRuntimeConfig(), 'refresh')

      const { path, method } = config.provider.endpoints.refresh

      // include header in case of auth is required to avoid 403 rejection
      const headers = new Headers({
        [configToken.token.headerName]: token.value
      } as HeadersInit)

      const response = await _fetch<Record<string, any>>(nuxtApp, path, {
        method,
        body: {
          refreshToken: refreshToken.value
        },
        headers
      })

      const extractedToken = jsonPointerGet(
        response,
        config.provider.token.signInResponseTokenPointer
      )
      if (typeof extractedToken !== 'string') {
        console.error(
          `Auth: string token expected, received instead: ${JSON.stringify(
            extractedToken
          )}. Tried to find token at ${
            config.token.signInResponseTokenPointer
          } in ${JSON.stringify(response)}`
        )
        return
      }

      // check if refereshTokenOnly
      if (!configToken.refreshOnlyToken) {
        const extractedRefreshToken = jsonPointerGet(
          response,
          config.provider.refreshToken.signInResponseRefreshTokenPointer
        )
        if (typeof extractedRefreshToken !== 'string') {
          console.error(
            `Auth: string token expected, received instead: ${JSON.stringify(
              extractedRefreshToken
            )}. Tried to find token at ${
              config.refreshToken.signInResponseRefreshTokenPointer
            } in ${JSON.stringify(response)}`
          )
          return
        } else {
          rawRefreshToken.value = extractedRefreshToken
        }
      }

      rawToken.value = extractedToken

      lastRefreshedAt.value = new Date()
    }
  }
})
