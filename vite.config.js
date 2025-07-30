import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration
// This configures the React plugin and specifies the output directory.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});