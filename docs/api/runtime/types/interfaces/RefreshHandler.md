[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / RefreshHandler

# RefreshHandler

## Methods

### destroy()

```ts
destroy(): void
```

Handles cleanup of the refresh handler. Will be called on `unmount` app hook.

#### Returns

`void`

***

### init()

```ts
init(): void
```

Initializes the refresh handler.
Will be called inside `app:mounted` lifecycle hook.

#### Returns

`void`
