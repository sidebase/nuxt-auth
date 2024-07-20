[@sidebase/nuxt-auth](../../../../../../index.md) / [runtime/server/services/authjs/nuxtAuthHandler](../index.md) / getToken

# getToken()

```ts
function getToken<R>(eventAndOptions): Promise<R extends true ? string : null | JWT>
```

Get the decoded JWT token either from cookies or header (both are attempted).

The only change from the original `getToken` implementation is that the `req` is not passed in, in favor of `event` being passed in. See https://next-auth.js.org/tutorials/securing-pages-and-api-routes#using-gettoken for further documentation.

## Type Parameters

• **R** *extends* `boolean` = `false`

## Parameters

• **eventAndOptions**: `Omit`\<`GetTokenParams`\<`R`\>, `"req"`\> & `object`

Omit<GetTokenParams, 'req'> & { event: H3Event } The event to get the cookie or authorization header from that contains the JWT Token and options you want to alter token getting behavior.

## Returns

`Promise`\<`R` *extends* `true` ? `string` : `null` \| `JWT`\>
