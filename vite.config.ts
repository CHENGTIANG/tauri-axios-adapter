import { defineConfig } from "vite";
import { resolve } from "path";
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      name: 'TauriAxiosAdapter',
      formats: ['es', 'cjs'],
      fileName: (format) => `tauri-axios-adapter.${format}.js`,
    },
    rollupOptions: {
      external: ['@tauri-apps/plugin-http', 'axios', 'axios/unsafe/core/settle.js', 'axios/unsafe/core/buildFullPath.js', 'axios/unsafe/helpers/buildURL.js', 'axios/unsafe/helpers/composeSignals.js'],
      output: {
        exports: 'named',
      },
    },
  },
  plugins: [
    dts({
      entryRoot: 'src',
      include: ['src/index.ts', 'src/axios-unsafe.d.ts'],
      exclude: ['tests/**'],
    }),
  ],
});
