[@sidebase/nuxt-auth](../../../index.md) / [runtime/helpers](../index.md) / jsonPointerSet

# jsonPointerSet()

```ts
function jsonPointerSet(
   obj, 
   pointer, 
   value): void
```

Sets a value on an object

RFC / Standard: https://www.rfc-editor.org/rfc/rfc6901

Adapted from https://github.com/manuelstofer/json-pointer/blob/931b0f9c7178ca09778087b4b0ac7e4f505620c2/index.js#L68-L103

## Parameters

• **obj**: `Record`\<`string`, `any`\>

• **pointer**: `string` \| `string`[]

• **value**: `any`

## Returns

`void`
