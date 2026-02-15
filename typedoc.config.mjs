// noinspection JSUnusedGlobalSymbols
export default {
  entryPoints: ['src/module.ts'],
  out: '.out/docs',
  highlightLanguages: [
    'typescript',
    'javascript',
    'json',
    'astro',
    'jsx',
    'bash',
    'sh',
    'html',
  ],
  cleanOutputDir: true,
  treatWarningsAsErrors: false,
  validation: {
    invalidLink: true,
    notExported: true,
    notDocumented: false,
  },
}
