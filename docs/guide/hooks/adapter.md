# Hooks adapter

The hooks adapter gives you total control over how different authentication functions make requests, handle responses and errors.

## In short

* `createRequest` builds and returns `{ path, request }`. When `false` was returned, function execution fully stops.

* The module calls `_fetchRaw(nuxt, path, request)`.

* If an error occurs and `onError` hook was defined, the module calls it with the `Error` and request data used. In most of the functions execution will stop on error regardless if `onError` was called.

* `onResponse` determines what the module should do next:
  * `false` — the function will stop its execution.
    * This is useful when the hook itself handled redirects, cookies or state changes.
  * `undefined` — default behaviour, the function will continue execution, handle callbacks, `getSession` calls, etc.
    * Also useful if the hook handled state/redirects/cookies.
  * `{ token?, refreshToken?, session? }` — module will set provided tokens/session in `authState` and the function will continue execution.

## In detail

A hooks provider expects the following adapter implementation for the auth endpoints:

```ts
export interface HooksAdapter {
  signIn: EndpointHooks
  getSession: EndpointHooks
  signOut?: EndpointHooks
  signUp?: EndpointHooks
  refresh?: EndpointHooks
}
```

Each `EndpointHooks` has three functions: `createRequest` and `onResponse` (required), and `onError` (optional).

## `createRequest(data, authState, nuxt)`

Prepare data for the fetch call.

Must return either an object conforming to:

```ts
interface CreateRequestResult {
  // Path to the endpoint
  path: string
  // Request: body, headers, etc.
  request: NitroFetchOptions
}
```

or `false` to stop execution (no network call will be performed).

### `authState` argument

This argument gives you access to the state of the module, allowing to read or modify session data or tokens.

### `nuxt` argument

This argument is provided for your convenience and to allow using Nuxt context for invoking other composables. See the [Nuxt documentation](https://nuxt.com/docs/4.x/api/composables/use-nuxt-app) for more information.

## `onResponse(response, authState, nuxt)`

Handle the response and optionally instruct the module how to update state.

May return:
* `false` — stop further processing (module will not update auth state).
* `undefined` — proceed with default behaviour (e.g., the `signIn` flow will call `getSession` unless `signIn()` options say otherwise).
* `ResponseAccept` object — instruct the module what to set in `authState` (see below).
* Throw an `Error` to propagate a failure.

The `response` argument is the [`ofetch` raw response](https://github.com/unjs/ofetch?tab=readme-ov-file#-access-to-raw-response) that the module uses as well. `response._data` usually contains parsed body.

### `ResponseAccept` shape (what `onResponse` can return)

When `onResponse` returns an object (the `ResponseAccept`), it should conform to:

```ts
interface ResponseAccept<SessionDataType> {
  token?: string | null // set or clear the access token in authState
  refreshToken?: string | null // set or clear the refresh token in authState (if refresh is enabled)
  session?: SessionDataType // set or clear the session object (when provided, `getSession` will NOT be called)
}
```

NuxtAuth will update `authState` accordingly, so you will be able to use the tokens in the later calls.
The tokens you return will be internally stored inside cookies and you can configure their Max-Age via module configuration.

When `token` is provided (not omitted and not `undefined`) the module will set `authState.token` (or clear it when `null`).
Same applies for `refreshToken` when refresh was enabled.

When `session` is provided the module will use that session directly and will **not** call `getSession`.

When the `onResponse` hook returns `undefined`, the module may call `getSession` (depending on the flow) to obtain the session.

### How different hooks handle return of `onResponse`

* **All hooks**
  * `false` - stops the function execution, does not update anything or trigger any other logic.
  * `throw Error` - executes `onError` hook if it was defined and then does function-specific logic (normally stops execution). Note that `onError` hook itself may throw an error if you want to propagate it to the calling place.
  * `ResponseAccept<SessionDataType>` - see block above.

* **signIn**
  * `throw Error` - stops the execution after calling `onError` hook if it was defined. We recommend you not throwing from `onError` hook of `signIn` as this function is also used inside middleware.

* **getSession**
  * `throw Error` - does not stop the execution after calling `onError` hook if it was defined.
    * We recommend you not throwing from `onError` hook of `getSession` as this function is also used inside middleware.
    * When no `onError` hook was defined, the authentication state will be cleared (`data`, `rawToken`, `rawRefreshToken` set to `null`).
    * The function will then continue its normal execution, potentially navigating the user away when `required` option was used during `getSession` function call.

* **signOut**
  * `throw Error` - stops the execution after calling `onError` hook if it was defined.
  * `undefined` - the authentication state will be cleared (`data`, `rawToken`, `rawRefreshToken` set to `null`).

* **signUp**
  * `throw Error` - stops the execution after calling `onError` hook if it was defined. When no `onError` was defined, the error will be propagated to the caller.
  * `undefined` - this will trigger `signIn` flow unless `preventLoginFlow` was given.

* **refresh**
  * `throw Error` - stops the execution after calling `onError` hook if it was defined. When no `onError` was defined, the error will be propagated to the caller.
  * `undefined` - this will trigger `getSession` call.

## `onError(errorCtx, authState, nuxt)`

### `errorCtx` argument

This is an `ErrorContext` object with:
* `error: Error` — the error which was thrown during request execution. The module guarantees the type and will return `new Error('Unknown error')` when the thrown value was not an instance of `Error`.
* `requestData: CreateRequestResult` — this is the exact object which was provided by the `createRequest` hook.
