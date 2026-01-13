import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ↓ここを現在のリポジトリ名に合わせるのがポイントです
  base: "/gantt-pro-app/", 
})