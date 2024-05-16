import type { Ref } from 'vue'
import { callWithNuxt } from '#app'
import { jsonPointerGet, objectFromJsonPointer, useTypedBackendConfig } from '../../helpers'
import { useAuth as useLocalAuth } from '../local/useAuth'
import { _fetch } from '../../utils/fetch'
import { getRequestURLWN } from '../../utils/callWithNuxt'
import type { SignOutFunc } from '../../types'
import { useAuthState } from './useAuthState'
import {
  navigateTo,
  nextTick,
  readonly,
  useNuxtApp,
  useRuntimeConfig
} from '#imports'

const signIn: ReturnType<typeof useLocalAuth>['signIn'] = async (
  credentials,
  signInOptions,
  signInParams
) => {
  const nuxt = useNuxtApp()
  const { getSession } = useLocalAuth()
  const config = useTypedBackendConfig(useRuntimeConfig(), 'refresh')
  const { path, method } = config.endpoints.signIn
  const response = await _fetch<Record<string, any>>(nuxt, path, {
    method,
    body: {
      ...credentials,
      ...(signInOptions ?? {})
    },
    params: signInParams ?? {}
  })

  const extractedToken = jsonPointerGet(
    response,
    config.token.signInResponseTokenPointer
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

  const extractedRefreshToken = jsonPointerGet(
    response,
    config.refreshToken.signInResponseRefreshTokenPointer
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
  }

  const { rawToken, rawRefreshToken } = useAuthState()
  rawToken.value = extractedToken
  rawRefreshToken.value = extractedRefreshToken

  await nextTick(getSession)

  const { callbackUrl, redirect = true } = signInOptions ?? {}
  if (redirect) {
    const urlToNavigateTo = callbackUrl ?? (await getRequestURLWN(nuxt))
    return navigateTo(urlToNavigateTo)
  }
}

const refresh = async () => {
  const nuxt = useNuxtApp()
  const config = useTypedBackendConfig(useRuntimeConfig(), 'refresh')
  const { path, method } = config.endpoints.refresh
  const refreshRequestTokenPointer = config.refreshToken.refreshRequestTokenPointer

  const { getSession } = useLocalAuth()
  const { refreshToken, token, rawToken, rawRefreshToken, lastRefreshedAt } =
    useAuthState()

  const headers = new Headers({
    [config.token.headerName]: token.value
  } as HeadersInit)

  const response = await _fetch<Record<string, any>>(nuxt, path, {
    method,
    headers,
    body: objectFromJsonPointer(refreshRequestTokenPointer, refreshToken.value)
  })

  const extractedToken = jsonPointerGet(
    response,
    config.token.signInResponseTokenPointer
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

  if (!config.refreshOnlyToken) {
    const extractedRefreshToken = jsonPointerGet(
      response,
      config.refreshToken.signInResponseRefreshTokenPointer
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

  await nextTick(getSession)
}

const signOut: SignOutFunc = async (signOutOptions) => {
  const nuxt = useNuxtApp()
  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const config = useTypedBackendConfig(runtimeConfig, 'refresh')
  const { data, rawToken, token, rawRefreshToken } = await callWithNuxt(
    nuxt,
    useAuthState
  )

  const headers = new Headers({
    [config.token.headerName]: token.value
  } as HeadersInit)
  data.value = null
  rawToken.value = null
  rawRefreshToken.value = null

  const signOutConfig = config.endpoints.signOut
  let res

  if (signOutConfig) {
    const { path, method } = config.endpoints.signOut as {
      path: string;
      method:
        | 'get'
        | 'head'
        | 'patch'
        | 'post'
        | 'put'
        | 'delete'
        | 'connect'
        | 'options'
        | 'trace';
    }
    res = await _fetch(nuxt, path, { method, headers })
  }

  const { callbackUrl, redirect = true } = signOutOptions ?? {}
  if (redirect) {
    await navigateTo(callbackUrl ?? (await getRequestURLWN(nuxt)))
  }

  return res
}

type UseAuthReturn = ReturnType<typeof useLocalAuth> & {
  refreshToken: Readonly<Ref<string | null>>;
  refresh: () => ReturnType<typeof refresh>;
};

export const useAuth = (): UseAuthReturn => {
  const localAuth = useLocalAuth()
  // overwrite the local signIn & signOut Function
  localAuth.signIn = signIn
  localAuth.signOut = signOut

  const { refreshToken } = useAuthState()

  return {
    ...localAuth,
    refreshToken: readonly(refreshToken),
    refresh
  }
}
