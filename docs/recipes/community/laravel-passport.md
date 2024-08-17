# Laravel Passport + Provider `authjs`

<RecipeHeader author="Jericho1060" :providers="['authjs']" :tags="['laravel-passport']" />

This section gives an example of how the `NuxtAuthHandler` can be configured to use Laravel Passport Oauth2 and SSO.

You can refer to the official [Laravel documentation](https://laravel.com/docs/10.x/passport#managing-clients) to add new client to Passport.

By default, you can simply create one using the command:

```sh
php artisan passport:client
```

It will ask you to choose a
- `client ID`, and
- a `redirect URI`.

Keep the client ID for the next step and set the redirect URI to `http://localhost:3000/api/auth/callback/laravelpassport` (default value for dev environement, modify it according to your environement, you can add several URI comma separated).

## 2. Add a Laravel API route returning the user data

Next create a route that is returned to the user. In the example given here, we will use `/api/v1/me`.

The route will return the field of your user data. You **must** return a field with the key `id`.

## 3. Setting configuration and the provider

### 3.1. Storing the config in your .env

You can add the following variables to your .env:
- `PASSPORT_BASE_URL`: the URL of your passport APP
- `PASSPORT_CLIENT_ID`: the client ID you set in the previous step
- `PASSPORT_CLIENT_SECRET`: the client secret Laravel generated for you at the end of step 1

```bash
# .env
PASSPORT_BASE_URL=http://www.my_passport_app.test
PASSPORT_CLIENT_ID=123456789
PASSPORT_CLIENT_SECRET=123456789
```

### 3.2. Adding your config to the runtimeConfig

Then add these values to your runtimeConfig:

```ts
// ~/nuxt.config.ts
export default defineNuxtConfig({
  // ...
  modules: [
    // ...
    '@sidebase/nuxt-auth',
  ],
  runtimeConfig: {
    // ...
    passport: {
      baseUrl: process.env.PASSPORT_BASE_URL,
      clientId: process.env.PASSPORT_CLIENT_ID,
      clientSecret: process.env.PASSPORT_CLIENT_SECRET,
    }

  },
})
```

### 2.3. Create the catch-all `NuxtAuthHandler` and add the this custom provider:

```ts
// ~/server/api/auth/[...].ts
import { NuxtAuthHandler } from '#auth'
const { passport } = useRuntimeConfig() // get the values from the runtimeConfig

export default NuxtAuthHandler({
  // ...
  providers: [
    {
      id: 'laravelpassport', // ID is only used for the callback URL
      name: 'Passport', // name is used for the login button
      type: 'oauth', // connexion type
      version: '2.0', // oauth version
      authorization: {
        url: `${passport.baseUrl}/oauth/authorize`, // this is the route created by passport by default to get the autorization code
        params: {
          scope: '*', // this is the wildcard for all scopes in laravel passport, you can specify scopes separated by a space
        }
      },
      token: {
        url: `${passport.baseUrl}/oauth/token`, // this is the default route created by passport to get and renew the tokens
      },
      clientId: passport.clientId, // the client Id
      clientSecret: passport.clientSecret, // the client secret
      userinfo: {
        url: `${passport.baseUrl}/api/v1/me`, // this is a custom route that must return the current user that must be created in laravel
      },
      profile: (profile) => {
        // map the session fields with you laravel fields
        // profile is the user coming from the laravel app
        // update the return with your own fields names
        return {
          id: profile.id,
          name: profile.username,
          email: profile.email,
          image: profile.image,
        }
      },
      idToken: false,
    }
  ],
})
```

:::tip Learn more
You can find the full discussion in the issue [#149](https://github.com/sidebase/nuxt-auth/v0.6/issues/149). Solution provided by [@Jericho1060](https://github.com/Jericho1060)
:::
