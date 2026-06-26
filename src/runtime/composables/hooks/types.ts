import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import type { FetchResponse } from 'ofetch'
import type { ComputedRef } from 'vue'
import type { CommonUseAuthStateReturn, GetSessionOptions, SecondarySignInOptions, SignOutOptions, SignUpOptions } from '../../types'
import type { CookieRef } from '#app'
import type { useNuxtApp } from '#imports'

export type RequestOptions = NitroFetchOptions<NitroFetchRequest>
type NuxtApp = ReturnType<typeof useNuxtApp>
type Awaitable<T> = T | Promise<T>

/**
 * The internal response of the local-specific auth data
 *
 * @remarks
 * The returned value `refreshToken` and `rawRefreshToken` will always be `null` if `refresh.isEnabled` is `false`
 */
export interface UseAuthStateReturn<SessionData> extends CommonUseAuthStateReturn<SessionData> {
  token: ComputedRef<string | null>
  rawToken: CookieRef<string | null>
  refreshToken: ComputedRef<string | null>
  rawRefreshToken: CookieRef<string | null>
  setToken: (newToken: string | null) => void
  clearToken: () => void
  _internal: {
    rawTokenCookie: CookieRef<string | null>
  }
}

/**
 * The main interface defining hooks for an endpoint
 */
export interface EndpointHooks<SessionDataType, CreateRequestData, ResponseAcceptType, ExtraContextType extends BaseExtraContext> {
  createRequest: (
    data: CreateRequestData,
    authState: UseAuthStateReturn<SessionDataType>,
    nuxtApp: NuxtApp,
  ) => Awaitable<CreateRequestResult | false>

  onResponse: (
    response: FetchResponse<unknown>,
    authState: UseAuthStateReturn<SessionDataType>,
    nuxtApp: NuxtApp,
    extraCtx: ExtraContextType,
  ) => Awaitable<ResponseAcceptType | false>

  onRequestError?: (
    error: Error,
    authState: UseAuthStateReturn<SessionDataType>,
    nuxtApp: NuxtApp,
    extraCtx: ExtraContextType,
  ) => Awaitable<void>
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

/** Base extra context for response and error only requires request */
export interface BaseExtraContext {
  request: CreateRequestResult
}

/** Data provided to `signIn.createRequest` */
export interface SignInCreateRequestData {
  credentials: Credentials
  options: SecondarySignInOptions | undefined
}

/** Extra context for `signIn.onResponse` and `signIn.onRequestError` */
export interface SignInExtraContext extends BaseExtraContext, SignInCreateRequestData {}

/** Extra context for `getSession.onResponse` and `getSession.onRequestError` */
export interface GetSessionExtraContext extends BaseExtraContext {
  options: GetSessionOptions | undefined
}

/** Extra context for `signOut.onResponse` and `signOut.onRequestError` */
export interface SignOutExtraContext extends BaseExtraContext {
  options: SignOutOptions | undefined
}

/** Data provided to `signIn.createRequest` */
export interface SignUpCreateRequestData {
  credentials: Credentials
  options: SignUpOptions | undefined
}

/** Extra context for `signUp.onResponse` and `signUp.onRequestError` */
export interface SignUpExtraContext extends BaseExtraContext, SignUpCreateRequestData {}

/** Extra context for `refresh.onResponse` and `refresh.onRequestError` */
export interface RefreshExtraContext extends BaseExtraContext {
  options: GetSessionOptions | undefined
}

export interface HooksAdapter<SessionDataType> {
  // Required endpoints
  signIn: EndpointHooks<SessionDataType, SignInCreateRequestData, ResponseAccept<SessionDataType>, SignInExtraContext>
  getSession: EndpointHooks<SessionDataType, GetSessionOptions | undefined, ResponseAccept<SessionDataType>, GetSessionExtraContext>

  // Optional endpoints
  signOut?: EndpointHooks<SessionDataType, SignOutOptions | undefined, ResponseAccept<SessionDataType> | undefined, SignOutExtraContext>
  signUp?: EndpointHooks<SessionDataType, SignUpCreateRequestData, ResponseAccept<SessionDataType> | undefined, SignUpExtraContext>
  refresh?: EndpointHooks<SessionDataType, GetSessionOptions | undefined, ResponseAccept<SessionDataType>, RefreshExtraContext>
}
