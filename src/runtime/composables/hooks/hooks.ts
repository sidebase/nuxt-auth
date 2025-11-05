import type { HooksAdapter } from './types'

export function defineHooksAdapter<SessionDataType = unknown>(hooks: HooksAdapter<SessionDataType>): HooksAdapter<SessionDataType> {
  return hooks
}

interface Session {
  // Data of users returned by `getSession` endpoint
}

export default defineHooksAdapter<Session>({
  signIn: {
    createRequest(credentials, authState, nuxt) {
      // todo

      return {
        path: '',
        request: {
          body: credentials,
        }
      }
    },

    onResponse(response, authState, nuxt) {
      // Possible return values:
      // - false - skip any further logic (useful when onResponse handles everything);
      // - {} - skip assigning tokens and session, but still possibly call getSession and redirect
      // - { token: string } - assign token and continue as normal;
      // - { token: string, session: object } - assign token, skip calling getSession, but do possibly call redirect;

      // todo
      return {

      }
    },
  },

  getSession: {
    createRequest(data, authState, nuxt) {
      // todo

      return {
        path: '',
        request: {}
      }
    },

    onResponse(response, authState, nuxt) {
      return response._data as Session
    }
  },

  // signOut: {
  //
  // }
})

