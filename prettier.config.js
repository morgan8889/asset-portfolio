/** @type {import('prettier').Config} */
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  endOfLine: 'lf',
  arrowParens: 'always',
  bracketSpacing: true,
  bracketSameLine: false,
  quoteProps: 'as-needed',
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindFunctions: ['clsx', 'cn'],
  overrides: [
    {
      files: '*.md',
      options: {
        printWidth: 120,
        proseWrap: 'preserve',
      },
    },
  ],
};