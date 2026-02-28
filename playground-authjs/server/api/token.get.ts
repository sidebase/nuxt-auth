import { eventHandler } from 'h3'
import { getServerSession } from '#auth'

export default eventHandler((event) => getServerSession(event))
