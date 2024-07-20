[@sidebase/nuxt-auth](../../../../index.md) / [runtime/utils/refreshHandler](../index.md) / DefaultRefreshHandler

# DefaultRefreshHandler

## Implements

- [`RefreshHandler`](../../../types/interfaces/RefreshHandler.md)

## Constructors

### new DefaultRefreshHandler()

```ts
new DefaultRefreshHandler(config): DefaultRefreshHandler
```

#### Parameters

• **config**: [`DefaultRefreshHandlerConfig`](../../../types/interfaces/DefaultRefreshHandlerConfig.md)

#### Returns

[`DefaultRefreshHandler`](DefaultRefreshHandler.md)

## Properties

### auth?

```ts
optional auth: UseAuthReturn;
```

Result of `useAuth` composable, mostly used for session data/refreshing

***

### config

```ts
config: DefaultRefreshHandlerConfig;
```

***

### refetchIntervalTimer?

```ts
optional refetchIntervalTimer: Timeout;
```

Refetch interval

***

### refreshTokenIntervalTimer?

```ts
optional refreshTokenIntervalTimer: Timeout;
```

Refetch interval for local/refresh schema

***

### runtimeConfig?

```ts
optional runtimeConfig: ModuleOptionsNormalized;
```

Runtime config is mostly used for getting provider data

## Methods

### destroy()

```ts
destroy(): void
```

Handles cleanup of the refresh handler. Will be called on `unmount` app hook.

#### Returns

`void`

#### Implementation of

[`RefreshHandler`](../../../types/interfaces/RefreshHandler.md).[`destroy`](../../../types/interfaces/RefreshHandler.md#destroy)

***

### init()

```ts
init(): void
```

Initializes the refresh handler.
Will be called inside `app:mounted` lifecycle hook.

#### Returns

`void`

#### Implementation of

[`RefreshHandler`](../../../types/interfaces/RefreshHandler.md).[`init`](../../../types/interfaces/RefreshHandler.md#init)

***

### visibilityHandler()

```ts
visibilityHandler(): void
```

#### Returns

`void`
