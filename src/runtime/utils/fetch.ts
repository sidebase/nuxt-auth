import type { FetchOptions } from 'ofetch'
import { joinPathToBase } from './url'

export const _fetch = <T>(path: string, fetchOptions?: FetchOptions): Promise<T> => {
  try {
    return $fetch(joinPathToBase(path), fetchOptions)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in useSession data fetching: Have you added the authentication handler server-endpoint `[...].ts`? Have you added the authentication handler in a non-default location (default is `~/server/api/auth/[...].ts`) and not updated the module-setting `auth.basePath`? Error is:')
    // eslint-disable-next-line no-console
    console.error(error)

    throw new Error('Runtime error, checkout the console logs to debug, open an issue at https://github.com/sidebase/nuxt-auth/issues/new/choose if you continue to have this problem')
  }
}
