import { getToken } from '#auth'

export default eventHandler(event => getToken({ event }))
