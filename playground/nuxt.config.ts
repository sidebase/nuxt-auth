import { defineNuxtConfig } from 'nuxt/config'
import CredentialsProvider from 'next-auth/providers/credentials'
import NuxtAuth from '..'

export default defineNuxtConfig({
  modules: [
    NuxtAuth
  ],
  auth: {
    nextAuth: {
      options: {
        providers: [
          CredentialsProvider({
            // The name to display on the sign in form (e.g. 'Sign in with...')
            name: 'Credentials',
            // The credentials is used to generate a suitable form on the sign in page.
            // You can specify whatever fields you are expecting to be submitted.
            // e.g. domain, username, password, 2FA token, etc.
            // You can pass any HTML attribute to the <input> tag through the object.
            credentials: {
              username: { label: 'Username', type: 'text', placeholder: 'jsmith' },
              password: { label: 'Password', type: 'password' }
            },
            authorize (credentials) {
              // You need to provide your own logic here that takes the credentials
              // submitted and returns either a object representing a user or value
              // that is false/null if the credentials are invalid.
              // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
              // You can also use the `req` object to obtain additional parameters
              // (i.e., the request IP address)
              // eslint-disable-next-line no-console
              console.log('provided credentials: ', credentials)
              const user = { id: '1', name: 'J Smith', email: 'jsmith@example.com' }

              if (user) {
                // Any object returned will be saved in `user` property of the JWT
                return user
              } else {
                // If you return null then an error will be displayed advising the user to check their details.
                return null

                // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
              }
            }
          })
        ]
      }
    }
  }
})
