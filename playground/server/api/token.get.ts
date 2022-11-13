import { getToken } from '#auth'

export default eventHandler(async (event) => {
  const token = await getToken({ event })

  return token || 'no token present, are you logged in?'
})
