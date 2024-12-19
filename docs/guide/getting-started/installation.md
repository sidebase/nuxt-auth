# Installation

You can install NuxtAuth using nuxi:

::: code-group

```bash [npm]
npx nuxi module add sidebase-auth
```

```bash [pnpm]
pnpm exec nuxi module add sidebase-auth
```

```bash [yarn]
yarn dlx nuxi module add sidebase-auth
```

:::

::: details Manual installation

::: code-group

```bash [npm]
npm i -D @sidebase/nuxt-auth
```

```bash [pnpm]
pnpm i -D @sidebase/nuxt-auth
```

```bash [yarn]
yarn add -D @sidebase/nuxt-auth
```

:::

Add NuxtAuth to your `nuxt.config`:

::: code-group

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: [
    '@sidebase/nuxt-auth'],
})
```

:::
