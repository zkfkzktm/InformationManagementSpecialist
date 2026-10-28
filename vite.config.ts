import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' : GitHub Pages 하위 경로·로컬 미리보기 모두 동작
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
