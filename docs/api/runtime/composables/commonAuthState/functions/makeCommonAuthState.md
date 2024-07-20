[@sidebase/nuxt-auth](../../../../index.md) / [runtime/composables/commonAuthState](../index.md) / makeCommonAuthState

# makeCommonAuthState()

```ts
function makeCommonAuthState<SessionData>(): object
```

## Type Parameters

• **SessionData**

## Returns

`object`

### \_internal

```ts
_internal: object;
```

### \_internal.baseURL

```ts
baseURL: string;
```

### \_internal.pathname

```ts
pathname: string;
```

### data

```ts
data: Ref<undefined | null | SessionData>;
```

### lastRefreshedAt

```ts
lastRefreshedAt: Ref<SessionLastRefreshedAt>;
```

### loading

```ts
loading: Ref<boolean>;
```

### status

```ts
status: ComputedRef<SessionStatus>;
```
