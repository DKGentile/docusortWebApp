import { config as loadEnv } from 'dotenv'
import fs from 'fs'
import path from 'path'

loadEnv({ path: path.resolve(process.cwd(), '..', '.env') })
loadEnv()

export const PORT = Number(process.env.PORT ?? 3000)
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ''
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
export const CHAT_MODEL = process.env.CHAT_MODEL ?? 'gpt-4.1-mini'
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads')
export const GENERATED_DIR = path.resolve(process.cwd(), 'generated')

export function ensureDirectories() {
  ;[UPLOADS_DIR, GENERATED_DIR].forEach(directory => {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true })
    }
  })
}