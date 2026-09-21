export interface PageMeta { page: number; limit: number; total: number }

/** Kembalikan dari controller untuk mengatur message/meta; nilai biasa otomatis dibungkus. */
export class ApiResult<T = unknown> {
  constructor(public readonly data: T, public readonly message = 'Berhasil', public readonly meta?: PageMeta) {}
}
