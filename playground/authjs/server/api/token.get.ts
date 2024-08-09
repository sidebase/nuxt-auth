import { eventHandler } from 'h3'
import { getToken } from '#auth'

export default eventHandler(event => getToken({ event }))
