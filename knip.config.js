module.exports = {
  ignoreDependencies: ['@semantic-release/.*?'],
  entry: ['src/module.ts', 'src/runtime/**/*.ts'],
  ignore: ['typedoc.config.mjs', 'playground-authjs/**', 'examples/**'],
}
