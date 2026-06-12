export class ApiError extends Error {
  statusCode: number
  code: string
  details?: object

  constructor(statusCode: number, code: string, message: string, details?: object) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  static badRequest(message: string, details?: object) {
    return new ApiError(400, 'BAD_REQUEST', message, details)
  }
  static unauthorized(message = 'Haujaidhinishwa') {
    return new ApiError(401, 'UNAUTHORIZED', message)
  }
  static forbidden(message = 'Huna ruhusa ya kufanya hivi') {
    return new ApiError(403, 'FORBIDDEN', message)
  }
  static notFound(message = 'Haikupatikana') {
    return new ApiError(404, 'NOT_FOUND', message)
  }
  static conflict(message: string) {
    return new ApiError(409, 'CONFLICT', message)
  }
  static internal(message = 'Hitilafu ya mfumo') {
    return new ApiError(500, 'INTERNAL_ERROR', message)
  }
}
