[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / GetSessionOptions

# GetSessionOptions

```ts
type GetSessionOptions: Partial<object>;
```

## Type declaration

### callbackUrl?

```ts
optional callbackUrl: string;
```

### external?

```ts
optional external: boolean;
```

### force?

```ts
optional force: boolean;
```

Whether to refetch the session even if the token returned by useAuthState is null.

#### Default

```ts
false
```

### onUnauthenticated()?

```ts
optional onUnauthenticated: () => void;
```

#### Returns

`void`

### required?

```ts
optional required: boolean;
```
