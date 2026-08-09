import { defineConfig, transformWithOxc } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 8's built-in vite:oxc excludes `.js` files (exclude: /\.js$/) and infers
// lang: "js" from the extension, which disables JSX parsing. This project keeps
// CRA-style `.js` files with JSX, so we pre-transform them with lang: "jsx".
// See https://github.com/vitejs/vite/discussions/21505
const transformJsxInJs = () => ({
  name: 'transform-jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    if (!/\.[jt]sx?$/.test(id) || id.endsWith('.jsx') || id.endsWith('.tsx')) return null
    return await transformWithOxc(code, id, {
      lang: 'jsx',
      jsx: { runtime: 'automatic' },
    })
  },
})

export default defineConfig({
  plugins: [react(), transformJsxInJs()],
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost',
      },
    },
  },
})
