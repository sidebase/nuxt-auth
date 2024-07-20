[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / CommonUseAuthStateReturn

# CommonUseAuthStateReturn\<SessionData\>

## Type Parameters

• **SessionData**

## Properties

### \_internal

```ts
_internal: object;
```

#### baseURL

```ts
baseURL: string;
```

#### pathname

```ts
pathname: string;
```

***

### data

```ts
data: WrappedSessionData<SessionData>;
```

***

### lastRefreshedAt

```ts
lastRefreshedAt: Ref<SessionLastRefreshedAt>;
```

***

### loading

```ts
loading: Ref<boolean>;
```

***

### status

```ts
status: ComputedRef<SessionStatus>;
```
