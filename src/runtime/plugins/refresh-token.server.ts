import type { DeepRequired } from 'ts-essentials'
import { _fetch } from '../utils/fetch'
import { jsonPointerGet, objectFromJsonPointer, useTypedBackendConfig } from '../helpers'
import type { ProviderLocalRefresh } from '../types'
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

      const provider = config.provider as DeepRequired<ProviderLocalRefresh>

      const { path, method } = provider.endpoints.refresh
      const refreshRequestTokenPointer = provider.refreshToken.refreshRequestTokenPointer

      // include header in case of auth is required to avoid 403 rejection
      const headers = new Headers({
        [configToken.token.headerName]: token.value
      } as HeadersInit)

      try {
        const response = await _fetch<Record<string, any>>(nuxtApp, path, {
          method,
          body: objectFromJsonPointer(refreshRequestTokenPointer, refreshToken.value),
          headers
        })

        const extractedToken = jsonPointerGet(
          response,
          provider.token.signInResponseTokenPointer
        )
        if (typeof extractedToken !== 'string') {
          console.error(
            `Auth: string token expected, received instead: ${JSON.stringify(
              extractedToken
            )}. Tried to find token at ${
              provider.token.signInResponseTokenPointer
            } in ${JSON.stringify(response)}`
          )
          return
        }

        // check if refereshTokenOnly
        if (!configToken.refreshOnlyToken) {
          const extractedRefreshToken = jsonPointerGet(
            response,
            provider.refreshToken.signInResponseRefreshTokenPointer
          )
          if (typeof extractedRefreshToken !== 'string') {
            console.error(
              `Auth: string token expected, received instead: ${JSON.stringify(
                extractedRefreshToken
              )}. Tried to find token at ${
                provider.refreshToken.signInResponseRefreshTokenPointer
              } in ${JSON.stringify(response)}`
            )
            return
          } else {
            rawRefreshToken.value = extractedRefreshToken
          }
        }

        rawToken.value = extractedToken

        lastRefreshedAt.value = new Date()
      } catch (err) {
        rawRefreshToken.value = null
        rawToken.value = null
      }
    }
  }
})
