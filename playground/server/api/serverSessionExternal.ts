import { getServerSessionExternal } from '#auth'

export default eventHandler(event => getServerSessionExternal(event.node.req))
