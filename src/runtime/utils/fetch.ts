import { resolveApiUrlPath } from './url'
import { ERROR_PREFIX } from './logger'
import { callWithNuxt, useRuntimeConfig } from '#app'
import type { useNuxtApp } from '#imports'

export async function _fetch<T>(nuxt: ReturnType<typeof useNuxtApp>, path: string, fetchOptions?: Parameters<typeof $fetch>[1]): Promise<T> {
  const runtimeConfig = await callWithNuxt(nuxt, useRuntimeConfig)
  const joinedPath = resolveApiUrlPath(path, runtimeConfig)

  // Prevent callback recursion when doing internal routing
  if (runtimeConfig.public.auth.disableInternalRouting === false) {
    const currentPath = nuxt.ssrContext?.event?.path
    if (currentPath?.startsWith(joinedPath)) {
      console.error(`${ERROR_PREFIX} Recursion detected at ${joinedPath}. Have you set the correct \`auth.baseURL\`?`)
      throw new FetchConfigurationError('Server configuration error')
    }
  }

  try {
    return $fetch(joinedPath, fetchOptions)
  }
  catch (error) {
    let errorMessage = `${ERROR_PREFIX} Error while requesting ${joinedPath}.`
    if (runtimeConfig.public.auth.provider.type === 'authjs') {
      errorMessage += ' Have you added the authentication handler server-endpoint `[...].ts`? Have you added the authentication handler in a non-default location (default is `~/server/api/auth/[...].ts`) and not updated the module-setting `auth.basePath`?'
    }
    errorMessage += ' Error is:'
    console.error(errorMessage)
    console.error(error)

    throw new FetchConfigurationError(
      'Runtime error, check the console logs to debug, open an issue at https://github.com/sidebase/nuxt-auth/issues/new/choose if you continue to have this problem'
    )
  }
}

export class FetchConfigurationError extends Error {}
