# Hooks adapter

The hooks adapter gives you total control over how different authentication functions make requests, handle responses and errors.

## In short

A hooks provider expects the following adapter implementation for auth endpoints (simplified):

```ts
export interface HooksAdapter {
  // Required
  signIn: EndpointHooks
  getSession: EndpointHooks

  // Optional
  signOut?: EndpointHooks
  signUp?: EndpointHooks
  refresh?: EndpointHooks
}
```

Each `EndpointHooks` has three functions: [`createRequest`](#createrequest-data-authstate-nuxtapp) and [`onResponse`](#onresponse-response-authstate-nuxtapp-extractx) (required), and [`onRequestError`](#onrequesterror-errorctx-authstate-nuxtapp) (optional). Simplified:

```ts
interface EndpointHooks {
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
```

The execution goes as follows:

1. `createRequest` builds and returns `{ path, request }`. When `false` was returned, function execution fully stops.

2. The module calls `_fetchRaw(nuxtApp, path, request)`.

3. If an error occurs and `onRequestError` hook was defined, the module calls it with the `Error` and request data used. In most of the functions execution will stop on error regardless if `onRequestError` was called.

4. `onResponse` determines what the module should do next:
    - `false` — the function will stop its execution.
      - This is useful when the hook itself handled redirects, cookies or state changes.
    - `{ token?, refreshToken?, session? }` — module will set provided tokens/session in `authState` and the function will continue execution.
    - `undefined` — [special behaviour](#undefined) for some hook types.

## `createRequest(data, authState, nuxtApp)`

Prepare data for the fetch call.

### `data`

The `data` argument depends on the hook type (e.g. `signIn`) and mirrors the input parameters for the corresponding `useAuth` function.

### `authState`

This argument gives you access to the state of the module, allowing to read or modify session data or tokens. It is the return value of [`useAuthState`](../application-side/session-access.md#useauthstate-composable).

### `nuxtApp`

This argument is provided for your convenience and to allow using Nuxt context for invoking other composables. See the [Nuxt documentation](https://nuxt.com/docs/4.x/api/composables/use-nuxt-app) for more information.

### Return value

#### `false`

Returning `false` will stop the function execution and no network call will be performed.

#### `CreateRequestResult`

This instructs the module how to make a request.

```ts
interface CreateRequestResult {
  // Path to the endpoint
  path: string
  // Request: body, headers, etc.
  request: NitroFetchOptions
}
```

### Errors

Any values thrown from `onRequestError` always get propagated to the caller.

> [!CAUTION]
> We strongly recommend you to **not** throw from any hooks of `signIn` and `getSession` as these functions are also used inside middleware.

## `onResponse(response, authState, nuxtApp, extraCtx)`

Handle the response and optionally instruct the module how to update state.

### `response`

The `response` argument is the [`ofetch` raw response](https://github.com/unjs/ofetch?tab=readme-ov-file#-access-to-raw-response) that the module uses as well. `response._data` usually contains parsed body.

### `authState`

Same as [`authState`](#authstate) for `createRequest`.

### `nuxtApp`

Same as [`nuxtApp`](#nuxtapp) for `createRequest`.

### `extraCtx`

The `extraCtx` argument provides the `onResponse` and `onRequestError` hooks with extra context, such as request (from `createRequest` hook) and called function inputs (e.g. `credentials` and `options` for `signIn`).

### Return value

#### `false`

Returning `false` from the hook stops the function execution, does not update anything or trigger any other logic.

#### `ResponseAccept`

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

#### `undefined`

The `undefined` is only returnable by `signOut`, `signUp` and `refresh` hooks and marks special behaviour:
- `signOut` - the authentication state will be cleared (`data`, `rawToken`, `rawRefreshToken` set to `null`).

- `signUp` - the `signIn` flow will be triggered unless `preventLoginFlow` was given. Note: `signIn` may transitively call `getSession` to obtain the session.

- `refresh` - the `getSession` call will be triggered.

### Errors

Any values thrown from `onResponse` always get propagated to the caller.

> [!CAUTION]
> We strongly recommend you to **not** throw from any hooks of `signIn` and `getSession` as these functions are also used inside middleware.

## `onRequestError(errorCtx, authState, nuxtApp)`

### `error`

This is an `Error` instance — the error which was thrown during request execution. The module guarantees the type and will return `new Error('Unknown error')` when the thrown value was not an instance of `Error`.

### `authState`

Same as [`authState`](#authstate) for `createRequest`.

### `nuxtApp`

Same as [`nuxtApp`](#nuxtapp) for `createRequest`.

### `extraCtx`

Same as [`extraCtx`](#extractx) for `onResponse`.

### Errors

Any values thrown from `onRequestError` always get propagated to the caller.

> [!CAUTION]
> We strongly recommend you to **not** throw from any hooks of `signIn` and `getSession` as these functions are also used inside middleware.

### Special `onRequestError` behaviour

Some hook types have special behaviour around `onRequestError` hook:

#### `getSession`

When no `onRequestError` hook was defined, the authentication state will be cleared (`data`, `rawToken`, `rawRefreshToken` set to `null`).

The function will then continue its normal execution, potentially navigating the user away when `required` option was used during `getSession` function call.

#### `signUp`

When no `onRequestError` hook was defined, the error gets propagated to the caller.

#### `refresh`

When no `onRequestError` hook was defined, the error gets propagated to the caller.
