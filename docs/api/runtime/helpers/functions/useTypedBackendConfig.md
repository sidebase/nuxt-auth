[@sidebase/nuxt-auth](../../../index.md) / [runtime/helpers](../index.md) / useTypedBackendConfig

# useTypedBackendConfig()

```ts
function useTypedBackendConfig<T>(runtimeConfig, _type): Extract<object, object> | Extract<object, object> | Extract<object, object>
```

Get the backend configuration from the runtime config in a typed manner.

## Type Parameters

• **T** *extends* [`SupportedAuthProviders`](../../types/type-aliases/SupportedAuthProviders.md)

## Parameters

• **runtimeConfig**: `RuntimeConfig`

The runtime config of the application

• **\_type**: `T`

## Returns

`Extract`\<`object`, `object`\> \| `Extract`\<`object`, `object`\> \| `Extract`\<`object`, `object`\>
