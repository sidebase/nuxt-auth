[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / CommonUseAuthReturn

# CommonUseAuthReturn\<SignIn, SignOut, GetSession, SessionData\>

## Type Parameters

• **SignIn**

• **SignOut**

• **GetSession**

• **SessionData**

## Properties

### data

```ts
data: Readonly<WrappedSessionData<SessionData>>;
```

***

### getSession

```ts
getSession: GetSession;
```

***

### lastRefreshedAt

```ts
lastRefreshedAt: Readonly<Ref<SessionLastRefreshedAt>>;
```

***

### signIn

```ts
signIn: SignIn;
```

***

### signOut

```ts
signOut: SignOut;
```

***

### status

```ts
status: ComputedRef<SessionStatus>;
```

## Methods

### refresh()

```ts
refresh(): Promise<unknown>
```

#### Returns

`Promise`\<`unknown`\>
