import { eventHandler } from 'h3'

export default eventHandler(() => ({ status: 'authenticated', text: 'you only see me if you are logged in, as a server-middleware protects me' }))
