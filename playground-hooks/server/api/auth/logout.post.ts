import { eventHandler } from 'h3'

// We are not actually clearing any state here since this is a demo endpoint.
// Remember to handle the user signout properly in real applications.
export default eventHandler(() => ({ status: 'OK' }))
