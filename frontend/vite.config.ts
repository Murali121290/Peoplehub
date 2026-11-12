import { defineConfig, loadEnv, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function versionManifestPlugin(version: string): Plugin {
  return {
    name: 'version-manifest-plugin',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({
          version,
          builtAt: new Date().toISOString(),
        }),
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load env file from the parent directory
  const env = loadEnv(mode, '../', '')
  const port = parseInt(env.FRONTEND_PORT || '5555', 10)
  const appVersion = String(Date.now())

  return {
    plugins: [react(), versionManifestPlugin(appVersion)],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
    envDir: '../',
    server: {
      host: true,
      port: port
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom', 'axios', 'framer-motion', 'socket.io-client']
          }
        }
      }
    }
  }
})