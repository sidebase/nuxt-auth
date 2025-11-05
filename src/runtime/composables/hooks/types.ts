import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import type { CommonUseAuthStateReturn, GetSessionOptions, SecondarySignInOptions, SignOutOptions, SignUpOptions } from '../../types'
import type { useNuxtApp } from '#imports'
import type { FetchResponse } from 'ofetch'

export type RequestOptions = NitroFetchOptions<NitroFetchRequest>
type NuxtApp = ReturnType<typeof useNuxtApp>
type Awaitable<T> = T | Promise<T>

/**
 * The main interface defining hooks for an endpoint
 */
export interface EndpointHooks<SessionDataType, CreateRequestData, ResponseAccept> {
  createRequest(
    data: CreateRequestData,
    authState: CommonUseAuthStateReturn<SessionDataType>,
    nuxt: NuxtApp,
  ): Awaitable<CreateRequestResult | false>

  onResponse(
    response: FetchResponse<unknown>,
    authState: CommonUseAuthStateReturn<SessionDataType>,
    nuxt: NuxtApp,
  ): Awaitable<ResponseAccept | false>
}

/** Object that needs to be returned from `createRequest` in order to continue with data fetching */
export interface CreateRequestResult {
  /**
   * Path to be provided to `$fetch`.
   * It can start with `/` so that Nuxt would use function calls on server.
   */
  path: string
  /**
   * Request to be provided to `$fetch`, can include method, body, params, etc.
   * @see https://nuxt.com/docs/4.x/api/utils/dollarfetch
   */
  request: RequestOptions
}

/** Credentials accepted by `signIn` function */
export interface Credentials extends Record<string, any> {
  username?: string
  email?: string
  password?: string
}

/** Data provided to `signIn.createRequest` */
export interface SignInCreateRequestData {
  credentials: Credentials
  options?: SecondarySignInOptions
}

/**
* Object that can be returned from some `onResponse` endpoints in order to update the auth state
* and impact the next steps.
*/
export interface ResponseAccept<SessionDataType> {
  /**
   * The value of the access token to be set.
   * Omit or set to `undefined` to not modify the value.
   */
  token?: string | null

  /** Omit or set to `undefined` if you don't use it */
  refreshToken?: string | null

  /**
   * When the session is provided, method will not call `getSession` and the session will be returned.
   * Otherwise `getSession` may be called:
   * - for `signIn` and `signUp` - depending on `callGetSession`;
   * - for `refresh` - `getSession` will always be called in this case.
   */
  session?: SessionDataType
}

/** Data provided to `signIn.createRequest` */
export interface SignUpCreateRequestData {
  credentials: Credentials
  options?: SignUpOptions
}

// TODO Use full UseAuthStateReturn, not the CommonUseAuthStateReturn

export interface HooksAdapter<SessionDataType> {
  // Required endpoints
  signIn: EndpointHooks<SessionDataType, SignInCreateRequestData, ResponseAccept<SessionDataType>>
  getSession: EndpointHooks<SessionDataType, GetSessionOptions | undefined, SessionDataType | null>

  // Optional endpoints
  signOut?: EndpointHooks<SessionDataType, SignOutOptions | undefined, ResponseAccept<SessionDataType> | undefined>
  signUp?: EndpointHooks<SessionDataType, SignUpCreateRequestData, ResponseAccept<SessionDataType> | undefined>
  refresh?: EndpointHooks<SessionDataType, GetSessionOptions | undefined, ResponseAccept<SessionDataType>>
}

