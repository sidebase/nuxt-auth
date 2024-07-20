[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / SignInFunc

# SignInFunc()\<PrimarySignInOptions, SignInResult\>

```ts
type SignInFunc<PrimarySignInOptions, SignInResult>: (primaryOptions, signInOptions?, paramsOptions?) => Promise<SignInResult>;
```

## Type Parameters

• **PrimarySignInOptions**

• **SignInResult**

## Parameters

• **primaryOptions**: `PrimarySignInOptions`

• **signInOptions?**: [`SecondarySignInOptions`](../interfaces/SecondarySignInOptions.md)

• **paramsOptions?**: `Record`\<`string`, `string`\>

## Returns

`Promise`\<`SignInResult`\>
