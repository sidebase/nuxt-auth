import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  secret: process.env.AUTH_SECRET ?? 'test-secret',
  providers: [
    {
      id: 'mock-oidc',
      name: 'Mock OIDC',
      type: 'oidc',
      issuer: process.env.OAUTH_ISSUER_URL,
      clientId: process.env.OAUTH_CLIENT_ID ?? 'test-client',
      clientSecret: process.env.OAUTH_CLIENT_SECRET ?? 'test-secret',
    },
  ],
})
