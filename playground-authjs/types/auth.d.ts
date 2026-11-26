import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & { username?: string }
  }

  interface User {
    username?: string
  }

  interface Account {
    tenantId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string
  }
}

// Uncomment when your .d.ts has no other import/export statements:
// export {}
