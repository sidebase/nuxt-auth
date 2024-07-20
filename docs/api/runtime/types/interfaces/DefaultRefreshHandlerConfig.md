[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / DefaultRefreshHandlerConfig

# DefaultRefreshHandlerConfig

## Extended by

- [`SessionRefreshConfig`](SessionRefreshConfig.md)

## Properties

### enableOnWindowFocus?

```ts
optional enableOnWindowFocus: boolean;
```

Whether to refresh the session every time the browser window is refocused.

#### Example

```ts
false
```

#### Default

```ts
true
```

***

### enablePeriodically?

```ts
optional enablePeriodically: number | boolean;
```

Whether to refresh the session every `X` milliseconds. Set this to `false` to turn it off. The session will only be refreshed if a session already exists.

Setting this to `true` will refresh the session every second.
Setting this to `false` will turn off session refresh.
Setting this to a number `X` will refresh the session every `X` milliseconds.

#### Example

```ts
1000
```

#### Default

```ts
false
```
