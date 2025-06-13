# Upgrade to 1.0.0-rc.1

> This is a pre-release. We encourage you to test it out and report all the issues you find with it.

> This release contains breaking changes for `signIn` and `signUp` functions

🎉 We're excited to share that `@sidebase/nuxt-auth` is moving towards its 1.0 release! Read the [full roadmap here](https://github.com/sidebase/nuxt-auth/issues/1028).

## Installation

::: code-group

```bash [npm]
npm i -D @sidebase/nuxt-auth@^1.0.0-rc.1
```

```bash [pnpm]
pnpm i -D @sidebase/nuxt-auth@^1.0.0-rc.1
```

```bash [yarn]
yarn add --dev @sidebase/nuxt-auth@^1.0.0-rc.1
```

:::

## :warning: Breaking changes

### `signUp` function in `local` provider
There's a breaking change in `local` provider `signUp` function which now only accepts 2 parameters. This is due to `signUp` having an [extra parameter](https://github.com/sidebase/nuxt-auth/blob/4b3a5904c9e0d3bce6a6334bf4a463d4835d4a48/src/runtime/composables/local/useAuth.ts#L170) from its initial implementation.

If you used `signUp` with three parameters, merge the third parameter into the second:
```ts diff
await signUp(credentials, { external: true }, { preventLoginFlow: true }) // [!code --]
await signUp(credentials, { external: true, preventLoginFlow: true }) // [!code ++]

await signUp(credentials, undefined, { preventLoginFlow: true }) // [!code --]
await signUp(credentials, { preventLoginFlow: true }) // [!code ++]
```

### `signIn` function in `authjs` provider
This function now [always](https://github.com/sidebase/nuxt-auth/blob/07199b1ccf74577890cab224c2782c7f88a9a9b6/src/runtime/composables/authjs/useAuth.ts#L90) returns an object [`SignInResult`](https://github.com/sidebase/nuxt-auth/blob/07199b1ccf74577890cab224c2782c7f88a9a9b6/src/runtime/composables/authjs/useAuth.ts#L29-L34):

```ts
interface SignInResult {
  error: string | null
  status: number
  ok: boolean
  url: any
}
```

This was done to remove the previously missing `| void` from the signature, improving type-safety and usability. If you checked for `void` being returned, adjust your usage accordingly:

```ts diff
const signInResponse = await signIn(/* ... */)

const isResponseDefined = signInResponse // [!code --]
const isResponseDefined = signInResponse.error === null // [!code ++]

if (isResponseDefined) {
  // ...
}
```

## Changelog

* feat: return signin response if no redirection by @despatates in https://github.com/sidebase/nuxt-auth/pull/977
* Enh(#843): Allow signup flow return data when preventLoginFlow is true by @iamKiNG-Fr in https://github.com/sidebase/nuxt-auth/pull/903
* chore: display register error message by @DevDengChao in https://github.com/sidebase/nuxt-auth/pull/1015
* bump dependencies by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/1016
* chore: refactor useAuth composables to encapsulate context by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/1024

**Full Changelog**: https://github.com/sidebase/nuxt-auth/compare/0.10.1...v1.0.0-rc.1
