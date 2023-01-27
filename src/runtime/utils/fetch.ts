import { callWithNuxt } from '#app'
import { joinPathToApiURL } from './url'
import { useNuxtApp } from '#imports'

export const _fetch = async <T>(nuxt: ReturnType<typeof useNuxtApp>, path: string, fetchOptions?: Parameters<typeof $fetch>[1]): Promise<T> => {
  const joinedPath = await callWithNuxt(nuxt, () => joinPathToApiURL(path))
  try {
    return $fetch(joinedPath, fetchOptions)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in `nuxt-auth`-app-side data fetching: Have you added the authentication handler server-endpoint `[...].ts`? Have you added the authentication handler in a non-default location (default is `~/server/api/auth/[...].ts`) and not updated the module-setting `auth.basePath`? Error is:')
    // eslint-disable-next-line no-console
    console.error(error)

    throw new Error('Runtime error, checkout the console logs to debug, open an issue at https://github.com/sidebase/nuxt-auth/issues/new/choose if you continue to have this problem')
  }
}
