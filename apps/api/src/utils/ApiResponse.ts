export class ApiResponse<T> {
  success: boolean
  data: T | null
  message: string
  meta?: object

  constructor(data: T | null, message = 'Success', meta?: object) {
    this.success = true
    this.data = data
    this.message = message
    if (meta) this.meta = meta
  }
}
