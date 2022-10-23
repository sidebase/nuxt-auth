import type { Session } from 'next-auth'
import { ref } from 'vue'
import { useFetch, createError } from '#app'
import { nanoid } from 'nanoid'

interface UseSessionOptions {
  required?: boolean
  onUnauthenticated?: () => void
}

interface SessionContextNoSession {
  data: null
  status: 'unauthenticated' | 'loading'
}
interface SessionContextSession {
  data: Session
  status: 'authenticated'
}
type SessionContext = SessionContextNoSession | SessionContextSession

// TODO: Use better type /' config for path, and ofr everything
interface FetchOptions {
  params?: Record<string, string>
  method?: string
  controls?: boolean
  headers?: Record<string, string>
  body?: any
}

const _fetch = (path: string, { body, params, controls, method, headers }: FetchOptions = { body: undefined, params: {}, controls: false, headers: {}, method: 'GET' }) => {
  // TODO: Use nextAuthClientConfig
  const result = useFetch(`/api/auth/${path}`, {
    method,
    params,
    headers,
    body,
    server: false,
    // todo: see if there's an alternative to this
    key: nanoid()
  })

  if (controls) {
    return result
  }

  return result.data
}

const defaultOnUnauthenticated = () => {
  if (process?.server) {
    return
  }
  const url = '/api/auth/signin'
  window.location.href = url
}

export default async ({ required, onUnauthenticated }: UseSessionOptions = { required: true, onUnauthenticated: defaultOnUnauthenticated }) => {
  const session = ref(null)
  const signIn = () => defaultOnUnauthenticated()
  // TODO: add callback url https://github.com/nextauthjs/next-auth/blob/main/packages/next-auth/src/react/index.tsx#L284
  const signOut = async () => {
    const csrfToken = await getCsrfToken({ controls: true })
    console.log('in signout', csrfToken.data.value.csrfToken)
    if (!csrfToken) {
      throw createError({ statusCode: 400, statusMessage: 'Could not fetch CSRF Token for signing out' })
    }

    const body = new URLSearchParams({
    // @ts-ignore TODO Better type the return of `_fetch`
      csrfToken: csrfToken.data.value.csrfToken as string,
      callbackUrl: window.location.href,
      json: 'true'
    })

    // @ts-ignore TODO Better type the return of `_fetch`
    const { data } = await _fetch('signout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })
    console.log(data.value)

    // TODO: Redirect if necesseray, see https://github.com/nextauthjs/next-auth/blob/4dbbe5b2d9806353b30a868f7e728b018afeb90b/packages/next-auth/src/react/index.tsx#L303-L310

    session.value = null

    return data
  }

  const getCsrfToken = ({ controls }: { controls: boolean} = { controls: false }) => _fetch('csrf', { controls })
  const getProviders = ({ controls }: { controls: boolean} = { controls: false }) => _fetch('providers', { controls })

  if (required && process.client) {
    await useFetch('/api/auth/session', {
      server: false,
      onResponse ({ response }) {
        const data = response._data

        session.value = response._data
        // TODO: This check should probably be different and use value
        if (!session.value) {
          onUnauthenticated ? onUnauthenticated() : signIn()
        }

        return data
      }
    })
  }

  return {
    session,
    signIn,
    getCsrfToken,
    getProviders,
    signOut
  }
}
