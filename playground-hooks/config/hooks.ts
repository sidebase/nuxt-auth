import { array, jwt, object, optional, string } from 'zod/mini'
import type { z } from 'zod/mini'

// TODO Export this from the `@sidebase/nuxt-auth' module
import type { HooksAdapter } from '../../src/runtime/composables/hooks/types'

// TODO Export this from module
export function defineHooksAdapter<SessionDataType = unknown>(hooks: HooksAdapter<SessionDataType>): HooksAdapter<SessionDataType> {
  return hooks
}

/** Expected shape of the user object received from `getSession` demo endpoint */
const sessionSchema = object({
  username: string(),
  name: string(),
  picture: optional(string()),
  scope: array(string()),
})
/** Demo user data */
type Session = z.infer<typeof sessionSchema>

/** Expected response shape from `signIn` and `refresh` demo endpoints */
const tokensSchema = object({
  accessToken: jwt(),
  refreshToken: optional(jwt()),
})

/** Expected response shape from `signUp` demo endpoint */
const signUpResponseSchema = object({
  user: sessionSchema,
  tokens: tokensSchema,
})

export default defineHooksAdapter<Session>({
  // Required hooks: `signIn` and `getSession`
  signIn: {
    createRequest(signInData, _authState, _nuxt) {
      // Call `/api/auth/login` with the method of POST
      // and body containing credentials passed to `signIn`
      return {
        path: 'login',
        request: {
          method: 'post',
          body: signInData.credentials,
        }
      }
    },

    onResponse(response, _authState, _nuxt) {
      // Validate the response
      const parsedResponse = tokensSchema.safeParse(response._data)
      if (parsedResponse.success === false) {
        // Returning `false` simply stops `signIn` execution,
        // you can also throw an error depending on your usecase.
        logError('Received wrong response from signIn', parsedResponse.error)
        return false
      }

      return {
        token: parsedResponse.data.accessToken,
        refreshToken: parsedResponse.data.refreshToken,
        // You may also return the session directly if your backend
        // additionally returns user data on `signIn` call.
        // session: {},
      }
    },
  },

  getSession: {
    createRequest(_getSessionOptions, authState, _nuxt) {
      // Avoid calling `getSession` if no access token is present
      if (authState.token.value === null) {
        return false
      }

      // Call `/api/auth/user` with the method of GET
      // and access token added to `Authorization` header
      return {
        path: 'user',
        request: {
          method: 'get',
          headers: {
            Authorization: `Bearer ${authState.token.value}`,
          },
        }
      }
    },

    onResponse(response, _authState, _nuxt) {
      // Validate the response
      const parsedResponse = sessionSchema.safeParse(response._data)
      if (parsedResponse.success === false) {
        // Returning `false` simply stops `getSession` execution,
        // you can also throw an error depending on your usecase.
        logError('Received wrong response from getSession', parsedResponse.error)
        return false
      }

      return {
        session: parsedResponse.data,
        // You may also return the tokens if your backend
        // additionally returns tokens on `getSession` call.
        // token: '',
        // refreshToken: '',
      }
    }
  },

  // Optional hooks
  signUp: {
    createRequest(signUpData, _authState, _nuxt) {
      // Call `/api/auth/signup` with the method of POST,
      // and credentials added to body
      return {
        path: 'signup',
        request: {
          method: 'post',
          body: signUpData.credentials,
        }
      }
    },

    onResponse(response, _authState, _nuxt) {
      // Validate the response
      const parsedResponse = signUpResponseSchema.safeParse(response._data)
      if (parsedResponse.success === false) {
        // Returning `false` simply stops `signUp` execution,
        // you can also throw an error depending on your usecase.
        logError('Received wrong response from signUp', parsedResponse.error)
        return false
      }

      return {
        token: parsedResponse.data.tokens.accessToken,
        refreshToken: parsedResponse.data.tokens.refreshToken,
        session: parsedResponse.data.user,
      }
    },
  },

  refresh: {
    createRequest(_getSessionOptions, authState, _nuxt) {
      // Our demo backend requires both access and refresh tokens
      // for the `refresh` call. If at least one of the tokens is
      // not present, we reset authentication state and avoid calling `refresh`.
      // Note that your implementation may differ.
      if (authState.token.value === null || authState.refreshToken.value === null) {
        authState.token.value = null
        authState.refreshToken.value = null
        authState.data.value = null
        return false
      }

      // Call `/api/auth/refresh` with the method of POST,
      // access token added to `Authorization` header
      // and refresh token added to body
      return {
        path: 'refresh',
        request: {
          method: 'post',
          headers: {
            Authorization: `Bearer ${authState.token.value}`,
          },
          body: {
            refreshToken: authState.refreshToken.value,
          },
        }
      }
    },

    onResponse(response, _authState, _nuxt) {
      // Validate the response
      // Note: for convenience purposes this demo was setup to return the same shape from
      // `refresh` as from `signIn`
      const parsedResponse = tokensSchema.safeParse(response._data)
      if (parsedResponse.success === false) {
        // Returning `false` simply stops `signIn` execution,
        // you can also throw an error depending on your usecase.
        logError('Received wrong response from refresh', parsedResponse.error)
        return false
      }

      return {
        token: parsedResponse.data.accessToken,
        refreshToken: parsedResponse.data.refreshToken,
        // You may also return the session directly if your backend
        // additionally returns user data on `refresh` call.
        // session: {},
      }
    },
  },

  signOut: {
    createRequest(_signOutOptions, authState, _nuxt) {
      // Avoid calling `signOut` if either access or refresh token is not present,
      // reset the authentication state manually
      if (authState.token.value === null || authState.refreshToken.value === null) {
        authState.token.value = null
        authState.refreshToken.value = null
        authState.data.value = null
        return false
      }

      // Call `/api/auth/logout` with the method of POST,
      // access token added to `Authorization` header
      // and refresh token added to body
      return {
        path: 'logout',
        request: {
          method: 'post',
          headers: {
            Authorization: `Bearer ${authState.token.value}`,
          },
          body: {
            refreshToken: authState.refreshToken.value,
          },
        }
      }
    },

    onResponse(_response, _authState, _nuxt) {
      // Return `undefined` to reset the authentication state
      return undefined
    },
  },
})

function logError(...args: unknown[]) {
  import.meta.dev && console.error(...args)
}
