[@sidebase/nuxt-auth](../../../index.md) / [runtime/helpers](../index.md) / jsonPointerGet

# jsonPointerGet()

```ts
function jsonPointerGet<TResult>(obj, pointer): TResult
```

Get a property from an object following the JSON Pointer spec.

RFC / Standard: https://www.rfc-editor.org/rfc/rfc6901

Implementation adapted from https://github.com/manuelstofer/json-pointer/blob/931b0f9c7178ca09778087b4b0ac7e4f505620c2/index.js#L48-L59

## Type Parameters

• **TResult** = `string` \| `Record`\<`string`, `any`\>

## Parameters

• **obj**: `Record`\<`string`, `any`\>

• **pointer**: `string`

## Returns

`TResult`
