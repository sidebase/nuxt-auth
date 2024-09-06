import type { DeepRequired } from 'ts-essentials'
import { _fetch } from '../utils/fetch'
import { jsonPointerGet, objectFromJsonPointer, useTypedBackendConfig } from '../helpers'
import type { ProviderLocal } from '../types'
import { defineNuxtPlugin, useAuthState, useRuntimeConfig } from '#imports'

export default defineNuxtPlugin({
  name: 'refresh-token-plugin',
  enforce: 'pre',
  async setup(nuxtApp) {
    const { rawToken, rawRefreshToken, refreshToken, token, lastRefreshedAt }
      = useAuthState()

    if (refreshToken.value) {
      const config = nuxtApp.$config.public.auth
      const configToken = useTypedBackendConfig(useRuntimeConfig(), 'local')

      const provider = config.provider as DeepRequired<ProviderLocal>

      const { path, method } = provider.refresh.endpoint
      const refreshRequestTokenPointer = provider.refresh.token.refreshRequestTokenPointer

      const headers = new Headers()

      // To perform the refresh, some backends may require the auth token to also be set.
      if (token.value) {
        headers.set(configToken.token.headerName, token.value)
      }

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
            )}. Tried to find token at ${provider.token.signInResponseTokenPointer
            } in ${JSON.stringify(response)}`
          )
          return
        }

        // check if refreshTokenOnly
        if (!configToken.refresh.refreshOnlyToken) {
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
          else {
            rawRefreshToken.value = extractedRefreshToken
          }
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
