export type DomainErrorCode = 'not_found' | 'invalid' | 'conflict' | 'forbidden'

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'DomainError'
  }
}
