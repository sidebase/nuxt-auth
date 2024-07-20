[@sidebase/nuxt-auth](../../../../../index.md) / [runtime/server/services/utils](../index.md) / getServerOrigin

# getServerOrigin()

```ts
function getServerOrigin(event?): string
```

Get `origin` and fallback to `x-forwarded-host` or `host` headers if not in production.

## Parameters

• **event?**: `H3Event`\<`EventHandlerRequest`\>

## Returns

`string`
