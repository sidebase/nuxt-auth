# Installation

You can install NuxtAuth using nuxi:

```bash
npx nuxi@latest module add sidebase-auth
```

::: details Manual installation

::: code-group

```bash [npm]
npm i -D @sidebase/nuxt-auth
```

```bash [pnpm]
pnpm install @sidebase/nuxt-auth
```

```bash [yarn]
yarn add --dev @sidebase/nuxt-auth
```

:::

Add NuxtAuth to your `nuxt.config`:

::: code-group

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  modules: [
    '@sidebase/nuxt-auth',
  ],
})
```

:::
