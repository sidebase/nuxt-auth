[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / RouteOptions

# RouteOptions

## Properties

### disableServerSideAuth

```ts
disableServerSideAuth: boolean;
```

Forces your server to send a "loading" status on a route, prompting the client to fetch on the client. If a specific page has caching, this prevents the server from caching someone's authentication status.

#### Default

```ts
false
```
