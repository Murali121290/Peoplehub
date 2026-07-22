import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env file from the parent directory
  const env = loadEnv(mode, '../', '')
  const port = parseInt(env.FRONTEND_PORT || '5555', 10)

  return {
    plugins: [react()],
    envDir: '../',
    server: {
      host: true,
      port: port
    }
  }
})