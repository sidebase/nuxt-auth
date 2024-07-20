[@sidebase/nuxt-auth](../../../index.md) / [runtime/types](../index.md) / SignUpOptions

# SignUpOptions

## Extends

- [`SecondarySignInOptions`](SecondarySignInOptions.md)

## Properties

### callbackUrl?

```ts
optional callbackUrl: string;
```

Specify to which URL the user will be redirected after signing in. Defaults to the page URL the sign-in is initiated from.

#### Default

```ts
undefined Inferred from the current route
```

#### Inherited from

[`SecondarySignInOptions`](SecondarySignInOptions.md).[`callbackUrl`](SecondarySignInOptions.md#callbackurl)

***

### external?

```ts
optional external: boolean;
```

Is this callback URL an external one. Setting this to true, allows you to redirect to external urls, however a hard refresh will be done.

#### Default

```ts
false
```

#### Inherited from

[`SecondarySignInOptions`](SecondarySignInOptions.md).[`external`](SecondarySignInOptions.md#external)

***

### preventLoginFlow?

```ts
optional preventLoginFlow: boolean;
```

Prevent the signIn flow during registration

#### Default

```ts
false
```

***

### redirect?

```ts
optional redirect: boolean;
```

Whether to redirect users after the method succeeded.

#### Default

```ts
true
```

#### Inherited from

[`SecondarySignInOptions`](SecondarySignInOptions.md).[`redirect`](SecondarySignInOptions.md#redirect)
