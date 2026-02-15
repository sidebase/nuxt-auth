module.exports = {
  ignoreDependencies: ['@semantic-release/.*?'],
  entry: ['src/module.ts', 'src/runtime/**/*.ts'],
  ignore: ['typedoc.config.mjs', 'knip.config.js', 'playground-authjs/**'],
  rules: { duplicates: 'off' },
}
