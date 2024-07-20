[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / SessionRefreshConfig

# SessionRefreshConfig

Configuration for the application-side session.

## Extends

- [`DefaultRefreshHandlerConfig`](DefaultRefreshHandlerConfig.md)

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

#### Inherited from

[`DefaultRefreshHandlerConfig`](DefaultRefreshHandlerConfig.md).[`enableOnWindowFocus`](DefaultRefreshHandlerConfig.md#enableonwindowfocus)

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

#### Inherited from

[`DefaultRefreshHandlerConfig`](DefaultRefreshHandlerConfig.md).[`enablePeriodically`](DefaultRefreshHandlerConfig.md#enableperiodically)

***

### handler?

```ts
optional handler: string;
```

A custom refresh handler to use. This can be used to implement custom session refresh logic. If not set, the default refresh handler will be used.

#### Example

```ts
'./config/MyCustomRefreshHandler'
```

#### Default

```ts
undefined
```
