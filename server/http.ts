import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { DomainError, type DomainErrorCode } from './domain/errors'

const STATUS: Record<DomainErrorCode, number> = { not_found: 404, invalid: 400, conflict: 409 }

export type ApiError = { error: { code: DomainErrorCode; message: string } }

/** Route Handler の共通エラーハンドリング。ドメイン例外と入力検証エラーを HTTP ステータスに写す */
export async function handle(run: () => Promise<Response>) {
  try {
    return await run()
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json<ApiError>(
        { error: { code: error.code, message: error.message } },
        { status: STATUS[error.code] },
      )
    }
    if (error instanceof ZodError) {
      return NextResponse.json<ApiError>(
        {
          error: { code: 'invalid', message: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
        },
        { status: 400 },
      )
    }
    throw error
  }
}

export async function readJson(request: Request) {
  try {
    return await request.json()
  } catch {
    throw new DomainError('invalid', 'request body must be JSON')
  }
}
