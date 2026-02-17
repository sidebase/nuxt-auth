---
title: Installation
group: Getting Started
---

# Installation

You can install NuxtAuth using nuxi:

```bash
# npm
npx nuxi module add zitadel-auth

# pnpm
pnpm exec nuxi module add zitadel-auth

# yarn
yarn dlx nuxi module add zitadel-auth
```

<details>
<summary>Manual installation</summary>

```bash
# npm
npm i -D @zitadel/nuxt-auth

# pnpm
pnpm i -D @zitadel/nuxt-auth

# yarn
yarn add -D @zitadel/nuxt-auth
```

</details>

Add NuxtAuth to your `nuxt.config`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@zitadel/nuxt-auth'],
})
```
