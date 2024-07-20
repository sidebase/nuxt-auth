[@sidebase/nuxt-auth](../../../../index.md) / [runtime/utils/url](../index.md) / determineCallbackUrl

# determineCallbackUrl()

```ts
function determineCallbackUrl<T>(authConfig, getOriginalTargetPath): undefined | string | T
```

Determins the desired callback url based on the users desires. Either:
- uses a hardcoded path the user provided,
- determines the callback based on the target the user wanted to reach

## Type Parameters

• **T** *extends* `string` \| `Promise`\<`string`\>

## Parameters

• **authConfig**: [`ModuleOptionsNormalized`](../../../types/interfaces/ModuleOptionsNormalized.md)

Authentication runtime module config

• **getOriginalTargetPath**

Function that returns the original location the user wanted to reach

## Returns

`undefined` \| `string` \| `T`
