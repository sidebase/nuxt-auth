# Session data

This guide explains how to add custom data to the user session. In many cases, you may wish to adapt which information is returned by the authention flow. This can depend on your provider or any additional API calls you may make, to enricht the session. 

In the following example we will return additional data returned by a FushionAuth instance, however the same adaptations can be made with any other provider too!

## Modify the JWT Token

In order to persist data between session requests, we need to inject certain information into the JWT token, which we can then access during subsequent session requests. However, avoid injecting too much data into the JWT token, as it is limited in its size. Therefore we recommend only injecting an access or session token, that can be then used to request futhur user information inside the session callback.

```ts
import { NuxtAuthHandler } from '#auth'
import FusionAuthProvider from 'next-auth/providers/fusionauth'

export default NuxtAuthHandler({
  secret: useRuntimeConfig().authSecret,
  providers: [
    // @ts-expect-error Use .default here for it to work during SSR.
    FusionAuthProvider.default({
      issuer: useRuntimeConfig().authIssuer,
      clientId: useRuntimeConfig().authClientId,
      clientSecret: useRuntimeConfig().authClientSecret,
      tenantId: useRuntimeConfig().authTenantId
    })
  ],
  callbacks: {
    jwt({ token, account, profile }) {
        /*
         * TIP: You can console log account or profile here
         * to see which data is returned!
         */
        if (account) {
            token.accessToken = account.access_token
            token.accessTokenExpires = account.expires_at
        }
        return token
    },
  }
})
```
