[@sidebase/nuxt-auth](../../../index.md) / [runtime/helpers](../index.md) / objectFromJsonPointer

# objectFromJsonPointer()

```ts
function objectFromJsonPointer(pointer, value): Record<string, any>
```

Creates an object from a value and a pointer.
This is equivalent to calling `jsonPointerSet` on an empty object.

## Parameters

• **pointer**: `string` \| `string`[]

• **value**: `any`

## Returns

`Record`\<`string`, `any`\>

An object with a value set at an arbitrary pointer.

## Example

```ts
objectFromJsonPointer('/refresh', 'someToken') // { refresh: 'someToken' }
```
