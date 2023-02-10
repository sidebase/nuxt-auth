import { getServerSession } from '#auth'

export default eventHandler(event => getServerSession(event))
