import type { BackendSession } from './backend-session'

declare module '#auth' {
  interface SessionData extends BackendSession {}
}

// Uncomment when your .d.ts has no other import/export statements:
// export {}
