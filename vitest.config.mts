import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          environment: 'node',
          // PGlite（WASM）の初回起動 + マイグレーションに数秒かかる。CPU が混んだ環境でも落ちないよう余裕を持たせる
          testTimeout: 15_000,
          hookTimeout: 30_000,
          include: ['server/**/*.test.ts', 'lib/**/*.test.ts', 'app/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['components/**/*.test.tsx', 'lib/**/*.test.tsx'],
        },
      },
    ],
  },
})
