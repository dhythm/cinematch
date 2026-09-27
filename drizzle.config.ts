import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'drizzle-kit'
import { MIGRATIONS_FOLDER, PGLITE_SERVER_URL } from './server/db/config'

// Next.js と同じ優先順位で .env* を読む（.env.local の DATABASE_URL など）
loadEnvConfig(process.cwd())

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: MIGRATIONS_FOLDER,
  casing: 'snake_case',
  // 未設定時は PGlite サーバー（pnpm db:pglite / dev:pglite）に接続する
  dbCredentials: { url: process.env.DATABASE_URL || PGLITE_SERVER_URL },
})
