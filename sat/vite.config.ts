import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/sat/', // <--- ESTA LÍNEA ES CRITICA PARA QUE FUNCIONE EN TU SUBDOMINIO
})
