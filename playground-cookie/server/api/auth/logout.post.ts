export default eventHandler((event) => {
  deleteCookie(event, 'ApplicationAuth')
  return { status: 'OK' }
})
