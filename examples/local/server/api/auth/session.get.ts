export default eventHandler(() => {
  throw createError({ statusCode: 403 })
})
