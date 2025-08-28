# Resources

The following resources should help with using NuxtAuth and tackle some topics that are frequently encountered during app-development. We will continue to expand this with more guides, recipes and references based on the questions, feedback and problems we see and receive from our community: https://discord.gg/VzABbVsqAc

## Glossary

There are some terms we use in this documentation that may not be known to every reader. Here is an explanation for some of them:

- `application` / `application-side` / `universal-application`: This references all Nuxt code of your app that is [universally rendered](https://nuxt.com/docs/guide/concepts/rendering#universal-rendering). In short this means that that code is rendered on the server-side and on the client-side, so all JS in it is executed twice. This is an important distinction, as some things may behave different on the server-side than on the client-side. We use `application...` to denote something that will be universally rendered
- `server` / `server-side`: This references all Nuxt code of your app that will run only on your server. For example, all code inside the `~/server directory` should only ever run on the server
- `authentication`: Verifying that someone is who they claims to be, e.g., by asking them for a username and password or by asking Google to verify it (OAuth) and then trust their result
- `provider`: Could mean two things in the context of NuxAuth:
  - The authentication provider you select on the NuxtAuth module level by setting the `provider.type` key to either `local`, `refresh` or `authjs`
  - The OAuth authentication provider you choose to use in combination with the `authjs` module

## Module Concept

The idea of this library is to re-use all the open-source implementation that already exist in the JS ecosystem instead of rolling our own. The idea was born when researching through the ecosystem of framework-specific authentication libraries to figure out what the best implementation approach for a state-of-the-art Nuxt 4 authentication library would be.

During research it became clear that implementing everything from scratch will be:
- a lot of work that has already been open-sourced by others,
- error prone as authentication has a lot of intricacies that need to be resolved in order to get it right,
- hard to maintain as authentication providers come and go,
- hard to build initial trust for as authentication is important and cannot go wrong,

In order to avoid these problems without taking forever (leaving Nuxt without an authentication library in the meantime), we decided to investigate if we can wrap [NextAuth.js](https://github.com/nextauthjs/next-auth), the most popular authentication library in the Next.js ecosystem by far and a trusted, well maintained one at that!

In our investigation we found prior attempts to make NextAuth.js framework agnostic. These have more or less come to fruition, so far mostly resulting in some PoCs and example apps. Looking at these was quite helpful to get started. In particular, big pushes in the right direction came from:

- [NextAuth.js app examples](https://github.com/nextauthjs/next-auth/tree/main/apps)
- [Various comments, proposals, ...or this thread](https://github.com/nextauthjs/next-auth/discussions/3942), special thanks to [brillout](https://github.com/brillout) for starting the discussion, [balazsorban44](https://github.com/balazsorban44) for NextAuth.js and encouraging the discussion, [wobsoriano](https://github.com/wobsoriano) for adding PoCs for multiple languages

The main part of the work was to piece everything together, resolve some outstanding issues with existing PoCs, add new things where nothing existed yet, e.g., for the `useAuth` composable by going through the NextAuth.js client code and translating it to a Nuxt 4 approach.

The module had another big iteration in collaboration with [JoaoPedroAS51](https://github.com/JoaoPedroAS51) to make `useAuth` a sync operation and trigger the session lifecycle from a plugin rather than the `useAuth` composable itself.
