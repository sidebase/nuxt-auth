import { readonly } from 'vue'
import { callWithNuxt, useCookie } from '#app'
import { CommonUseAuthReturn, SignOutFunc, SignInFunc, GetSessionFunc, SecondarySignInOptions } from '../../types'
import { _fetch } from '../../utils/fetch'
import { useTypedBackendConfig } from '../../helpers'
import { getRequestURLWN } from '../../utils/callWithNuxt'
import { useAuthState } from './useAuthState'
// @ts-expect-error - #auth not defined
import type { SessionData } from '#auth'
import { useNuxtApp, useRuntimeConfig, nextTick, navigateTo } from '#imports'

type Credentials = { username?: string, email?: string, password?: string } & Record<string, any>

const isExternalUrl = (url: string) => {
  return !!(url && url.startsWith('http'))
}

const signIn: SignInFunc<Credentials, any> = async (credentials, signInOptions, signInParams) => {
  const nuxt = useNuxtApp()

  const config = useTypedBackendConfig(useRuntimeConfig(), 'cookie')
  const { path, method } = config.endpoints.signIn
  await _fetch<Record<string, any>>(nuxt, path, {
    method,
    body: {
      ...credentials,
      ...(signInOptions ?? {})
    },
    params: signInParams ?? {}
  })

  await nextTick(getSession)

  const { callbackUrl, redirect = true } = signInOptions ?? {}
  if (redirect) {
    const urlToNavigateTo = callbackUrl ?? await getRequestURLWN(nuxt)
    return navigateTo(urlToNavigateTo, { external: isExternalUrl(urlToNavigateTo) })
  }
}

const signOut: SignOutFunc = async (signOutOptions) => {
  const nuxt = useNuxtApp()
  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const config = useTypedBackendConfig(runtimeConfig, 'cookie')
  const { data } = await callWithNuxt(nuxt, useAuthState)

  data.value = null

  const { path, method } = config.endpoints.signOut

  const res = await _fetch(nuxt, path, { method })

  const { callbackUrl, redirect = true } = signOutOptions ?? {}
  if (redirect) {
    const urlToNavigateTo = callbackUrl ?? await getRequestURLWN(nuxt)
    await navigateTo(urlToNavigateTo, { external: isExternalUrl(urlToNavigateTo) })
  }

  return res
}

const getSession: GetSessionFunc<SessionData | null | void> = async (getSessionOptions) => {
  const nuxt = useNuxtApp()

  const config = useTypedBackendConfig(useRuntimeConfig(), 'cookie')
  const { path, method } = config.endpoints.getSession
  const { data, loading, lastRefreshedAt } = useAuthState()

  const cookie = useCookie(config.cookie.name)

  loading.value = true
  try {
    let headers = { }
    if (cookie.value) {
      headers = { credentials: 'include', Cookie: `${config.cookie.name}=${cookie.value}` }
    }
    data.value = await _fetch<SessionData>(nuxt, path, { method, headers })
  } catch (e) {
    // Clear all data: Request failed so we must not be authenticated
    data.value = null
  }
  loading.value = false
  lastRefreshedAt.value = new Date()

  const { required = false, callbackUrl, onUnauthenticated } = getSessionOptions ?? {}
  if (required && data.value === null) {
    if (onUnauthenticated) {
      return onUnauthenticated()
    } else {
      const urlToNavigateTo = callbackUrl ?? await getRequestURLWN(nuxt)
      await navigateTo(urlToNavigateTo, { external: isExternalUrl(urlToNavigateTo) })
    }
  }

  return data.value
}

const signUp = async (credentials: Credentials, signInOptions?: SecondarySignInOptions) => {
  const nuxt = useNuxtApp()

  const { path, method } = useTypedBackendConfig(useRuntimeConfig(), 'cookie').endpoints.signUp
  await _fetch(nuxt, path, {
    method,
    body: credentials
  })

  return signIn(credentials, signInOptions)
}

interface UseAuthReturn extends CommonUseAuthReturn<typeof signIn, typeof signOut, typeof getSession, SessionData> {
  signUp: typeof signUp
}
export const useAuth = (): UseAuthReturn => {
  const {
    data,
    status,
    lastRefreshedAt
  } = useAuthState()

  const getters = {
    status,
    data: readonly(data),
    lastRefreshedAt: readonly(lastRefreshedAt)
  }

  const actions = {
    getSession,
    signIn,
    signOut,
    signUp
  }

  return {
    ...getters,
    ...actions
  }
}
