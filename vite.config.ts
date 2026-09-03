import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Só precisa do prefixo /GDScribe/ no build de produção (GitHub Pages
  // serve o site num subcaminho, ver .github/workflows/deploy.yml). Em dev
  // isso fazia o Vite servir o app em /GDScribe/ em vez da raiz, deixando
  // http://localhost:5173/ em branco.
  base: command === 'build' ? '/GDScribe/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
}))
