import type { ApiError } from '@/server/http'

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

type Options = Omit<RequestInit, 'body'> & { json?: unknown }

export async function apiFetch<T>(path: string, { json, headers, ...init }: Options = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: json === undefined ? headers : { 'content-type': 'application/json', ...headers },
    body: json === undefined ? undefined : JSON.stringify(json),
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as ApiError | undefined
    throw new ApiRequestError(response.status, body?.error.code, body?.error.message ?? response.statusText)
  }
  return (await response.json()) as T
}
