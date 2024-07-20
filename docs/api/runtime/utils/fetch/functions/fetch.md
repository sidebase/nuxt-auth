[@sidebase/nuxt-auth](../../../../index.md) / [runtime/utils/fetch](../index.md) / \_fetch

# \_fetch()

```ts
function _fetch<T>(
   nuxt, 
   path, 
fetchOptions?): Promise<T>
```

## Type Parameters

• **T**

## Parameters

• **nuxt**: `NuxtApp`

• **path**: `string`

• **fetchOptions?**: `NitroFetchOptions`\<`NitroFetchRequest`, 
  \| `"get"`
  \| `"head"`
  \| `"patch"`
  \| `"post"`
  \| `"put"`
  \| `"delete"`
  \| `"connect"`
  \| `"options"`
  \| `"trace"`\>

## Returns

`Promise`\<`T`\>
